const { setCors } = require('./_cors');
const { isAdminAuthorized } = require('./_adminAuth');
const { fbGet } = require('./_firebase');
const crypto = require('crypto');

const TICKET_LINK_SECRET = process.env.TICKET_LINK_SECRET || '';
const TICKET_PUBLIC_ORIGIN = process.env.TICKET_PUBLIC_ORIGIN || 'https://vk-tickets.vercel.app';
const BLOCKED_STATUSES = new Set(['cancelled', 'refunded', 'returned', 'deleted']);

function b64urlEncode(input) {
  return Buffer.from(input).toString('base64url');
}

function signPayload(payloadB64) {
  if (!TICKET_LINK_SECRET) throw new Error('TICKET_LINK_SECRET is not configured');
  return crypto.createHmac('sha256', TICKET_LINK_SECRET).update(payloadB64).digest('base64url');
}

function makeHuliganTicketToken(bookingId, version, ttlHours = 24 * 45) {
  const exp = Date.now() + ttlHours * 60 * 60 * 1000;
  const payload = {
    bid: String(bookingId),
    v: Number(version) || 1,
    exp,
    show: 'huligan' // Различаем от «Секрет»
  };
  const payloadB64 = b64urlEncode(JSON.stringify(payload));
  const sig = signPayload(payloadB64);
  return { token: `${payloadB64}.${sig}`, expiresAt: exp };
}

module.exports = async (req, res) => {
  setCors(req, res, { methods: 'GET, OPTIONS' });

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const bookingId = (req.query?.id || '').trim();
  if (!bookingId) return res.status(400).json({ error: 'Missing id' });

  try {
    const isAdmin = await isAdminAuthorized(req, {});

    const booking = await fbGet(`huligan_bookings/${bookingId}`);
    if (!booking) return res.status(404).json({ error: 'Ticket not found' });

    // Авторизация: админ или владелец по clientKey
    if (!isAdmin) {
      if (booking.clientKey) {
        const clientKey = String(req.query?.clientKey || '').trim();
        if (!clientKey || clientKey.length < 10 || booking.clientKey !== clientKey) {
          return res.status(403).json({ error: 'Forbidden' });
        }
      }
    }

    const st = String(booking.status || '').toLowerCase();
    if (BLOCKED_STATUSES.has(st)) return res.status(410).json({ error: 'Ticket revoked' });
    if (st !== 'confirmed') return res.status(409).json({ error: 'Ticket not confirmed yet' });

    const version = Number(booking.ticketLinkVersion || 1);
    const { token, expiresAt } = makeHuliganTicketToken(bookingId, version);
    const url = `${TICKET_PUBLIC_ORIGIN}/huligan-ticket.html?id=${encodeURIComponent(bookingId)}&tk=${encodeURIComponent(token)}`;

    const full = req.query?.full === '1';
    const resp = { ok: true, id: bookingId, url, expiresAt };

    if (full) {
      const cfg = await fbGet('huligan_config');
      resp.booking = {
        name: booking.name || '',
        ticketType: booking.ticketType || '',
        ticketNumber: booking.ticketNumber || null,
        finalPrice: Number(booking.finalPrice || 0),
        status: booking.status || '',
        createdAt: booking.createdAt || null,
        confirmedAt: booking.confirmedAt || null
      };
      resp.config = cfg?.show || {};
    }

    return res.status(200).json(resp);
  } catch (err) {
    console.error('[huligan-ticket-link] error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
