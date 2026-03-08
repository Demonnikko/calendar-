const { fbGet, fbPut } = require('./_firebase');
const { setCors } = require('./_cors');

module.exports = async (req, res) => {
  setCors(req, res, { publicRead: true, methods: 'GET, POST, OPTIONS' });

  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET — чтение мест или конфига
  if (req.method === 'GET') {
    const type = req.query?.type || '';

    // ?type=config — конфигурация шоу
    if (type === 'config') {
      const section = req.query?.section || '';
      if (section === 'huligan') {
        const hulCfg = await fbGet('huligan_config') || {};
        return res.status(200).json({ huliganShow: hulCfg.show || null });
      }
      const config = await fbGet('ticket_config') || {};
      delete config.adminPassword;
      return res.status(200).json(config);
    }

    // По умолчанию — все места
    const seats = await fbGet('ticket_seats') || {};
    return res.status(200).json(seats);
  }

  // POST — временная резервация / освобождение мест (для TEMP-бронирований)
  if (req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { }
    }

    const { action, seats, tempBookingId } = body || {};

    if (action === 'reserve' && Array.isArray(seats) && tempBookingId) {
      if (!String(tempBookingId).startsWith('TEMP-')) {
        return res.status(400).json({ error: 'Only TEMP bookings allowed' });
      }
      const now = Date.now();
      await Promise.all(seats.map(s =>
        fbPut(`ticket_seats/${s.tableId}_${s.seatIdx}`, {
          status: 'reserved',
          bookingId: tempBookingId,
          reservedAt: now
        })
      ));
      return res.status(200).json({ ok: true });
    }

    if (action === 'release' && Array.isArray(seats)) {
      await Promise.all(seats.map(s =>
        fbPut(`ticket_seats/${s.tableId}_${s.seatIdx}`, { status: 'available' })
      ));
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'Invalid action' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
