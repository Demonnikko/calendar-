const crypto = require('crypto');
const FB_URL = process.env.FIREBASE_DB_URL || 'https://kostyuk-vk-bot-default-rtdb.firebaseio.com';
const VK_TOKEN = process.env.VK_TOKEN || '';
const ADMIN_ID = parseInt(process.env.ADMIN_VK_ID) || 196783025;
const FIREBASE_SECRET = process.env.FIREBASE_SECRET ? `?auth=${process.env.FIREBASE_SECRET}` : '';
const TICKET_LINK_SECRET = process.env.TICKET_LINK_SECRET || '';
const TICKET_PUBLIC_ORIGIN = process.env.TICKET_PUBLIC_ORIGIN || 'https://vk-tickets.vercel.app';
const { isAdminAuthorized } = require('./_adminAuth');
const MINI_APP_BASE = process.env.VK_TICKETS_MINI_APP_URL || 'https://vk.com/app54466228_-209268664';

const BLOCKED_STATUSES = new Set(['cancelled', 'refunded', 'returned', 'deleted']);

// ── HMAC ticket token helpers ──
function b64urlEncode(input) { return Buffer.from(input).toString('base64url'); }
function b64urlDecode(input) { return Buffer.from(input, 'base64url').toString('utf8'); }
function signPayload(payloadB64) {
  if (!TICKET_LINK_SECRET) throw new Error('TICKET_LINK_SECRET not set');
  return crypto.createHmac('sha256', TICKET_LINK_SECRET).update(payloadB64).digest('base64url');
}
function makeHuliganToken(bookingId, version, ttlHours = 24 * 45) {
  const exp = Date.now() + ttlHours * 3600000;
  const payloadB64 = b64urlEncode(JSON.stringify({ bid: String(bookingId), v: Number(version) || 1, exp, show: 'huligan' }));
  return { token: `${payloadB64}.${signPayload(payloadB64)}`, expiresAt: exp };
}
function verifyHuliganToken(token, bookingId) {
  if (!token || typeof token !== 'string') return { ok: false };
  const parts = token.split('.');
  if (parts.length !== 2) return { ok: false };
  const [payloadB64, sig] = parts;
  const expectedSig = signPayload(payloadB64);
  const sigBuf = Buffer.from(sig); const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) return { ok: false };
  try {
    const p = JSON.parse(b64urlDecode(payloadB64));
    if (!p || !p.bid || !p.exp) return { ok: false };
    if (Date.now() > Number(p.exp)) return { ok: false, code: 'expired' };
    if (String(p.bid) !== String(bookingId)) return { ok: false };
    return { ok: true, payload: p };
  } catch { return { ok: false }; }
}

const TYPE_NAMES = { vip: 'VIP', std: 'Стандарт', eco: 'Эконом' };
const BOOKING_ID_RE = /^[A-Z0-9-]{4,40}$/i;

function genTicketNum() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let r = 'HUL-';
  for (let i = 0; i < 5; i++) r += chars[Math.floor(Math.random() * chars.length)];
  return r;
}

function withTimeout(ms) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return { signal: ctrl.signal, clear: () => clearTimeout(t) };
}

async function fbGet(path) {
  const { signal, clear } = withTimeout(8000);
  try {
    const r = await fetch(`${FB_URL}/${path}.json${FIREBASE_SECRET}`, { signal });
    clear();
    return await r.json();
  } catch { clear(); return null; }
}

async function fbPatch(path, data) {
  const { signal, clear } = withTimeout(8000);
  try {
    await fetch(`${FB_URL}/${path}.json${FIREBASE_SECRET}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      signal
    });
    clear();
  } catch { clear(); }
}

async function fbPut(path, data) {
  const { signal, clear } = withTimeout(8000);
  try {
    await fetch(`${FB_URL}/${path}.json${FIREBASE_SECRET}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      signal
    });
    clear();
  } catch { clear(); }
}

function isSafeBookingPath(path) {
  if (typeof path !== 'string') return false;
  const m = path.match(/^huligan_bookings\/([^/]+)$/);
  if (!m) return false;
  return BOOKING_ID_RE.test(m[1]);
}

function validateBookingCreate(path, data) {
  if (!isSafeBookingPath(path) || !data || typeof data !== 'object') return false;
  const id = path.split('/')[1];
  if (String(data.bookingId || '') !== id) return false;
  if (!String(data.clientKey || '').trim() || String(data.clientKey).length < 10) return false;
  if (!String(data.name || '').trim()) return false;
  if (!/^[a-z0-9_-]{1,30}$/i.test(String(data.ticketType || ''))) return false;
  if (data.status !== 'new') return false;
  if (!Number.isFinite(Number(data.createdAt))) return false;
  const fp = Number(data.finalPrice);
  const op = Number(data.originalPrice);
  if (!Number.isFinite(fp) || fp < 0) return false;
  if (!Number.isFinite(op) || op < 0) return false;
  return true;
}

function validateBookingPatch(path, data) {
  if (!isSafeBookingPath(path) || !data || typeof data !== 'object') return false;
  const keys = Object.keys(data);
  const allowed = ['status', 'paidAt', 'clientKey', 'vkUserId'];
  if (!keys.length || keys.some(k => !allowed.includes(k))) return false;
  if (data.status !== 'waiting_admin') return false;
  if (!Number.isFinite(Number(data.paidAt))) return false;
  if (data.clientKey !== undefined && (!String(data.clientKey).trim() || String(data.clientKey).length < 10)) return false;
  if (data.vkUserId !== undefined && !Number.isFinite(Number(data.vkUserId))) return false;
  return true;
}

async function vkSend(userId, text) {
  if (!VK_TOKEN) return { error: { error_msg: 'VK_TOKEN is not configured' } };
  const params = new URLSearchParams({
    peer_id: userId,
    message: text,
    random_id: Math.floor(Math.random() * 2e9),
    access_token: VK_TOKEN,
    v: '5.199'
  });
  const r = await fetch('https://api.vk.com/method/messages.send', { method: 'POST', body: params });
  const data = await r.json();
  if (data.error) console.error('[huligan] vkSend error:', JSON.stringify(data.error));
  return data;
}

function buildHuliganMiniAppTicketLink(bookingId = '') {
  const params = new URLSearchParams({ hash: 'huligan', tab: 'tickets' });
  if (bookingId) params.set('bookingId', String(bookingId));
  const hash = bookingId ? `#huligan/tickets/${encodeURIComponent(String(bookingId))}` : '#huligan/tickets';
  return `${MINI_APP_BASE}?${params.toString()}${hash}`;
}

function canAccessBooking(booking, body = {}) {
  // Доступ только по clientKey (секретный ключ, >= 10 символов).
  // vkUserId — публичный идентификатор, не подходит для авторизации.
  // Legacy-брони (без clientKey) пропускаем — созданы до введения этой системы.
  if (!booking.clientKey) return true;
  const clientKey = String(body.clientKey || '').trim();
  return Boolean(clientKey && clientKey.length >= 10 && booking.clientKey === clientKey);
}

function publicBookingView(bookingId, booking, full = false) {
  const base = {
    bookingId,
    ticketType: booking.ticketType || '',
    status: booking.status || '',
    createdAt: booking.createdAt || null,
    ticketNumber: booking.ticketNumber || null,
    finalPrice: Number(booking.finalPrice || 0),
    originalPrice: Number(booking.originalPrice || 0),
    name: booking.name || ''
  };
  if (!full) return base;
  return {
    ...base,
    phone: booking.phone || '',
    promoCode: booking.promoCode || null,
    paidAt: booking.paidAt || null,
    confirmedAt: booking.confirmedAt || null
  };
}

const { setCors } = require('./_cors');

module.exports = async (req, res) => {
  setCors(req, res, { methods: 'POST, GET, OPTIONS' });

  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── GET ──
  if (req.method === 'GET') {
    const getAction = req.query?.action || '';

    // Подписанная ссылка на билет (для QR-кода)
    if (getAction === 'ticket_link') {
      const id = (req.query?.id || '').trim();
      if (!id) return res.status(400).json({ error: 'Missing id' });
      try {
        const isAdmin = await isAdminAuthorized(req, {});
        const booking = await fbGet(`huligan_bookings/${id}`);
        if (!booking) return res.status(404).json({ error: 'Ticket not found' });
        if (!isAdmin && booking.clientKey) {
          const ck = String(req.query?.clientKey || '').trim();
          if (!ck || ck.length < 10 || booking.clientKey !== ck) return res.status(403).json({ error: 'Forbidden' });
        }
        const st = String(booking.status || '').toLowerCase();
        if (BLOCKED_STATUSES.has(st)) return res.status(410).json({ error: 'Ticket revoked' });
        if (st !== 'confirmed') return res.status(409).json({ error: 'Ticket not confirmed yet' });
        const ver = Number(booking.ticketLinkVersion || 1);
        const { token, expiresAt } = makeHuliganToken(id, ver);
        const url = `${TICKET_PUBLIC_ORIGIN}/huligan-ticket.html?id=${encodeURIComponent(id)}&tk=${encodeURIComponent(token)}`;
        const resp = { ok: true, id, url, expiresAt };
        if (req.query?.full === '1') {
          const cfg = await fbGet('huligan_config');
          resp.booking = { name: booking.name || '', ticketType: booking.ticketType || '', ticketNumber: booking.ticketNumber || null, finalPrice: Number(booking.finalPrice || 0), status: booking.status || '', createdAt: booking.createdAt || null, confirmedAt: booking.confirmedAt || null };
          resp.config = cfg?.show || {};
        }
        return res.status(200).json(resp);
      } catch (err) {
        console.error('[huligan ticket_link] error:', err.message);
        return res.status(500).json({ error: 'Internal server error' });
      }
    }

    // Верификация билета по токену (для страницы проверки)
    if (getAction === 'ticket_data') {
      const id = (req.query?.id || '').trim();
      const tk = (req.query?.tk || '').trim();
      if (!id) return res.status(400).json({ error: 'Missing id' });
      try {
        const booking = await fbGet(`huligan_bookings/${id}`);
        if (!booking) return res.status(404).json({ error: 'Ticket not found' });
        const st = String(booking.status || '').toLowerCase();
        if (BLOCKED_STATUSES.has(st)) return res.status(410).json({ error: 'Ticket revoked' });
        if (st !== 'confirmed') return res.status(409).json({ error: 'Ticket not confirmed yet' });
        const check = verifyHuliganToken(tk, id);
        if (!check.ok) return res.status(403).json({ error: 'Invalid or expired ticket link' });
        const curVer = Number(booking.ticketLinkVersion || 1);
        if (check.payload.v && Number(check.payload.v) !== curVer) return res.status(403).json({ error: 'Link invalidated' });
        const cfg = await fbGet('huligan_config');
        return res.status(200).json({ ok: true, bookingId: id, booking: { name: booking.name || '', ticketType: booking.ticketType || '', ticketNumber: booking.ticketNumber || null, finalPrice: Number(booking.finalPrice || 0), status: booking.status || '', createdAt: booking.createdAt || null, confirmedAt: booking.confirmedAt || null }, config: cfg?.show || {} });
      } catch (err) {
        console.error('[huligan ticket_data] error:', err.message);
        return res.status(500).json({ error: 'Internal server error' });
      }
    }

    // Список всех бронирований (для админ-панели)
    if (!(await isAdminAuthorized(req, {}))) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const bookings = await fbGet('huligan_bookings');
    return res.status(200).json(bookings || {});
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { } }

  const { action, bookingId } = body || {};
  if (!action) return res.status(400).json({ error: 'Missing action' });

  try {
    // ── Public config for mini-app ──
    if (action === 'get_config') {
      const cfg = await fbGet('huligan_config');
      return res.status(200).json(cfg || {});
    }

    // ── Get one booking by ID (for polling / resume) ──
    if (action === 'get_booking') {
      if (!bookingId) return res.status(400).json({ error: 'Missing bookingId' });
      const booking = await fbGet(`huligan_bookings/${bookingId}`);
      if (!booking) return res.status(404).json({ error: 'Booking not found' });
      const isAdmin = await isAdminAuthorized(req, body);
      if (!isAdmin && !canAccessBooking(booking, body)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      return res.status(200).json(publicBookingView(bookingId, booking, true));
    }

    // ── List bookings for VK user (for "Мои билеты") ──
    if (action === 'list_user_bookings') {
      const vkUserId = Number(body?.vkUserId);
      if (!Number.isFinite(vkUserId) || vkUserId <= 0) return res.status(200).json([]);
      const all = await fbGet('huligan_bookings') || {};
      const items = Object.entries(all)
        .map(([id, b]) => ({ bookingId: b.bookingId || id, ...b }))
        .filter(b => Number(b.vkUserId) === vkUserId)
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      return res.status(200).json(items.map(b => publicBookingView(b.bookingId || b.id, b, false)));
    }

    // ── Get one promo by code ──
    if (action === 'get_promo') {
      const code = String(body?.code || '').trim().toUpperCase();
      if (!code) return res.status(400).json({ error: 'Missing code' });
      const promo = await fbGet(`huligan_promo/${code}`);
      return res.status(200).json(promo || null);
    }

    // ── Notify admin about new payment ──
    if (action === 'notify_admin') {
      if (!bookingId) return res.status(400).json({ error: 'Missing bookingId' });

      const booking = await fbGet(`huligan_bookings/${bookingId}`);
      if (!booking) return res.status(404).json({ error: 'Booking not found' });
      const isAdmin = await isAdminAuthorized(req, body);
      if (!isAdmin && !canAccessBooking(booking, body)) return res.status(403).json({ error: 'Forbidden' });

      // Принимаем уведомление только от брони в статусе new или waiting_admin
      const currentStatus = String(booking.status || '');
      if (currentStatus !== 'new' && currentStatus !== 'waiting_admin') {
        return res.status(409).json({ error: 'Booking is not awaiting payment' });
      }

      // Сервер переводит статус — клиент не пишет в Firebase напрямую
      if (currentStatus === 'new') {
        await fbPatch(`huligan_bookings/${bookingId}`, {
          status: 'waiting_admin',
          paidAt: Date.now(),
          vkUserId: body.vkUserId || booking.vkUserId || null
        });
      }

      const vkLink = booking.vkUserId ? `\n👤 VK: vk.com/id${booking.vkUserId}` : '';
      const msg = [
        '😈 Новый заказ ХУЛИgan 18+',
        '',
        `Имя: ${booking.name}`,
        `Тип: ${TYPE_NAMES[booking.ticketType] || booking.ticketType}`,
        `🆔 ${bookingId}`,
        vkLink,
        '',
        '✅ Подтвердить оплату:',
        'https://vk-tickets.vercel.app/admin.html'
      ].filter(l => l !== null).join('\n');

      const result = await vkSend(ADMIN_ID, msg);
      console.log('[huligan] notify_admin result:', JSON.stringify(result));
      return res.status(200).json({ ok: true });
    }

    // ── Confirm payment (called from admin panel) ──
    if (action === 'confirm') {
      if (!(await isAdminAuthorized(req, body))) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      if (!bookingId) return res.status(400).json({ error: 'Missing bookingId' });

      const booking = await fbGet(`huligan_bookings/${bookingId}`);
      if (!booking) return res.status(404).json({ error: 'Booking not found' });

      const curStatus = String(booking.status || '');
      if (curStatus !== 'waiting_admin') {
        return res.status(409).json({ error: `Cannot confirm: status is '${curStatus}'` });
      }

      const ticketNumber = genTicketNum();
      await fbPatch(`huligan_bookings/${bookingId}`, {
        status: 'confirmed',
        ticketNumber,
        confirmedAt: Date.now()
      });

      // Notify user via VK if they have VK ID
      if (booking.vkUserId) {
        const ticketLink = buildHuliganMiniAppTicketLink(bookingId);
        const msg = [
          'Твой билет на «ХУЛИgan» готов.',
          `Вот ссылка: ${ticketLink}`
        ].join('\n');
        await vkSend(booking.vkUserId, msg).catch(() => { });
      }

      return res.status(200).json({ ok: true, ticketNumber });
    }

    // ── Cancel order ──
    if (action === 'cancel') {
      if (!(await isAdminAuthorized(req, body))) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      if (!bookingId) return res.status(400).json({ error: 'Missing bookingId' });
      const booking = await fbGet(`huligan_bookings/${bookingId}`);
      if (!booking) return res.status(404).json({ error: 'Booking not found' });
      await fbPatch(`huligan_bookings/${bookingId}`, { status: 'cancelled', cancelledAt: Date.now() });

      if (booking.vkUserId) {
        const msg = [
          '↩ Возврат/отмена оформлены',
          '',
          'Ваш билет на «ХУЛИgan» переведён в статус отмены.',
          'Если был согласован возврат, деньги будут отправлены по вашему запросу.',
          '',
          `🆔 Бронь: ${bookingId}`
        ].join('\n');
        await vkSend(booking.vkUserId, msg).catch(() => { });
      }
      return res.status(200).json({ ok: true });
    }

    // ── Refund confirmed order (admin) ──
    if (action === 'refund') {
      if (!(await isAdminAuthorized(req, body))) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      if (!bookingId) return res.status(400).json({ error: 'Missing bookingId' });
      const booking = await fbGet(`huligan_bookings/${bookingId}`);
      if (!booking) return res.status(404).json({ error: 'Booking not found' });

      const status = String(booking.status || '').toLowerCase();
      if (status === 'cancelled' || status === 'refunded' || status === 'returned') {
        return res.status(409).json({ error: 'Booking already closed' });
      }

      const reason = String(body?.reason || '').trim();
      await fbPatch(`huligan_bookings/${bookingId}`, {
        status: 'refunded',
        refundedAt: Date.now(),
        refundReason: reason || null
      });

      if (booking.vkUserId) {
        const msg = [
          '↩ Возврат оформлен',
          '',
          'Ваш билет на «ХУЛИgan» аннулирован.',
          'Деньги будут возвращены по вашему запросу.',
          'Спасибо, что обратились к нам.',
          '',
          'Если удобно, напишите в ответ, почему вы решили вернуть билет.',
          '',
          `🆔 Бронь: ${bookingId}`
        ].join('\n');
        await vkSend(booking.vkUserId, msg).catch(() => { });
      }

      return res.status(200).json({ ok: true });
    }

    // ── Direct Firebase write from browser (fb_put, fb_patch) ──
    if (action === 'fb_put') {
      const { path, data } = body;
      if (!path) return res.status(400).json({ error: 'Missing path' });
      if (!validateBookingCreate(path, data)) {
        return res.status(400).json({ error: 'Invalid booking payload' });
      }
      // Защита от дублей: если бронь с таким ID уже существует — отклоняем
      const bookingIdNew = path.split('/')[1];
      const existing = await fbGet(`huligan_bookings/${bookingIdNew}`);
      if (existing) return res.status(409).json({ error: 'Booking ID already exists' });
      // Проверяем цены на сервере — клиент не должен сам устанавливать стоимость
      const cfg = await fbGet('huligan_config');
      const typeKey = String(data.ticketType);
      let expectedPrice = 0;
      if (cfg?.ticketTypes?.[typeKey]?.price != null) {
        expectedPrice = Number(cfg.ticketTypes[typeKey].price);
      } else if (cfg?.prices?.[typeKey] != null) {
        expectedPrice = Number(cfg.prices[typeKey]);
      }
      if (expectedPrice > 0 && Number(data.originalPrice) !== expectedPrice) {
        return res.status(400).json({ error: 'Price mismatch' });
      }
      await fbPut(path, data);
      return res.status(200).json({ ok: true });
    }

    if (action === 'fb_patch') {
      const { path, data } = body;
      if (!path) return res.status(400).json({ error: 'Missing path' });
      if (!validateBookingPatch(path, data)) {
        return res.status(400).json({ error: 'Invalid patch payload' });
      }
      const id = path.split('/')[1];
      const booking = await fbGet(`huligan_bookings/${id}`);
      if (!booking) return res.status(404).json({ error: 'Booking not found' });
      const isAdmin = await isAdminAuthorized(req, body);
      const accessPayload = { clientKey: data.clientKey, vkUserId: data.vkUserId };
      if (!isAdmin && !canAccessBooking(booking, accessPayload)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      await fbPatch(path, { status: data.status, paidAt: data.paidAt });
      return res.status(200).json({ ok: true });
    }

    // ── Refund request ──
    if (action === 'refund_request') {
      if (!bookingId) return res.status(400).json({ error: 'Missing bookingId' });
      const booking = await fbGet(`huligan_bookings/${bookingId}`);
      if (!booking) return res.status(404).json({ error: 'Booking not found' });
      const isAdmin = await isAdminAuthorized(req, body);
      if (!isAdmin && !canAccessBooking(booking, body)) return res.status(403).json({ error: 'Forbidden' });
      const status = String(booking.status || '').toLowerCase();
      if (status === 'cancelled' || status === 'refunded' || status === 'returned') {
        return res.status(409).json({ error: 'Booking already closed' });
      }
      const reason = String(body?.reason || '').trim();
      const patch = {
        refundRequested: true,
        refundRequestedAt: Date.now(),
        status: 'refund_requested'
      };
      if (reason) patch.refundReason = reason;
      await fbPatch(`huligan_bookings/${bookingId}`, patch);

      const vkLink = booking.vkUserId ? `vk.com/id${booking.vkUserId}` : '—';
      const msg = [
        '↩ ЗАПРОС НА ВОЗВРАТ — ХУЛИgan',
        '',
        `Имя: ${booking.name}`,
        `Тип билета: ${TYPE_NAMES[booking.ticketType] || booking.ticketType}`,
        `🆔 Бронь: ${bookingId}`,
        `👤 VK: ${vkLink}`,
        reason ? `💬 Причина: ${reason}` : '💬 Причина: не указана',
        '',
        '⚠️ Нужно вернуть деньги. Свяжитесь с клиентом!'
      ].join('\n');

      await vkSend(ADMIN_ID, msg);
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'Unknown action' });

  } catch (err) {
    console.error('[huligan] error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
