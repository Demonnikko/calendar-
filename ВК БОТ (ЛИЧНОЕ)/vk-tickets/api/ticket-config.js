const { fbGet } = require('./_firebase');
const { setCors } = require('./_cors');

module.exports = async (req, res) => {
  setCors(req, res, { publicRead: true, methods: 'GET, OPTIONS' });

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const section = req.query?.section || '';

  if (section === 'huligan') {
    const hulCfg = await fbGet('huligan_config') || {};
    return res.status(200).json({ huliganShow: hulCfg.show || null });
  }

  const config = await fbGet('ticket_config') || {};
  // Не отдаём чувствительные данные
  delete config.adminPassword;
  return res.status(200).json(config);
};
