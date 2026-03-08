const { fbGet, fbPut } = require('./_firebase');
const { setCors } = require('./_cors');

module.exports = async (req, res) => {
  setCors(req, res, { publicRead: true, methods: 'GET, POST, OPTIONS' });

  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET — чтение всех мест
  if (req.method === 'GET') {
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
      // Только TEMP-резервации допускаются через этот эндпоинт
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
