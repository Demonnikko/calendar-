const crypto = require('crypto');
const { fbGet } = require('./_firebase');
const { setCors } = require('./_cors');

const TICKET_LINK_SECRET = process.env.TICKET_LINK_SECRET || '';
const BLOCKED_STATUSES = new Set(['cancelled', 'refunded', 'returned', 'deleted']);

function b64urlDecode(input) {
  return Buffer.from(input, 'base64url').toString('utf8');
}

function signPayload(payloadB64) {
  if (!TICKET_LINK_SECRET) throw new Error('TICKET_LINK_SECRET is not configured');
  return crypto.createHmac('sha256', TICKET_LINK_SECRET).update(payloadB64).digest('base64url');
}

function verifyToken(token, bookingId) {
  if (!token || typeof token !== 'string') return { ok: false, code: 'missing_token' };
  const parts = token.split('.');
  if (parts.length !== 2) return { ok: false, code: 'invalid_token' };

  const [payloadB64, sig] = parts;
  const expectedSig = signPayload(payloadB64);

  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return { ok: false, code: 'invalid_signature' };
  }

  try {
    const payload = JSON.parse(b64urlDecode(payloadB64));
    if (!payload || !payload.bid || !payload.exp) return { ok: false, code: 'invalid_payload' };
    if (Date.now() > Number(payload.exp)) return { ok: false, code: 'expired' };
    if (String(payload.bid) !== String(bookingId)) return { ok: false, code: 'id_mismatch' };
    return { ok: true, payload };
  } catch {
    return { ok: false, code: 'invalid_payload' };
  }
}

module.exports = async (req, res) => {
  setCors(req, res, { publicRead: true, methods: 'GET, OPTIONS' });

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const bookingId = (req.query?.id || '').trim();
  const token = (req.query?.tk || '').trim();
  if (!bookingId) return res.status(400).json({ error: 'Missing id' });

  try {
    const booking = await fbGet(`huligan_bookings/${bookingId}`);
    if (!booking) return res.status(404).json({ error: 'Ticket not found' });

    const st = String(booking.status || '').toLowerCase();
    if (BLOCKED_STATUSES.has(st)) return res.status(410).json({ error: 'Ticket revoked' });
    if (st !== 'confirmed') return res.status(409).json({ error: 'Ticket not confirmed yet' });

    // Верификация токена
    const check = verifyToken(token, bookingId);
    if (!check.ok) return res.status(403).json({ error: 'Invalid or expired ticket link' });

    // Проверка версии ссылки (аннулированные ссылки)
    const currentVersion = Number(booking.ticketLinkVersion || 1);
    if (check.payload.v && Number(check.payload.v) !== currentVersion) {
      return res.status(403).json({ error: 'Link has been invalidated' });
    }

    const cfg = await fbGet('huligan_config');

    return res.status(200).json({
      ok: true,
      bookingId,
      booking: {
        name: booking.name || '',
        ticketType: booking.ticketType || '',
        ticketNumber: booking.ticketNumber || null,
        finalPrice: Number(booking.finalPrice || 0),
        status: booking.status || '',
        createdAt: booking.createdAt || null,
        confirmedAt: booking.confirmedAt || null
      },
      config: cfg?.show || {}
    });
  } catch (err) {
    console.error('[huligan-ticket-data] error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
