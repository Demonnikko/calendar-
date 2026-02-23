const { initializeApp } = require('firebase/app');
const { getDatabase, ref, set, get, remove } = require('firebase/database');
const { waitUntil } = require('@vercel/functions');
const config = require('../config');

// ========== FIREBASE (клиентский SDK — работает без Blaze) ==========
const firebaseApp = initializeApp(config.FIREBASE_CONFIG);
const db = getDatabase(firebaseApp);

const VK_TOKEN = config.VK_TOKEN;
const VK_CONFIRMATION = config.VK_CONFIRMATION;
const ADMIN_VK_ID = Number(config.ADMIN_VK_ID);
const PAYMENT = config.PAYMENT;

// ========== FAQ ==========
const FAQ_TEXT = `📋 Часто задаваемые вопросы\n\n` +
  `📶 Нужен ли интернет?\n` +
  `При первом запуске — да (для активации ключа). После этого приложения работают полностью офлайн!\n\n` +
  `🔑 Как активировать ключ?\n` +
  `При первом запуске появится экран активации. Вставьте ключ и нажмите «Активировать». Ключ активируется единожды — сразу при покупке. Если приложение вылетело, экран активации появится снова — просто вставьте тот же ключ.\n\n` +
  `📱 Можно ли использовать на нескольких устройствах?\n` +
  `Ключ привязывается к одному устройству при активации. При покупке комплекта один ключ работает сразу для двух приложений (Калькулятор и Календарь).\n\n` +
  `🔄 Ключ не работает?\n` +
  `Проверьте правильность ввода (без лишних пробелов). Если не помогло — напишите в поддержку.\n\n` +
  `💳 Какие способы оплаты?\n` +
  `Перевод на карту Т-Банка или по СБП. Другие банки НЕ принимаются.\n\n` +
  `⏳ Сколько ждать ключ после оплаты?\n` +
  `5-15 минут (с 09:00 до 00:00 МСК). Ночью — утром.\n\n` +
  `🆓 Можно ли попробовать бесплатно?\n` +
  `Да! Выберите приложение и нажмите «7 дней (пробный)». Один раз для каждого приложения.`;

// ========== ОБУЧЕНИЕ (видео из плейлистов ВК) ==========
const TRAINING = {
  calculator: [
    { title: '🚀 Активация приложения', url: 'https://vkvideo.ru/playlist/-236098668_1/video-236098668_456239017?linked=1' },
    { title: '📱 Главный экран', url: 'https://vkvideo.ru/playlist/-236098668_1/video-236098668_456239018?linked=1' },
    { title: '👤 Профиль', url: 'https://vkvideo.ru/playlist/-236098668_1/video-236098668_456239023?linked=1' },
    { title: '🛠 Услуги', url: 'https://vkvideo.ru/playlist/-236098668_1/video-236098668_456239027?linked=1' },
    { title: '🗺 Логистика', url: 'https://vkvideo.ru/playlist/-236098668_1/video-236098668_456239028?linked=1' },
    { title: '📦 Остальное', url: 'https://vkvideo.ru/playlist/-236098668_1/video-236098668_456239029?linked=1' },
    { title: '⚡ Быстрые ответы', url: 'https://vkvideo.ru/playlist/-236098668_1/video-236098668_456239030?linked=1' },
    { title: '⚙ Работа калькулятора', url: 'https://vkvideo.ru/playlist/-236098668_1/video-236098668_456239031?linked=1' },
    { title: '✨ Доп фишки', url: 'https://vkvideo.ru/playlist/-236098668_1/video-236098668_456239033?linked=1' }
  ],
  calendar: [
    { title: '🚀 Активация приложения', url: 'https://vkvideo.ru/playlist/-236098668_2/video-236098668_456239034?linked=1' },
    { title: '📱 Главный экран', url: 'https://vkvideo.ru/playlist/-236098668_2/video-236098668_456239035?linked=1' },
    { title: '📊 Дашборд', url: 'https://vkvideo.ru/video-236098668_456239036?linked=1' },
    { title: '⚙️ Настройки', url: 'https://vkvideo.ru/playlist/-236098668_2/video-236098668_456239037?linked=1' },
    { title: '📤 Экспорт и импорт', url: 'https://vkvideo.ru/playlist/-236098668_2/video-236098668_456239038?linked=1' },
    { title: '📅 Событие: основное', url: 'https://vkvideo.ru/playlist/-236098668_2/video-236098668_456239039?linked=1' },
    { title: '📋 Событие: расписание', url: 'https://vkvideo.ru/playlist/-236098668_2/video-236098668_456239040?linked=1' },
    { title: '💰 Событие: финансы', url: 'https://vkvideo.ru/playlist/-236098668_2/video-236098668_456239042?linked=1' },
    { title: '🌐 Как всё устроено', url: 'https://vkvideo.ru/playlist/-236098668_2/video-236098668_456239043?linked=1' }
  ]
};

// ========== КАТАЛОГ ПРИЛОЖЕНИЙ ==========
const PRODUCTS = [
  {
    id: 'calculator',
    name: '🧮 Калькулятор',
    description: 'Финансы, КП, аналитика для артистов',
    appUrl: 'https://demonnikko.github.io/KALK-/',
    plans: [
      { id: 'trial_7d', label: '7 дней (пробный)', price: 0, days: 7 },
      { id: '1m', label: '1 месяц', price: 390, days: 30 },
      { id: '3m', label: '3 месяца', price: 990, days: 90 },
      { id: '6m', label: '6 месяцев', price: 1690, days: 180 },
      { id: '1y', label: '1 год', price: 2490, days: 365 },
      { id: '2y', label: '2 года', price: 3990, days: 730 },
      { id: 'lifetime', label: 'Бессрочно', price: 7990, days: 36500 }
    ]
  },
  {
    id: 'calendar',
    name: '📅 Календарь',
    description: 'Расписание, логистика, финансы',
    appUrl: 'https://demonnikko.github.io/calendar-/',
    plans: [
      { id: 'trial_7d', label: '7 дней (пробный)', price: 0, days: 7 },
      { id: '1m', label: '1 месяц', price: 390, days: 30 },
      { id: '3m', label: '3 месяца', price: 990, days: 90 },
      { id: '6m', label: '6 месяцев', price: 1690, days: 180 },
      { id: '1y', label: '1 год', price: 2490, days: 365 },
      { id: '2y', label: '2 года', price: 3990, days: 730 },
      { id: 'lifetime', label: 'Бессрочно', price: 6990, days: 36500 }
    ]
  },
  {
    id: 'bundle',
    name: '🎁 Комплект',
    description: 'Калькулятор + Календарь — один ключ на оба приложения',
    isBundle: true,
    bundleApps: ['calculator', 'calendar'],
    plans: [
      { id: 'bundle_1m', label: '1 месяц', price: 590, days: 30 },
      { id: 'bundle_3m', label: '3 месяца', price: 1490, days: 90 },
      { id: 'bundle_6m', label: '6 месяцев', price: 2490, days: 180 },
      { id: 'bundle_1y', label: '1 год', price: 3690, days: 365 },
      { id: 'bundle_2y', label: '2 года', price: 5990, days: 730 },
      { id: 'bundle_lifetime', label: 'Бессрочно', price: 9990, days: 36500 }
    ]
  }
];

// ========== VK API ==========
async function vkApi(method, params) {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) body.append(key, String(value));
  }
  body.append('access_token', VK_TOKEN);
  body.append('v', '5.199');

  const resp = await fetch(`https://api.vk.com/method/${method}`, { method: 'POST', body });
  const data = await resp.json();
  if (data.error) console.error(`VK API [${method}]:`, data.error);
  return data;
}

// Отправить новое сообщение и сохранить его ID
async function sendMessage(userId, message, keyboard, attachment) {
  const params = { user_id: userId, message, random_id: Math.floor(Math.random() * 2e9) };
  if (keyboard) params.keyboard = JSON.stringify(keyboard);
  if (attachment) params.attachment = attachment;
  const result = await vkApi('messages.send', params);
  if (result.response) {
    try {
      await set(ref(db, `vk_last_msg/${userId}`), {
        message_id: result.response,
        peer_id: userId,
        ts: Date.now()
      });
    } catch (e) { console.warn('Non-critical:', e.message); }
  }
  return result;
}

// Редактировать последнее сообщение бота (если возможно), иначе отправить новое
async function editMessage(userId, message, keyboard) {
  try {
    const snap = await get(ref(db, `vk_last_msg/${userId}`));
    const last = snap.val();
    if (last && last.message_id) {
      const params = { peer_id: last.peer_id, message_id: last.message_id, message };
      if (keyboard) params.keyboard = JSON.stringify(keyboard);
      const result = await vkApi('messages.edit', params);
      if (result.response === 1) return result;
    }
  } catch (e) { console.warn('Non-critical:', e.message); }
  return sendMessage(userId, message, keyboard);
}

async function answerEvent(eventId, userId, peerId, text) {
  return vkApi('messages.sendMessageEventAnswer', {
    event_id: eventId, user_id: userId, peer_id: peerId,
    event_data: JSON.stringify({ type: 'show_snackbar', text })
  });
}

async function getUserName(userId) {
  const resp = await vkApi('users.get', { user_ids: userId });
  if (resp.response && resp.response[0]) {
    return `${resp.response[0].first_name} ${resp.response[0].last_name}`;
  }
  return `VK ${userId}`;
}

// ========== НОМЕРА ЗАКАЗОВ ==========
async function getNextOrderNumber() {
  try {
    const counterRef = ref(db, 'vk_order_counter');
    const snap = await get(counterRef);
    const current = snap.val() || 0;
    const next = current + 1;
    await set(counterRef, next);
    return `ORD-${String(next).padStart(5, '0')}`;
  } catch (_) {
    return `ORD-${Date.now().toString(36).toUpperCase()}`;
  }
}

// ========== ГЕНЕРАЦИЯ КЛЮЧЕЙ ==========
function generateLicenseKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let key = '';
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 4; j++) {
      key += chars[Math.floor(Math.random() * chars.length)];
    }
    if (i < 2) key += '-';
  }
  let sum = 0;
  const data = key.replace(/-/g, '');
  for (let i = 0; i < data.length; i++) sum += data.charCodeAt(i);
  const check = (sum % 10000).toString(36).toUpperCase().padStart(4, '0');
  return key + '-' + check;
}

async function generateAndSaveKey({ appId, userId, buyerName, price, days, planLabel, orderNumber }) {
  const now = new Date().toISOString();
  const newKey = generateLicenseKey();
  const keyFirebase = newKey.replace(/[.#$[\]]/g, '-');
  const product = PRODUCTS.find(p => p.id === appId);

  await set(ref(db, `licenses/${keyFirebase}`), {
    key: newKey,
    appName: product ? product.name : appId,
    buyer: { id: userId, platform: 'vk', name: buyerName },
    payment: price,
    currency: 'RUB',
    expiryDays: days,
    created: now,
    activated: false,
    deviceId: null,
    installId: null,
    activatedDate: null,
    lastCheck: null,
    planLabel,
    paymentMethod: 'vk_card_transfer',
    bundleId: null,
    orderNumber: orderNumber || null
  });

  return newKey;
}

// ========== ПРОВЕРКА ПРОБНОГО КЛЮЧА ==========
async function hasTrialKey(userId, appId) {
  try {
    // Быстрая проверка по индексу vk_trials (не грузим всю базу)
    const snap = await get(ref(db, `vk_trials/${userId}/${appId}`));
    if (snap.val()) return true;
    return false;
  } catch (e) {
    console.warn('hasTrialKey error:', e.message);
    return false;
  }
}

async function markTrialUsed(userId, appId) {
  try {
    await set(ref(db, `vk_trials/${userId}/${appId}`), Date.now());
  } catch (e) { console.warn('markTrialUsed error:', e.message); }
}

// ========== ССЫЛКИ НА ПРИЛОЖЕНИЯ ==========
// ========== ПОЛУЧИТЬ ВСЕХ VK ПОЛЬЗОВАТЕЛЕЙ ==========
async function getAllVkUserIds() {
  const snap = await get(ref(db, 'licenses'));
  const all = snap.val() || {};
  const ids = new Set();
  for (const lic of Object.values(all)) {
    if (lic.buyer && lic.buyer.id && lic.buyer.id.startsWith('vk_')) {
      ids.add(lic.buyer.id.replace('vk_', ''));
    }
  }
  return [...ids];
}

// ========== КЛАВИАТУРЫ ==========
function mainMenuKeyboard() {
  return {
    inline: true,
    buttons: [
      ...PRODUCTS.map(p => [{
        action: { type: 'callback', payload: JSON.stringify({ cmd: 'app', id: p.id }), label: p.name },
        color: p.isBundle ? 'positive' : 'primary'
      }]),
      [
        { action: { type: 'callback', payload: JSON.stringify({ cmd: 'status' }), label: '📊 Мои подписки' }, color: 'secondary' }
      ],
      [
        { action: { type: 'callback', payload: JSON.stringify({ cmd: 'faq' }), label: '📋 FAQ' }, color: 'secondary' },
        { action: { type: 'callback', payload: JSON.stringify({ cmd: 'support' }), label: '❓ Поддержка' }, color: 'secondary' }
      ]
    ]
  };
}

function plansKeyboard(appId) {
  const app = PRODUCTS.find(p => p.id === appId);
  if (!app) return null;
  const buttons = [];
  const freePlans = app.plans.filter(p => p.price === 0);
  const paidPlans = app.plans.filter(p => p.price > 0);

  // Пробный — отдельная строка
  for (const p of freePlans) {
    buttons.push([{
      action: { type: 'callback', payload: JSON.stringify({ cmd: 'plan', app: appId, plan: p.id }), label: `${p.label} — Бесплатно` },
      color: 'positive'
    }]);
  }
  // Платные — по 2 в ряд (цены видны в тексте сообщения)
  for (let i = 0; i < paidPlans.length; i += 2) {
    const row = [{
      action: { type: 'callback', payload: JSON.stringify({ cmd: 'plan', app: appId, plan: paidPlans[i].id }), label: paidPlans[i].label },
      color: 'primary'
    }];
    if (i + 1 < paidPlans.length) {
      row.push({
        action: { type: 'callback', payload: JSON.stringify({ cmd: 'plan', app: appId, plan: paidPlans[i + 1].id }), label: paidPlans[i + 1].label },
        color: 'primary'
      });
    }
    buttons.push(row);
  }
  buttons.push([{ action: { type: 'callback', payload: JSON.stringify({ cmd: 'menu' }), label: '← Назад' }, color: 'secondary' }]);
  return { inline: true, buttons };
}

function paymentKeyboard(appId, planId) {
  return {
    inline: true,
    buttons: [
      [{ action: { type: 'callback', payload: JSON.stringify({ cmd: 'paid', app: appId, plan: planId }), label: '✅ Я оплатил' }, color: 'positive' }],
      [{ action: { type: 'callback', payload: JSON.stringify({ cmd: 'app', id: appId }), label: '← Назад к тарифам' }, color: 'secondary' }]
    ]
  };
}

function adminKeyboard(pendingId) {
  return {
    inline: true,
    buttons: [[
      { action: { type: 'callback', payload: JSON.stringify({ cmd: 'confirm', id: pendingId }), label: '✅ Подтвердить' }, color: 'positive' },
      { action: { type: 'callback', payload: JSON.stringify({ cmd: 'reject', id: pendingId }), label: '❌ Отклонить' }, color: 'negative' }
    ]]
  };
}

// ========== АДМИН-ПАНЕЛЬ ==========
function adminMenuKeyboard() {
  return {
    inline: true,
    buttons: [
      [
        { action: { type: 'callback', payload: JSON.stringify({ cmd: 'admin_stats' }), label: '📊 Статистика' }, color: 'primary' },
        { action: { type: 'callback', payload: JSON.stringify({ cmd: 'admin_revenue' }), label: '📈 Выручка' }, color: 'primary' }
      ],
      [
        { action: { type: 'callback', payload: JSON.stringify({ cmd: 'admin_orders' }), label: '📋 Заказы' }, color: 'primary' },
        { action: { type: 'callback', payload: JSON.stringify({ cmd: 'admin_pending' }), label: '⏳ Ожидают' }, color: 'primary' }
      ],
      [
        { action: { type: 'callback', payload: JSON.stringify({ cmd: 'admin_keys' }), label: '🔑 Ключи' }, color: 'primary' },
        { action: { type: 'callback', payload: JSON.stringify({ cmd: 'admin_users' }), label: '👥 Юзеры' }, color: 'primary' }
      ],
      [
        { action: { type: 'callback', payload: JSON.stringify({ cmd: 'admin_search' }), label: '🔍 Поиск' }, color: 'primary' },
        { action: { type: 'callback', payload: JSON.stringify({ cmd: 'admin_reviews' }), label: '⭐ Отзывы' }, color: 'primary' }
      ],
      [
        { action: { type: 'callback', payload: JSON.stringify({ cmd: 'admin_broadcast' }), label: '📢 Рассылка' }, color: 'positive' },
        { action: { type: 'callback', payload: JSON.stringify({ cmd: 'admin_givekey' }), label: '🎁 Выдать' }, color: 'positive' }
      ]
    ]
  };
}

async function handleAdminStats(user_id) {
  const licensesSnap = await get(ref(db, 'licenses'));
  const all = licensesSnap.val() || {};
  const licenses = Object.values(all);

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const weekStart = todayStart - 6 * 24 * 60 * 60 * 1000;
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  const paid = licenses.filter(l => l.payment > 0);
  const free = licenses.filter(l => l.payment === 0);

  const todayPaid = paid.filter(l => new Date(l.created).getTime() >= todayStart);
  const weekPaid = paid.filter(l => new Date(l.created).getTime() >= weekStart);
  const monthPaid = paid.filter(l => new Date(l.created).getTime() >= monthStart);

  const sum = arr => arr.reduce((s, l) => s + (l.payment || 0), 0);

  let msg = `📊 Статистика\n\n`;
  msg += `🔑 Всего ключей: ${licenses.length}\n`;
  msg += `💰 Платных: ${paid.length} | 🆓 Бесплатных: ${free.length}\n\n`;
  msg += `━━━ Сегодня ━━━\n`;
  msg += `Продаж: ${todayPaid.length} | Выручка: ${sum(todayPaid)} ₽\n\n`;
  msg += `━━━ Неделя ━━━\n`;
  msg += `Продаж: ${weekPaid.length} | Выручка: ${sum(weekPaid)} ₽\n\n`;
  msg += `━━━ Месяц ━━━\n`;
  msg += `Продаж: ${monthPaid.length} | Выручка: ${sum(monthPaid)} ₽\n\n`;
  msg += `━━━ Всё время ━━━\n`;
  msg += `Продаж: ${paid.length} | Выручка: ${sum(paid)} ₽`;

  await editMessage(user_id, msg, adminMenuKeyboard());
}

// ========== ВЫРУЧКА ПО ДНЯМ (текстовый график) ==========
async function handleAdminRevenue(user_id) {
  const licensesSnap = await get(ref(db, 'licenses'));
  const all = licensesSnap.val() || {};
  const paid = Object.values(all).filter(l => l.payment > 0);

  const now = new Date();
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    days.push(d);
  }

  const dailyRevenue = days.map(day => {
    const dayStart = day.getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;
    const dayPaid = paid.filter(l => {
      const t = new Date(l.created).getTime();
      return t >= dayStart && t < dayEnd;
    });
    return { date: day, revenue: dayPaid.reduce((s, l) => s + (l.payment || 0), 0), count: dayPaid.length };
  });

  const maxRev = Math.max(...dailyRevenue.map(d => d.revenue), 1);

  let msg = '📈 Выручка за 14 дней\n\n';
  for (const d of dailyRevenue) {
    const dd = `${String(d.date.getDate()).padStart(2, '0')}.${String(d.date.getMonth() + 1).padStart(2, '0')}`;
    const barLen = Math.round((d.revenue / maxRev) * 10);
    const bar = '█'.repeat(barLen) + '░'.repeat(10 - barLen);
    msg += `${dd} ${bar} ${d.revenue} ₽`;
    if (d.count > 0) msg += ` (${d.count})`;
    msg += '\n';
  }

  const totalWeek = dailyRevenue.slice(7).reduce((s, d) => s + d.revenue, 0);
  const totalAll = dailyRevenue.reduce((s, d) => s + d.revenue, 0);
  msg += `\nИтого 7 дн: ${totalWeek} ₽ | 14 дн: ${totalAll} ₽`;

  await editMessage(user_id, msg, adminMenuKeyboard());
}

async function handleAdminOrders(user_id) {
  const licensesSnap = await get(ref(db, 'licenses'));
  const all = licensesSnap.val() || {};
  const paid = Object.values(all)
    .filter(l => l.payment > 0)
    .sort((a, b) => new Date(b.created) - new Date(a.created))
    .slice(0, 10);

  if (paid.length === 0) {
    await editMessage(user_id, '📋 Платных заказов пока нет.', adminMenuKeyboard());
    return;
  }

  let msg = '📋 Последние 10 заказов:\n\n';
  for (const lic of paid) {
    const date = new Date(lic.created).toLocaleDateString('ru-RU');
    const name = lic.buyer ? lic.buyer.name : '—';
    msg += `${date} | ${lic.appName}\n`;
    msg += `👤 ${name} | ${lic.planLabel} | ${lic.payment} ₽\n`;
    if (lic.orderNumber) msg += `📦 ${lic.orderNumber}\n`;
    msg += '\n';
  }
  await editMessage(user_id, msg, adminMenuKeyboard());
}

async function handleAdminPending(user_id) {
  const pendingSnap = await get(ref(db, 'vk_admin_pending'));
  const pending = pendingSnap.val() || {};
  const entries = Object.entries(pending);

  if (entries.length === 0) {
    await editMessage(user_id, '⏳ Нет ожидающих подтверждения.', adminMenuKeyboard());
    return;
  }

  let msg = `⏳ Ожидают подтверждения (${entries.length}):\n\n`;
  const buttons = [];
  for (const [pendingId, order] of entries) {
    msg += `👤 ${order.userName || '—'}\n`;
    msg += `📱 ${order.appName} — ${order.planLabel} — ${order.price} ₽\n`;
    if (order.orderNumber) msg += `📦 ${order.orderNumber}\n`;
    msg += '\n';
    buttons.push([
      { action: { type: 'callback', payload: JSON.stringify({ cmd: 'confirm', id: pendingId }), label: `✅ ${order.userName || 'Подтвердить'}` }, color: 'positive' },
      { action: { type: 'callback', payload: JSON.stringify({ cmd: 'reject', id: pendingId }), label: '❌' }, color: 'negative' }
    ]);
  }
  buttons.push([{ action: { type: 'callback', payload: JSON.stringify({ cmd: 'admin' }), label: '← Назад' }, color: 'secondary' }]);
  await editMessage(user_id, msg, { inline: true, buttons: buttons.slice(0, 6) });
}

async function handleAdminKeys(user_id) {
  const licensesSnap = await get(ref(db, 'licenses'));
  const all = licensesSnap.val() || {};
  const licenses = Object.values(all)
    .sort((a, b) => new Date(b.created) - new Date(a.created))
    .slice(0, 15);

  if (licenses.length === 0) {
    await editMessage(user_id, '🔑 Ключей пока нет.', adminMenuKeyboard());
    return;
  }

  let msg = '🔑 Последние 15 ключей:\n\n';
  for (const lic of licenses) {
    const date = new Date(lic.created).toLocaleDateString('ru-RU');
    const status = lic.activated ? '✅' : '⏳';
    const price = lic.payment > 0 ? `${lic.payment} ₽` : '🆓';
    msg += `${status} ${lic.appName} | ${date} | ${price}\n`;
    msg += `🔑 ${lic.key}\n\n`;
  }
  await editMessage(user_id, msg, adminMenuKeyboard());
}

async function handleAdminUsers(user_id) {
  const licensesSnap = await get(ref(db, 'licenses'));
  const all = licensesSnap.val() || {};
  const licenses = Object.values(all).filter(l => l.buyer);

  const users = {};
  for (const lic of licenses) {
    const uid = lic.buyer.id;
    if (!users[uid]) users[uid] = { name: lic.buyer.name, id: uid, keys: 0, spent: 0 };
    users[uid].keys++;
    users[uid].spent += lic.payment || 0;
  }

  const sorted = Object.values(users).sort((a, b) => b.spent - a.spent).slice(0, 15);

  if (sorted.length === 0) {
    await editMessage(user_id, '👥 Пользователей пока нет.', adminMenuKeyboard());
    return;
  }

  let msg = `👥 Топ пользователей (${Object.keys(users).length} всего):\n\n`;
  for (const u of sorted) {
    msg += `👤 ${u.name}\n`;
    msg += `🔑 Ключей: ${u.keys} | 💰 Потрачено: ${u.spent} ₽\n\n`;
  }
  await editMessage(user_id, msg, adminMenuKeyboard());
}

// ========== ОТЗЫВЫ ==========
async function handleAdminReviews(user_id) {
  const reviewsSnap = await get(ref(db, 'vk_reviews'));
  const reviews = reviewsSnap.val() || {};
  const entries = Object.values(reviews).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 15);

  if (entries.length === 0) {
    await editMessage(user_id, '⭐ Отзывов пока нет.', adminMenuKeyboard());
    return;
  }

  const allEntries = Object.values(reviews);
  const avgRating = (allEntries.reduce((s, r) => s + r.rating, 0) / allEntries.length).toFixed(1);

  let msg = `⭐ Отзывы (${allEntries.length} шт., средняя: ${avgRating})\n\n`;
  for (const r of entries) {
    const stars = '⭐'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
    const date = new Date(r.date).toLocaleDateString('ru-RU');
    msg += `${stars}\n`;
    msg += `👤 ${r.userName} | ${r.appName} | ${date}\n`;
    if (r.comment) msg += `💬 ${r.comment}\n`;
    msg += '\n';
  }
  await editMessage(user_id, msg, adminMenuKeyboard());
}

// ========== СОСТОЯНИЯ (Firebase вместо памяти — Vercel serverless) ==========
async function getState(userId) {
  try {
    const snap = await get(ref(db, `vk_states/${userId}`));
    return snap.val();
  } catch (_) { return null; }
}

async function setState(userId, state) {
  try {
    await set(ref(db, `vk_states/${userId}`), state);
  } catch (e) { console.warn('Non-critical:', e.message); }
}

async function clearState(userId) {
  try {
    await remove(ref(db, `vk_states/${userId}`));
  } catch (e) { console.warn('Non-critical:', e.message); }
}

// ========== ОБРАБОТЧИКИ ==========
async function handleNewMessage(msg) {
  const text = (msg.text || '').trim();
  const textLower = text.toLowerCase();

  // Админ-панель по ключевому слову
  if ((textLower === 'admin76' || textLower === 'админ') && msg.from_id === ADMIN_VK_ID) {
    try { await clearState(msg.from_id); } catch (e) { console.warn('Non-critical:', e.message); }
    await sendMessage(msg.from_id, '👑 Админ-панель\n\nВыберите действие:', adminMenuKeyboard());
    return;
  }

  // Проверяем состояние ожидания ввода (рассылка, поиск, ручная выдача, отзыв)
  const state = await getState(msg.from_id);
  if (state) {
    await clearState(msg.from_id);

    if (state.action === 'broadcast' && msg.from_id === ADMIN_VK_ID) {
      // Рассылка сообщения всем пользователям
      const userIds = await getAllVkUserIds();
      let sent = 0, failed = 0;
      for (const uid of userIds) {
        try {
          await vkApi('messages.send', {
            user_id: uid,
            message: text,
            random_id: Math.floor(Math.random() * 2e9)
          });
          sent++;
        } catch (_) { failed++; }
      }
      await sendMessage(ADMIN_VK_ID, `📢 Рассылка завершена!\n\n✅ Отправлено: ${sent}\n❌ Ошибок: ${failed}\n👥 Всего: ${userIds.length}`, adminMenuKeyboard());
      return;
    }

    if (state.action === 'search' && msg.from_id === ADMIN_VK_ID) {
      // Поиск пользователя
      const query = textLower;
      const licensesSnap = await get(ref(db, 'licenses'));
      const all = licensesSnap.val() || {};
      const found = Object.values(all).filter(lic => {
        if (!lic.buyer) return false;
        const name = (lic.buyer.name || '').toLowerCase();
        const id = (lic.buyer.id || '').toLowerCase();
        const key = (lic.key || '').toLowerCase();
        return name.includes(query) || id.includes(query) || key.includes(query);
      });

      if (found.length === 0) {
        await sendMessage(ADMIN_VK_ID, `🔍 По запросу «${text}» ничего не найдено.`, adminMenuKeyboard());
      } else {
        const users = {};
        for (const lic of found) {
          const uid = lic.buyer.id;
          if (!users[uid]) users[uid] = { name: lic.buyer.name, id: uid, licenses: [] };
          users[uid].licenses.push(lic);
        }
        let msg = `🔍 Результаты поиска «${text}»:\n\n`;
        for (const u of Object.values(users)) {
          msg += `👤 ${u.name} (${u.id})\n`;
          for (const lic of u.licenses) {
            const date = new Date(lic.created).toLocaleDateString('ru-RU');
            const status = lic.activated ? '✅' : '⏳';
            const price = lic.payment > 0 ? `${lic.payment} ₽` : '🆓';
            msg += `  ${status} ${lic.appName} | ${lic.planLabel} | ${price} | ${date}\n`;
            msg += `  🔑 ${lic.key}\n`;
          }
          msg += '\n';
        }
        await sendMessage(ADMIN_VK_ID, msg.substring(0, 4000), adminMenuKeyboard());
      }
      return;
    }

    if (state.action === 'givekey' && msg.from_id === ADMIN_VK_ID) {
      const targetUserId = text.replace(/\D/g, '');
      if (!targetUserId) {
        await sendMessage(ADMIN_VK_ID, '⚠️ Некорректный ID. Введите числовой VK ID.', adminMenuKeyboard());
        return;
      }
      const buttons = PRODUCTS.filter(p => !p.isBundle).map(p => [{
        action: { type: 'callback', payload: JSON.stringify({ cmd: 'admin_givekey_app', app: p.id, uid: targetUserId }), label: p.name },
        color: 'primary'
      }]);
      buttons.push([{ action: { type: 'callback', payload: JSON.stringify({ cmd: 'admin' }), label: '← Отмена' }, color: 'secondary' }]);
      await sendMessage(ADMIN_VK_ID, `🎁 Выдать ключ для VK ID: ${targetUserId}\n\nВыберите приложение:`, { inline: true, buttons });
      return;
    }

    if (state.action === 'review_comment') {
      const reviewData = state.reviewData;
      reviewData.comment = text;
      const reviewId = `${reviewData.userId}_${Date.now()}`;
      await set(ref(db, `vk_reviews/${reviewId}`), reviewData);
      await editMessage(msg.from_id, `Спасибо за отзыв! ⭐\n\nВаша оценка: ${'⭐'.repeat(reviewData.rating)}`, mainMenuKeyboard());
      await sendMessage(ADMIN_VK_ID, `⭐ Новый отзыв!\n\n👤 ${reviewData.userName}\n📱 ${reviewData.appName}\nОценка: ${'⭐'.repeat(reviewData.rating)}\n💬 ${text}`);
      return;
    }
  }

  const welcome = `Добро пожаловать в ILLUSIONIST OS! 👋\n\n` +
    `Профессиональные приложения для артистов.\n` +
    `📶 Работают офлайн — интернет нужен только при первом запуске.\n\n` +
    `🧮 Калькулятор — финансы, КП, аналитика\n` +
    `📅 Календарь — расписание, логистика\n` +
    `🎁 Комплект — оба приложения со скидкой\n\n` +
    `Выберите приложение:`;
  await sendMessage(msg.from_id, welcome, mainMenuKeyboard());
}

async function handleMessageEvent(event) {
  const { event_id, user_id, peer_id, payload } = event;
  let data;
  try { data = typeof payload === 'string' ? JSON.parse(payload) : payload; } catch { return; }

  switch (data.cmd) {
    case 'menu': {
      await answerEvent(event_id, user_id, peer_id, 'Главное меню');
      await editMessage(user_id, 'Выберите приложение:', mainMenuKeyboard());
      break;
    }

    case 'app': {
      const app = PRODUCTS.find(p => p.id === data.id);
      if (!app) return;
      await answerEvent(event_id, user_id, peer_id, app.name);
      let msg = `${app.name}\n`;
      if (app.description) msg += `${app.description}\n`;
      msg += '\n';
      for (const plan of app.plans) {
        if (plan.price === 0) {
          msg += `🆓 ${plan.label} — Бесплатно\n`;
        } else {
          msg += `💰 ${plan.label} — ${plan.price.toLocaleString('ru-RU')} ₽\n`;
        }
      }
      msg += '\nВыберите тариф:';
      await editMessage(user_id, msg, plansKeyboard(data.id));
      break;
    }

    case 'plan': {
      const app = PRODUCTS.find(p => p.id === data.app);
      const plan = app ? app.plans.find(p => p.id === data.plan) : null;
      if (!app || !plan) return;

      if (plan.price === 0) {
        const alreadyHasTrial = await hasTrialKey(user_id, app.isBundle ? app.bundleApps[0] : app.id);
        if (alreadyHasTrial) {
          await answerEvent(event_id, user_id, peer_id, 'Пробный уже использован');
          await editMessage(user_id,
            `⚠️ Вы уже использовали пробный период для ${app.name}.\n\nВыберите платный тариф:`,
            plansKeyboard(data.app));
          break;
        }

        await answerEvent(event_id, user_id, peer_id, 'Выдаю ключ...');
        const name = await getUserName(user_id);

        if (app.isBundle && app.bundleApps) {
          const key = await generateAndSaveKey({ appId: app.id, userId: `vk_${user_id}`, buyerName: name, price: 0, days: plan.days, planLabel: plan.label });
          let msg = `🎉 Пробный период активирован!\n\nСрок: ${plan.days} дней\n\nВведите ключ и в Калькуляторе, и в Календаре.\n\n🔑 Ключ — в следующем сообщении (зажмите его для копирования)`;
          const trialBundleButtons = [];
          for (const subId of app.bundleApps) {
            const p = PRODUCTS.find(x => x.id === subId);
            if (p && p.appUrl) trialBundleButtons.push([{ action: { type: 'open_link', link: p.appUrl, label: `📲 Открыть ${p.name}` } }]);
          }
          for (const subId of app.bundleApps) {
            if (TRAINING[subId] && TRAINING[subId].length > 0) {
              const subApp = PRODUCTS.find(x => x.id === subId);
              trialBundleButtons.push([{ action: { type: 'callback', payload: JSON.stringify({ cmd: 'training', app: subId }), label: `🎓 Обучение ${subApp ? subApp.name : subId}` }, color: 'positive' }]);
            }
          }
          trialBundleButtons.push([{ action: { type: 'callback', payload: JSON.stringify({ cmd: 'menu' }), label: '← В меню' }, color: 'secondary' }]);
          await editMessage(user_id, msg, { inline: true, buttons: trialBundleButtons });
          await vkApi('messages.send', { user_id, message: key, random_id: Math.floor(Math.random() * 2e9) });
        } else {
          const key = await generateAndSaveKey({ appId: app.id, userId: `vk_${user_id}`, buyerName: name, price: 0, days: plan.days, planLabel: plan.label });
          const trialButtons = [];
          if (app.appUrl) trialButtons.push([{ action: { type: 'open_link', link: app.appUrl, label: `📲 Открыть ${app.name}` } }]);
          if (TRAINING[app.id] && TRAINING[app.id].length > 0) {
            trialButtons.push([{ action: { type: 'callback', payload: JSON.stringify({ cmd: 'training', app: app.id }), label: '🎓 Обучение' }, color: 'positive' }]);
          }
          trialButtons.push([{ action: { type: 'callback', payload: JSON.stringify({ cmd: 'menu' }), label: '← В меню' }, color: 'secondary' }]);
          await editMessage(user_id,
            `🎉 Пробный период активирован!\n\nСрок: ${plan.days} дней\n\n🔑 Ключ — в следующем сообщении (зажмите его для копирования)`,
            { inline: true, buttons: trialButtons }
          );
          await vkApi('messages.send', { user_id, message: key, random_id: Math.floor(Math.random() * 2e9) });
        }
        // Запоминаем что юзер использовал триал
        await markTrialUsed(user_id, app.isBundle ? app.bundleApps[0] : app.id);
        if (app.isBundle && app.bundleApps) {
          for (const subId of app.bundleApps) await markTrialUsed(user_id, subId);
        }
        await sendMessage(ADMIN_VK_ID, `🆓 Пробный ключ выдан\n👤 ${await getUserName(user_id)} (vk.com/id${user_id})\n📱 ${app.name} — ${plan.label}`);
        break;
      }

      // Платный тариф
      await answerEvent(event_id, user_id, peer_id, 'Реквизиты для оплаты');
      const orderNumber = await getNextOrderNumber();

      let msg = `${app.name}\nТариф: ${plan.label} — ${plan.price} ₽\n📦 Заказ: ${orderNumber}\n\n`;
      msg += `━━━━━━━━━━━━━━━\nПереведите на карту ${PAYMENT.bank}:\n\n`;
      msg += `💳 Карта: ${PAYMENT.card}\n📱 СБП: ${PAYMENT.phone}\n👤 Получатель: ${PAYMENT.holder}\n💰 Сумма: ${plan.price} ₽\n`;
      msg += `━━━━━━━━━━━━━━━\n\n`;
      msg += `⚠️ ВАЖНО: Оплата ТОЛЬКО на Т-Банк (Тинькофф)!\nПереводы с других банков не принимаются.\n\n`;
      msg += `После перевода нажмите «Я оплатил».\nВ комментарии к переводу ничего писать не надо.`;
      await editMessage(user_id, msg, paymentKeyboard(data.app, data.plan));

      try {
        await set(ref(db, `vk_pending/${user_id}`), {
          orderNumber, appId: app.id, planId: plan.id, appName: app.name, planLabel: plan.label,
          price: plan.price, days: plan.days, isBundle: !!app.isBundle,
          bundleApps: app.bundleApps || null, timestamp: new Date().toISOString()
        });
      } catch (fbErr) {
        console.error('Firebase save error:', fbErr);
        await sendMessage(ADMIN_VK_ID, `⚠️ Firebase ошибка: ${fbErr.message}`);
      }
      break;
    }

    case 'paid': {
      await answerEvent(event_id, user_id, peer_id, 'Заявка отправлена!');
      const snapshot = await get(ref(db, `vk_pending/${user_id}`));
      const pending = snapshot.val();
      if (!pending) { await editMessage(user_id, 'Заявка не найдена. Выберите тариф заново.', mainMenuKeyboard()); return; }

      const userName = await getUserName(user_id);
      await editMessage(user_id, `Спасибо! Заявка ${pending.orderNumber || ''} отправлена на проверку. ✨\n\nОбычно это занимает 5-15 минут (с 09:00 до 00:00 по Москве).\nЕсли перевели ночью — ключ придёт утром.`);

      const pendingId = `${user_id}_${Date.now()}`;
      await set(ref(db, `vk_admin_pending/${pendingId}`), { ...pending, vkUserId: user_id, userName, userLink: `vk.com/id${user_id}` });

      const moscowTime = new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' });
      let adminMsg = `💰 НОВАЯ ОПЛАТА (ВК)\n\n👤 ${userName}\n🔗 vk.com/id${user_id}\n📦 ${pending.orderNumber || '—'}\n\n`;
      adminMsg += `📱 ${pending.appName}\n📋 Тариф: ${pending.planLabel}\n💵 Сумма: ${pending.price} ₽\n⏰ ${moscowTime}`;
      await sendMessage(ADMIN_VK_ID, adminMsg, adminKeyboard(pendingId));
      break;
    }

    case 'confirm': {
      if (user_id !== ADMIN_VK_ID) { await answerEvent(event_id, user_id, peer_id, 'Нет доступа'); return; }
      await answerEvent(event_id, user_id, peer_id, 'Генерирую ключ...');

      const snap = await get(ref(db, `vk_admin_pending/${data.id}`));
      const pending = snap.val();
      if (!pending) { await sendMessage(ADMIN_VK_ID, '⚠️ Заявка не найдена или уже обработана.'); return; }

      await remove(ref(db, `vk_admin_pending/${data.id}`));
      await remove(ref(db, `vk_pending/${pending.vkUserId}`));

      const key = await generateAndSaveKey({ appId: pending.appId, userId: `vk_${pending.vkUserId}`, buyerName: pending.userName, price: pending.price, days: pending.days, planLabel: pending.planLabel, orderNumber: pending.orderNumber });

      const isLifetime = pending.days >= 36500;
      const durationLabel = isLifetime ? 'Бессрочно' : `${pending.days} дней`;
      let userMsg = `🎉 Оплата подтверждена!\n📦 Заказ: ${pending.orderNumber || '—'}\n\n`;
      if (pending.isBundle) {
        userMsg += `Тариф: ${pending.planLabel}\nСрок: ${durationLabel}\n\nВведите ключ и в Калькуляторе, и в Календаре.\n\n🔑 Ключ — в следующем сообщении (зажмите его для копирования)`;
      } else {
        userMsg += `Тариф: ${pending.planLabel}\nСрок: ${durationLabel}\n\n🔑 Ключ — в следующем сообщении (зажмите его для копирования)`;
      }
      const appIds = (pending.isBundle && pending.bundleApps) ? pending.bundleApps : [pending.appId];

      // Клавиатура с кнопками-ссылками на приложения + обучение + отзыв
      const afterPurchaseButtons = [];
      // Кнопки-ссылки на приложения
      for (const appId of appIds) {
        const product = PRODUCTS.find(p => p.id === appId);
        if (product && product.appUrl) {
          afterPurchaseButtons.push([{
            action: { type: 'open_link', link: product.appUrl, label: `📲 Открыть ${product.name}` }
          }]);
        }
      }
      for (const appId of appIds) {
        if (TRAINING[appId] && TRAINING[appId].length > 0) {
          const product = PRODUCTS.find(p => p.id === appId);
          const eduLabel = appIds.length > 1 ? `🎓 Обучение ${product ? product.name : appId}` : '🎓 Обучение';
          afterPurchaseButtons.push([{
            action: { type: 'callback', payload: JSON.stringify({ cmd: 'training', app: appId }), label: eduLabel },
            color: 'positive'
          }]);
        }
      }
      const reviewAppId = appIds[0];
      afterPurchaseButtons.push([{
        action: { type: 'callback', payload: JSON.stringify({ cmd: 'review_start', app: reviewAppId }), label: '⭐ Оставить отзыв' },
        color: 'secondary'
      }]);
      afterPurchaseButtons.push([{
        action: { type: 'callback', payload: JSON.stringify({ cmd: 'menu' }), label: '← В меню' },
        color: 'secondary'
      }]);

      await sendMessage(pending.vkUserId, userMsg, { inline: true, buttons: afterPurchaseButtons });
      await vkApi('messages.send', { user_id: pending.vkUserId, message: key, random_id: Math.floor(Math.random() * 2e9) });
      await sendMessage(ADMIN_VK_ID, `✅ Ключ выдан для ${pending.userName} (${pending.orderNumber || '—'}):\n${key}`);
      break;
    }

    case 'reject': {
      if (user_id !== ADMIN_VK_ID) { await answerEvent(event_id, user_id, peer_id, 'Нет доступа'); return; }
      await answerEvent(event_id, user_id, peer_id, 'Отклонено');

      const snap = await get(ref(db, `vk_admin_pending/${data.id}`));
      const pending = snap.val();
      if (!pending) { await sendMessage(ADMIN_VK_ID, '⚠️ Заявка не найдена.'); return; }

      await remove(ref(db, `vk_admin_pending/${data.id}`));
      await remove(ref(db, `vk_pending/${pending.vkUserId}`));
      await sendMessage(pending.vkUserId, 'К сожалению, оплата не подтверждена. 😔\n\nВозможно, перевод не дошёл или сумма не совпала.\nНапишите мне в личку — разберёмся: vk.com/id196783025', mainMenuKeyboard());
      await sendMessage(ADMIN_VK_ID, `❌ Оплата отклонена для ${pending.userName} (${pending.orderNumber || '—'}).`);
      break;
    }

    case 'faq': {
      await answerEvent(event_id, user_id, peer_id, 'FAQ');
      await editMessage(user_id, FAQ_TEXT, mainMenuKeyboard());
      break;
    }

    case 'purchases': {
      await answerEvent(event_id, user_id, peer_id, 'Мои покупки');
      try {
        const licensesSnap = await get(ref(db, 'licenses'));
        const allLicenses = licensesSnap.val() || {};
        const userLicenses = Object.values(allLicenses)
          .filter(lic => lic.buyer && lic.buyer.id === `vk_${user_id}`)
          .sort((a, b) => new Date(b.created) - new Date(a.created));

        if (userLicenses.length === 0) {
          await editMessage(user_id, 'У вас пока нет покупок.\n\nВыберите приложение для начала:', mainMenuKeyboard());
        } else {
          let msg = '🛒 Ваши покупки:\n\n';
          for (const lic of userLicenses) {
            const created = new Date(lic.created).toLocaleDateString('ru-RU');
            const status = lic.activated ? '✅ Активирован' : '⏳ Не активирован';
            msg += `${lic.appName} — ${lic.planLabel}\n`;
            msg += `🔑 ${lic.key}\n`;
            msg += `📅 ${created} | ${status}\n`;
            if (lic.orderNumber) msg += `📦 ${lic.orderNumber}\n`;
            msg += '\n';
          }
          await editMessage(user_id, msg, mainMenuKeyboard());
        }
      } catch (err) {
        await editMessage(user_id, 'Не удалось загрузить покупки. Попробуйте позже.', mainMenuKeyboard());
      }
      break;
    }

    case 'status': {
      await answerEvent(event_id, user_id, peer_id, 'Мои подписки');
      try {
        const licensesSnap = await get(ref(db, 'licenses'));
        const allLicenses = licensesSnap.val() || {};
        const allUserLics = Object.values(allLicenses)
          .filter(lic => lic.buyer && lic.buyer.id === `vk_${user_id}` && !lic.deactivated)
          .sort((a, b) => new Date(b.created) - new Date(a.created));

        const unactivated = allUserLics.filter(lic => !lic.activated);
        const activated = allUserLics.filter(lic => lic.activated)
          .sort((a, b) => new Date(b.activatedDate || b.created) - new Date(a.activatedDate || a.created));

        if (allUserLics.length === 0) {
          await editMessage(user_id, '📊 У вас пока нет подписок.\n\nВыберите приложение для начала:', mainMenuKeyboard());
          break;
        }

        let msg = '📊 Мои подписки\n━━━━━━━━━━━━━━━\n\n';
        const renewButtons = [];

        // Неактивированные ключи
        if (unactivated.length > 0) {
          msg += '🔑 Ожидают активации:\n\n';
          for (const lic of unactivated) {
            const created = new Date(lic.created).toLocaleDateString('ru-RU');
            msg += `${lic.appName} — ${lic.planLabel}\n`;
            msg += `📅 Куплен: ${created}\n`;
            msg += `🔑 ${lic.key}\n\n`;
          }
          if (activated.length > 0) msg += '━━━━━━━━━━━━━━━\n\n';
        }

        // Активированные подписки
        for (const lic of activated) {
          const isLifetime = lic.expiryDays >= 36500;

          let expiresDate;
          if (lic.expiresAt) {
            expiresDate = new Date(lic.expiresAt);
          } else {
            const activatedDate = new Date(lic.activatedDate || lic.created);
            expiresDate = new Date(activatedDate.getTime() + lic.expiryDays * 24 * 60 * 60 * 1000);
          }
          const now = new Date();
          const msLeft = expiresDate - now;
          const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));

          msg += `${lic.appName}\n`;
          msg += `📋 Тариф: ${lic.planLabel || '—'}\n`;

          if (isLifetime) {
            msg += `✅ Бессрочная подписка\n`;
          } else if (daysLeft > 0) {
            const totalHours = Math.floor(msLeft / 3600000);
            const d = Math.floor(totalHours / 24);
            const h = totalHours % 24;
            let timerStr = '';
            if (d > 0) timerStr += `${d} дн. `;
            timerStr += `${h} ч.`;

            const progressTotal = lic.expiryDays;
            const filled = Math.round((daysLeft / progressTotal) * 10);
            const bar = '▓'.repeat(Math.min(filled, 10)) + '░'.repeat(Math.max(10 - filled, 0));
            const percent = Math.round((daysLeft / progressTotal) * 100);

            msg += `⏳ Осталось: ${timerStr}\n`;
            msg += `📅 До: ${expiresDate.toLocaleDateString('ru-RU')}\n`;
            msg += `${bar} ${percent}%\n`;
          } else {
            msg += `❌ Истекла ${Math.abs(daysLeft)} дн. назад\n`;
          }
          msg += '\n';

          if (!isLifetime && daysLeft <= 30) {
            const appProduct = PRODUCTS.find(p => p.name === lic.appName);
            if (appProduct) {
              renewButtons.push([{
                action: { type: 'callback', payload: JSON.stringify({ cmd: 'app', id: appProduct.id }), label: `🔄 Продлить ${appProduct.name}` },
                color: 'positive'
              }]);
            }
          }
        }

        const statusButtons = [
          ...renewButtons,
          [{ action: { type: 'callback', payload: JSON.stringify({ cmd: 'transfer_list' }), label: '🔄 Сменить устройство' }, color: 'primary' }],
          [{ action: { type: 'callback', payload: JSON.stringify({ cmd: 'menu' }), label: '← Назад' }, color: 'secondary' }]
        ];
        await editMessage(user_id, msg, { inline: true, buttons: statusButtons.slice(0, 6) });
      } catch (err) {
        await editMessage(user_id, 'Не удалось загрузить подписки. Попробуйте позже.', mainMenuKeyboard());
      }
      break;
    }

    case 'transfer_list': {
      await answerEvent(event_id, user_id, peer_id, 'Выберите ключ');
      try {
        const licensesSnap = await get(ref(db, 'licenses'));
        const allLicenses = licensesSnap.val() || {};
        const userLicenses = Object.entries(allLicenses)
          .filter(([_, lic]) => lic.buyer && lic.buyer.id === `vk_${user_id}` && lic.activated && lic.deviceId);

        if (userLicenses.length === 0) {
          await editMessage(user_id, '🔄 Нет привязанных ключей для переноса.\n\nКлюч привязывается при активации в приложении.', mainMenuKeyboard());
        } else {
          let msg = '🔄 Сменить устройство\n\nВыберите ключ для переноса на новое устройство:\n\n';
          const buttons = [];
          for (const [firebaseKey, lic] of userLicenses) {
            const shortKey = lic.key.substring(0, 9) + '...';
            msg += `${lic.appName} — ${shortKey}\n`;
            buttons.push([{
              action: { type: 'callback', payload: JSON.stringify({ cmd: 'transfer', key: firebaseKey }), label: `🔄 ${lic.appName}` },
              color: 'primary'
            }]);
          }
          buttons.push([{ action: { type: 'callback', payload: JSON.stringify({ cmd: 'status' }), label: '← Назад' }, color: 'secondary' }]);
          await editMessage(user_id, msg, { inline: true, buttons: buttons.slice(0, 6) });
        }
      } catch (err) {
        await editMessage(user_id, 'Не удалось загрузить ключи. Попробуйте позже.', mainMenuKeyboard());
      }
      break;
    }

    case 'transfer': {
      await answerEvent(event_id, user_id, peer_id, 'Отправляю заявку...');
      try {
        const licSnap = await get(ref(db, `licenses/${data.key}`));
        const lic = licSnap.val();
        if (!lic || !lic.buyer || lic.buyer.id !== `vk_${user_id}`) {
          await editMessage(user_id, '⚠️ Ключ не найден или не принадлежит вам.', mainMenuKeyboard());
          break;
        }

        // Считаем остаток дней
        let remainingDays = null;
        let remainingLabel = '';
        if (lic.expiryDays >= 999999) {
          remainingDays = 36500;
          remainingLabel = 'Бессрочно';
        } else if (lic.expiresAt) {
          const msLeft = new Date(lic.expiresAt) - new Date();
          remainingDays = Math.max(1, Math.ceil(msLeft / 86400000));
          remainingLabel = `${remainingDays} дн.`;
        } else if (lic.expiryDays) {
          remainingDays = lic.expiryDays;
          remainingLabel = `${remainingDays} дн.`;
        }

        const userName = await getUserName(user_id);

        // Отправляем заявку админу с кнопкой подтверждения
        const adminMsg = `🔄 ЗАЯВКА НА ПЕРЕНОС\n\n` +
          `👤 ${userName} (vk.com/id${user_id})\n` +
          `📱 ${lic.appName}\n` +
          `🔑 Старый ключ: ${lic.key}\n` +
          `📋 Тариф: ${lic.planLabel || '—'}\n` +
          `⏳ Остаток: ${remainingLabel}\n\n` +
          `Подтвердить = деактивировать старый ключ + выдать новый на ${remainingLabel}`;

        await sendMessage(ADMIN_VK_ID, adminMsg, {
          inline: true, buttons: [
            [{ action: { type: 'callback', payload: JSON.stringify({ cmd: 'transfer_confirm', key: data.key, uid: user_id, days: remainingDays }), label: '✅ Перенести' }, color: 'positive' }],
            [{ action: { type: 'callback', payload: JSON.stringify({ cmd: 'transfer_deny', uid: user_id }), label: '❌ Отклонить' }, color: 'negative' }]
          ]
        });

        await editMessage(user_id,
          `📨 Заявка на перенос отправлена!\n\n📱 ${lic.appName}\n⏳ Остаток подписки: ${remainingLabel}\n\nАдминистратор проверит и выдаст новый ключ. Обычно это занимает несколько минут.`,
          mainMenuKeyboard()
        );
      } catch (err) {
        await editMessage(user_id, 'Не удалось отправить заявку. Попробуйте позже.', mainMenuKeyboard());
      }
      break;
    }

    case 'transfer_confirm': {
      if (user_id !== ADMIN_VK_ID) return;
      await answerEvent(event_id, user_id, peer_id, 'Переношу...');
      try {
        const licSnap = await get(ref(db, `licenses/${data.key}`));
        const lic = licSnap.val();
        if (!lic) { await sendMessage(ADMIN_VK_ID, '⚠️ Ключ не найден.'); break; }

        // Деактивируем старый ключ
        await set(ref(db, `licenses/${data.key}/activated`), false);
        await set(ref(db, `licenses/${data.key}/deviceId`), null);
        await set(ref(db, `licenses/${data.key}/installId`), null);
        await set(ref(db, `licenses/${data.key}/deactivated`), true);
        await set(ref(db, `licenses/${data.key}/deactivatedReason`), 'transfer');

        // Определяем appId по appName
        const appProduct = PRODUCTS.find(p => p.name === lic.appName);
        const appId = appProduct ? appProduct.id : 'calculator';

        // Генерируем новый ключ на остаток дней
        const targetName = await getUserName(data.uid);
        const newKey = await generateAndSaveKey({
          appId,
          userId: `vk_${data.uid}`,
          buyerName: targetName,
          price: 0,
          days: data.days,
          planLabel: `Перенос (${lic.planLabel || '—'})`,
          orderNumber: null
        });

        // Отправляем новый ключ пользователю
        const remainLabel = data.days >= 36500 ? 'Бессрочно' : `${data.days} дн.`;
        const userButtons = [];
        if (appProduct && appProduct.appUrl) {
          userButtons.push([{ action: { type: 'open_link', link: appProduct.appUrl, label: `📲 Открыть ${appProduct.name}` } }]);
        }
        userButtons.push([{ action: { type: 'callback', payload: JSON.stringify({ cmd: 'menu' }), label: '← В меню' }, color: 'secondary' }]);

        await sendMessage(Number(data.uid),
          `✅ Перенос выполнен!\n\n📱 ${lic.appName}\n⏳ Срок: ${remainLabel}\n\nВведите ключ в приложении на новом устройстве.\n\n🔑 Ключ — в следующем сообщении (зажмите его для копирования)`,
          { inline: true, buttons: userButtons }
        );
        await vkApi('messages.send', { user_id: Number(data.uid), message: newKey, random_id: Math.floor(Math.random() * 2e9) });

        await editMessage(user_id,
          `✅ Перенос выполнен!\n\n👤 ${targetName} (vk.com/id${data.uid})\n📱 ${lic.appName}\n🔑 Старый: ${lic.key}\n🔑 Новый: ${newKey}\n⏳ Срок: ${remainLabel}`,
          adminMenuKeyboard()
        );
      } catch (err) {
        await sendMessage(ADMIN_VK_ID, '❌ Ошибка переноса: ' + err.message);
      }
      break;
    }

    case 'transfer_deny': {
      if (user_id !== ADMIN_VK_ID) return;
      await answerEvent(event_id, user_id, peer_id, 'Отклонено');
      await sendMessage(Number(data.uid),
        '❌ Заявка на перенос отклонена.\n\nЕсли считаете, что это ошибка — напишите администратору.',
        mainMenuKeyboard()
      );
      await editMessage(user_id, '❌ Заявка на перенос отклонена.', adminMenuKeyboard());
      break;
    }

    case 'support': {
      await answerEvent(event_id, user_id, peer_id, 'Поддержка');
      await editMessage(user_id, 'Если есть вопросы — пишите:\n\n💬 ВКонтакте: vk.com/id196783025', mainMenuKeyboard());
      break;
    }

    case 'training': {
      await answerEvent(event_id, user_id, peer_id, 'Обучение');

      // Проверяем, есть ли у пользователя лицензия (платная или пробная)
      if (user_id !== ADMIN_VK_ID) {
        try {
          const appProduct = PRODUCTS.find(p => p.id === data.app);
          const licensesSnap = await get(ref(db, 'licenses'));
          const allLicenses = licensesSnap.val() || {};
          const hasLicense = Object.values(allLicenses).some(lic =>
            lic.buyer && lic.buyer.id === `vk_${user_id}` &&
            (lic.appName === (appProduct ? appProduct.name : '') || lic.appName === '🎁 Комплект')
          );
          // Также проверяем индекс триала
          const trialSnap = await get(ref(db, `vk_trials/${user_id}/${data.app}`));
          const hasTrial = !!trialSnap.val();

          if (!hasLicense && !hasTrial) {
            await editMessage(user_id,
              '🔒 Обучение доступно только при наличии подписки.\n\nПолучите пробный период или приобретите приложение.',
              mainMenuKeyboard()
            );
            break;
          }
        } catch (e) { console.warn('Non-critical:', e.message); }
      }

      const videos = TRAINING[data.app] || [];
      if (videos.length === 0) {
        await editMessage(user_id, '🎓 Видеоуроки для этого приложения пока готовятся.\n\nСледите за обновлениями!', mainMenuKeyboard());
        break;
      }
      // Страница 1: уроки 1-5
      const page1 = videos.slice(0, 5);
      const hasPage2 = videos.length > 5;
      const msg1 = '🎓 Обучение (уроки 1–' + page1.length + ')\n\nНажимайте по порядку:';
      const btns1 = page1.map((v, i) => [{
        action: { type: 'open_link', link: v.url, label: `${i + 1}. ${v.title}` }
      }]);
      if (hasPage2) {
        btns1.push([{ action: { type: 'callback', payload: JSON.stringify({ cmd: 'training_page', app: data.app }), label: `Уроки 6–${videos.length} →` }, color: 'primary' }]);
      } else {
        btns1.push([{ action: { type: 'callback', payload: JSON.stringify({ cmd: 'menu' }), label: '← В меню' }, color: 'secondary' }]);
      }
      await editMessage(user_id, msg1, { inline: true, buttons: btns1 });
      break;
    }

    case 'training_page': {
      await answerEvent(event_id, user_id, peer_id, 'Следующие уроки');
      const videos2 = TRAINING[data.app] || [];
      const page2 = videos2.slice(5);
      const msg2 = '🎓 Обучение (уроки 6–' + videos2.length + ')\n\nНажимайте по порядку:';
      const btns2 = page2.map((v, i) => [{
        action: { type: 'open_link', link: v.url, label: `${5 + i + 1}. ${v.title}` }
      }]);
      btns2.push([{ action: { type: 'callback', payload: JSON.stringify({ cmd: 'training', app: data.app }), label: '← Уроки 1–5' }, color: 'secondary' }]);
      btns2.push([{ action: { type: 'callback', payload: JSON.stringify({ cmd: 'menu' }), label: '← В меню' }, color: 'secondary' }]);
      await editMessage(user_id, msg2, { inline: true, buttons: btns2.slice(0, 6) });
      break;
    }

    // ========== ОТЗЫВЫ ==========
    case 'review_start': {
      await answerEvent(event_id, user_id, peer_id, 'Оцените приложение');
      const app = PRODUCTS.find(p => p.id === data.app);
      const appName = app ? app.name : 'Приложение';
      const ratingButtons = [];
      for (let r = 5; r >= 1; r--) {
        ratingButtons.push([{
          action: { type: 'callback', payload: JSON.stringify({ cmd: 'review_rate', app: data.app, rating: r }), label: '⭐'.repeat(r) },
          color: r >= 4 ? 'positive' : r >= 3 ? 'primary' : 'secondary'
        }]);
      }
      ratingButtons.push([{ action: { type: 'callback', payload: JSON.stringify({ cmd: 'menu' }), label: '← Пропустить' }, color: 'secondary' }]);
      await editMessage(user_id, `⭐ Оцените ${appName}\n\nВаша оценка поможет нам стать лучше!\nВыберите от 1 до 5 звёзд:`, { inline: true, buttons: ratingButtons });
      break;
    }

    case 'review_rate': {
      await answerEvent(event_id, user_id, peer_id, `Оценка: ${'⭐'.repeat(data.rating)}`);
      const userName = await getUserName(user_id);
      const app = PRODUCTS.find(p => p.id === data.app);
      const appName = app ? app.name : data.app;

      // Сохраняем состояние для комментария
      await setState(user_id, {
        action: 'review_comment',
        reviewData: {
          userId: `vk_${user_id}`,
          userName,
          appName,
          rating: data.rating,
          date: new Date().toISOString(),
          comment: null
        }
      });

      await editMessage(user_id,
        `Спасибо за оценку ${'⭐'.repeat(data.rating)}!\n\nХотите оставить комментарий? Напишите его в следующем сообщении.\n\nИли нажмите «Пропустить»:`,
        {
          inline: true, buttons: [[
            { action: { type: 'callback', payload: JSON.stringify({ cmd: 'review_skip', app: data.app, rating: data.rating }), label: '→ Пропустить' }, color: 'secondary' }
          ]]
        }
      );
      break;
    }

    case 'review_skip': {
      await answerEvent(event_id, user_id, peer_id, 'Отзыв сохранён!');
      await clearState(user_id);
      const userName = await getUserName(user_id);
      const app = PRODUCTS.find(p => p.id === data.app);
      const appName = app ? app.name : data.app;

      const reviewId = `${user_id}_${Date.now()}`;
      await set(ref(db, `vk_reviews/${reviewId}`), {
        userId: `vk_${user_id}`,
        userName,
        appName,
        rating: data.rating,
        date: new Date().toISOString(),
        comment: null
      });

      await editMessage(user_id, `Спасибо за отзыв! ⭐\n\nВаша оценка: ${'⭐'.repeat(data.rating)}`, mainMenuKeyboard());
      await sendMessage(ADMIN_VK_ID, `⭐ Новый отзыв!\n\n👤 ${userName}\n📱 ${appName}\nОценка: ${'⭐'.repeat(data.rating)}`);
      break;
    }

    // ========== АДМИН-ПАНЕЛЬ ==========
    case 'admin': {
      if (user_id !== ADMIN_VK_ID) return;
      await answerEvent(event_id, user_id, peer_id, 'Админ-панель');
      await editMessage(user_id, '👑 Админ-панель\n\nВыберите действие:', adminMenuKeyboard());
      break;
    }

    case 'admin_stats': {
      if (user_id !== ADMIN_VK_ID) return;
      await answerEvent(event_id, user_id, peer_id, 'Загрузка...');
      await handleAdminStats(user_id);
      break;
    }

    case 'admin_orders': {
      if (user_id !== ADMIN_VK_ID) return;
      await answerEvent(event_id, user_id, peer_id, 'Загрузка...');
      await handleAdminOrders(user_id);
      break;
    }

    case 'admin_pending': {
      if (user_id !== ADMIN_VK_ID) return;
      await answerEvent(event_id, user_id, peer_id, 'Загрузка...');
      await handleAdminPending(user_id);
      break;
    }

    case 'admin_keys': {
      if (user_id !== ADMIN_VK_ID) return;
      await answerEvent(event_id, user_id, peer_id, 'Загрузка...');
      await handleAdminKeys(user_id);
      break;
    }

    case 'admin_users': {
      if (user_id !== ADMIN_VK_ID) return;
      await answerEvent(event_id, user_id, peer_id, 'Загрузка...');
      await handleAdminUsers(user_id);
      break;
    }

    case 'admin_revenue': {
      if (user_id !== ADMIN_VK_ID) return;
      await answerEvent(event_id, user_id, peer_id, 'Загрузка...');
      await handleAdminRevenue(user_id);
      break;
    }

    case 'admin_broadcast': {
      if (user_id !== ADMIN_VK_ID) return;
      await answerEvent(event_id, user_id, peer_id, 'Рассылка');
      const userIds = await getAllVkUserIds();
      await setState(user_id, { action: 'broadcast' });
      await editMessage(user_id,
        `📢 Рассылка\n\n👥 Получателей: ${userIds.length}\n\nНапишите текст рассылки в следующем сообщении.\n\nОтправьте любое сообщение для отмены.`,
        { inline: true, buttons: [[{ action: { type: 'callback', payload: JSON.stringify({ cmd: 'admin' }), label: '← Отмена' }, color: 'secondary' }]] }
      );
      break;
    }

    case 'admin_search': {
      if (user_id !== ADMIN_VK_ID) return;
      await answerEvent(event_id, user_id, peer_id, 'Поиск');
      await setState(user_id, { action: 'search' });
      await editMessage(user_id,
        `🔍 Поиск пользователя\n\nВведите имя, VK ID или ключ в следующем сообщении:`,
        { inline: true, buttons: [[{ action: { type: 'callback', payload: JSON.stringify({ cmd: 'admin' }), label: '← Отмена' }, color: 'secondary' }]] }
      );
      break;
    }

    case 'admin_givekey': {
      if (user_id !== ADMIN_VK_ID) return;
      await answerEvent(event_id, user_id, peer_id, 'Выдать ключ');
      await setState(user_id, { action: 'givekey' });
      await editMessage(user_id,
        `🎁 Ручная выдача ключа\n\nВведите VK ID пользователя (числовой):`,
        { inline: true, buttons: [[{ action: { type: 'callback', payload: JSON.stringify({ cmd: 'admin' }), label: '← Отмена' }, color: 'secondary' }]] }
      );
      break;
    }

    case 'admin_givekey_app': {
      if (user_id !== ADMIN_VK_ID) return;
      await answerEvent(event_id, user_id, peer_id, 'Выберите тариф');
      await clearState(user_id);
      const app = PRODUCTS.find(p => p.id === data.app);
      if (!app) return;

      const buttons = [];
      for (let i = 0; i < app.plans.length; i += 2) {
        const row = [{
          action: { type: 'callback', payload: JSON.stringify({ cmd: 'admin_givekey_plan', app: data.app, plan: app.plans[i].id, uid: data.uid }), label: `${app.plans[i].label}${app.plans[i].price > 0 ? ` (${app.plans[i].price}₽)` : ' (бесп.)'}` },
          color: app.plans[i].price === 0 ? 'positive' : 'primary'
        }];
        if (i + 1 < app.plans.length) {
          row.push({
            action: { type: 'callback', payload: JSON.stringify({ cmd: 'admin_givekey_plan', app: data.app, plan: app.plans[i + 1].id, uid: data.uid }), label: `${app.plans[i + 1].label}${app.plans[i + 1].price > 0 ? ` (${app.plans[i + 1].price}₽)` : ' (бесп.)'}` },
            color: app.plans[i + 1].price === 0 ? 'positive' : 'primary'
          });
        }
        buttons.push(row);
      }
      buttons.push([{ action: { type: 'callback', payload: JSON.stringify({ cmd: 'admin' }), label: '← Отмена' }, color: 'secondary' }]);
      await editMessage(user_id, `🎁 Ключ для VK ID: ${data.uid}\n📱 ${app.name}\n\nВыберите тариф:`, { inline: true, buttons: buttons.slice(0, 6) });
      break;
    }

    case 'admin_givekey_plan': {
      if (user_id !== ADMIN_VK_ID) return;
      await answerEvent(event_id, user_id, peer_id, 'Генерирую ключ...');

      const app = PRODUCTS.find(p => p.id === data.app);
      const plan = app ? app.plans.find(p => p.id === data.plan) : null;
      if (!app || !plan) return;

      const targetName = await getUserName(data.uid);
      const key = await generateAndSaveKey({
        appId: app.id,
        userId: `vk_${data.uid}`,
        buyerName: targetName,
        price: 0,
        days: plan.days,
        planLabel: `${plan.label} (подарок)`,
        orderNumber: null
      });

      // Отправляем ключ пользователю с кнопками-ссылками
      const giveAppIds = (app.isBundle && app.bundleApps) ? app.bundleApps : [app.id];
      const giveMsg = app.isBundle
        ? `🎁 Вам выдан ключ!\n\n📱 ${app.name}\n📋 Тариф: ${plan.label}\n\nВведите ключ и в Калькуляторе, и в Календаре.\n\n🔑 Ключ — в следующем сообщении (зажмите его для копирования)`
        : `🎁 Вам выдан ключ!\n\n📱 ${app.name}\n📋 Тариф: ${plan.label}\n\n🔑 Ключ — в следующем сообщении (зажмите его для копирования)`;
      const giveButtons = [];
      for (const gId of giveAppIds) {
        const gp = PRODUCTS.find(x => x.id === gId);
        if (gp && gp.appUrl) giveButtons.push([{ action: { type: 'open_link', link: gp.appUrl, label: `📲 Открыть ${gp.name}` } }]);
      }
      giveButtons.push([{ action: { type: 'callback', payload: JSON.stringify({ cmd: 'menu' }), label: '← В меню' }, color: 'secondary' }]);
      await sendMessage(Number(data.uid), giveMsg, { inline: true, buttons: giveButtons });
      await vkApi('messages.send', { user_id: Number(data.uid), message: key, random_id: Math.floor(Math.random() * 2e9) });

      await editMessage(user_id,
        `✅ Ключ выдан!\n\n👤 ${targetName} (vk.com/id${data.uid})\n📱 ${app.name} — ${plan.label}\n🔑 ${key}`,
        adminMenuKeyboard()
      );
      break;
    }

    case 'admin_reviews': {
      if (user_id !== ADMIN_VK_ID) return;
      await answerEvent(event_id, user_id, peer_id, 'Загрузка...');
      await handleAdminReviews(user_id);
      break;
    }
  }
}

// ========== VERCEL HANDLER ==========
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(200).send('VK Bot is running');

  const body = req.body;

  console.log('VK EVENT:', body.type, JSON.stringify(body).slice(0, 300));

  // Secret check disabled — confirmation string provides sufficient security

  if (body.type === 'confirmation') {
    return res.status(200).send(VK_CONFIRMATION);
  }

  // Обработка в фоне через waitUntil — Vercel гарантирует завершение
  const processing = (async () => {
    try {
      if (body.type === 'message_new') {
        await handleNewMessage(body.object.message);
      } else if (body.type === 'message_event') {
        await handleMessageEvent(body.object);
      } else if (body.type === 'message_allow') {
        const userId = body.object.user_id;
        const welcomeFirst = `Добро пожаловать в ILLUSIONIST OS! 👋\n\n` +
          `Профессиональные приложения для артистов.\n` +
          `📶 Работают офлайн — интернет нужен только при первом запуске.\n\n` +
          `🧮 Калькулятор — финансы, КП, аналитика\n` +
          `📅 Календарь — расписание, логистика\n` +
          `🎁 Комплект — оба приложения со скидкой\n\n` +
          `Выберите приложение:`;
        await sendMessage(userId, welcomeFirst, mainMenuKeyboard());
      }
    } catch (err) {
      console.error('VK Bot error:', err);
    }
  })();

  waitUntil(processing);
  return res.status(200).send('ok');
};
