const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.database();

// ========== КОНФИГУРАЦИЯ ==========
const config = require('./config');
const VK_TOKEN = config.VK_TOKEN;
const VK_CONFIRMATION = config.VK_CONFIRMATION;
const VK_SECRET = config.VK_SECRET;
const ADMIN_VK_ID = config.ADMIN_VK_ID;
const PAYMENT = config.PAYMENT;

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

// ========== FAQ ==========
const FAQ_TEXT = `📋 Часто задаваемые вопросы\n\n` +
  `📶 Нужен ли интернет?\n` +
  `При первом запуске — да (для активации ключа). После этого приложения работают полностью офлайн!\n\n` +
  `🔑 Как активировать ключ?\n` +
  `При первом запуске появится экран активации. Вставьте ключ и нажмите «Активировать». Ключ активируется единожды. Если приложение вылетело — экран появится снова, вставьте тот же ключ.\n\n` +
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
    { title: '🏢 Мои проекты', url: 'https://vkvideo.ru/playlist/-236098668_1/video-236098668_456239025?linked=1' },
    { title: '📝 Создание КП', url: 'https://vkvideo.ru/playlist/-236098668_1/video-236098668_456239029?linked=1' },
    { title: '🛠 Работа с КП', url: 'https://vkvideo.ru/playlist/-236098668_1/video-236098668_456239031?linked=1' },
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

// ========== VK API ==========
async function vkApi(method, params) {
  const url = `https://api.vk.com/method/${method}`;
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) body.append(key, value);
  }
  body.append('access_token', VK_TOKEN);
  body.append('v', '5.199');

  const resp = await fetch(url, { method: 'POST', body });
  const data = await resp.json();
  if (data.error) {
    console.error(`VK API error [${method}]:`, data.error);
  }
  return data;
}

async function sendMessage(userId, message, keyboard, attachment = null) {
  const params = {
    user_id: userId,
    message,
    random_id: Math.floor(Math.random() * 2e9)
  };
  if (keyboard) params.keyboard = JSON.stringify(keyboard);
  if (attachment) params.attachment = attachment;

  const result = await vkApi('messages.send', params);
  return result.response; // message_id
}

async function answerEvent(eventId, userId, peerId, text) {
  return vkApi('messages.sendMessageEventAnswer', {
    event_id: eventId,
    user_id: userId,
    peer_id: peerId,
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
  for (let i = 0; i < data.length; i++) {
    sum += data.charCodeAt(i);
  }
  const check = (sum % 10000).toString(36).toUpperCase().padStart(4, '0');
  key += '-' + check;
  return key;
}

async function generateAndSaveKey({ appId, userId, buyerName, price, days, planLabel }) {
  const now = new Date().toISOString();
  const newKey = generateLicenseKey();
  const keyFirebase = newKey.replace(/[.#$[\]]/g, '-');

  const product = PRODUCTS.find(p => p.id === appId);

  const licenseData = {
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
    bundleId: null
  };

  await db.ref(`licenses/${keyFirebase}`).set(licenseData);
  return newKey;
}

// ========== КЛАВИАТУРЫ ==========

// Главное меню: выбор приложения
function mainMenuKeyboard() {
  const appButtons = PRODUCTS.map(p => [{
    action: {
      type: 'callback',
      payload: JSON.stringify({ cmd: 'app', id: p.id }),
      label: p.name
    },
    color: p.isBundle ? 'positive' : 'primary'
  }]);

  return {
    inline: true,
    buttons: [
      ...appButtons,
      [{
        action: {
          type: 'callback',
          payload: JSON.stringify({ cmd: 'support' }),
          label: '❓ Поддержка'
        },
        color: 'secondary'
      }]
    ]
  };
}

// Меню выбора приложения для обучения
function educationAppsKeyboard() {
  return {
    inline: true,
    buttons: [
      [{
        action: {
          type: 'callback',
          payload: JSON.stringify({ cmd: 'edu_app', id: 'calculator' }),
          label: '🧮 Калькулятор'
        },
        color: 'primary'
      }],
      [{
        action: {
          type: 'callback',
          payload: JSON.stringify({ cmd: 'edu_app', id: 'calendar' }),
          label: '📅 Календарь'
        },
        color: 'primary'
      }],
      [{
        action: {
          type: 'callback',
          payload: JSON.stringify({ cmd: 'menu' }),
          label: '← Назад'
        },
        color: 'secondary'
      }]
    ]
  };
}

// Меню тем обучения
function educationTopicsKeyboard(appId) {
  const app = PRODUCTS.find(p => p.id === appId);
  // const appName = app ? app.name : appId; // unused

  // Специфичное меню для Калькулятора
  if (appId === 'calculator') {
    return {
      inline: true,
      buttons: [
        [{ action: { type: 'callback', label: '🚀 Активация приложения', payload: JSON.stringify({ cmd: 'edu_topic', app: appId, id: 'activation' }) }, color: 'secondary' }],
        [{ action: { type: 'callback', label: '📱 Главный экран (кратко)', payload: JSON.stringify({ cmd: 'edu_topic', app: appId, id: 'main_screen' }) }, color: 'secondary' }],
        [{ action: { type: 'callback', label: '👤 Профиль', payload: JSON.stringify({ cmd: 'edu_topic', app: appId, id: 'profile' }) }, color: 'secondary' }],
        [{ action: { type: 'callback', label: '🛠 Услуги', payload: JSON.stringify({ cmd: 'edu_topic', app: appId, id: 'services' }) }, color: 'secondary' }],
        [{ action: { type: 'callback', label: '🚚 Логистика', payload: JSON.stringify({ cmd: 'edu_topic', app: appId, id: 'logistics' }) }, color: 'secondary' }],
        [{ action: { type: 'callback', label: '📦 Остальное', payload: JSON.stringify({ cmd: 'edu_topic', app: appId, id: 'other' }) }, color: 'secondary' }],
        [{ action: { type: 'callback', label: '⚡ Быстрые ответы', payload: JSON.stringify({ cmd: 'edu_topic', app: appId, id: 'quick_answers' }) }, color: 'secondary' }],
        [{ action: { type: 'callback', label: '⚙️ Работа калькулятора', payload: JSON.stringify({ cmd: 'edu_topic', app: appId, id: 'calc_work' }) }, color: 'secondary' }],
        [{ action: { type: 'callback', label: '🌐 Экосистема', payload: JSON.stringify({ cmd: 'edu_topic', app: appId, id: 'ecosystem' }) }, color: 'secondary' }],
        [{ action: { type: 'callback', label: '✨ Доп. фишки', payload: JSON.stringify({ cmd: 'edu_topic', app: appId, id: 'features' }) }, color: 'secondary' }],
        [{ action: { type: 'callback', label: '← Назад к выбору', payload: JSON.stringify({ cmd: 'education' }) }, color: 'primary' }]
      ]
    };
  }

  // Заглушка для других приложений (например, Календарь)
  const buttons = [
    [{
      action: {
        type: 'callback',
        payload: JSON.stringify({ cmd: 'edu_topic', app: appId, id: 'intro' }),
        label: '▶️ Введение'
      },
      color: 'secondary'
    }],
    [{
      action: {
        type: 'callback',
        payload: JSON.stringify({ cmd: 'edu_topic', app: appId, id: 'basics' }),
        label: '▶️ Основные функции'
      },
      color: 'secondary'
    }],
    [{
      action: {
        type: 'callback',
        payload: JSON.stringify({ cmd: 'education' }),
        label: '← Назад к выбору'
      },
      color: 'primary'
    }]
  ];

  return { inline: true, buttons };
}

// Выбор тарифа: если 1 тариф — показать сразу, иначе — кнопки
function plansKeyboard(appId) {
  const app = PRODUCTS.find(p => p.id === appId);
  if (!app) return null;

  const plans = app.plans;
  const buttons = [];
  const freePlans = plans.filter(p => p.price === 0);
  const paidPlans = plans.filter(p => p.price > 0);

  // Бесплатный пробный — отдельная строка
  for (const p of freePlans) {
    buttons.push([{
      action: {
        type: 'callback',
        payload: JSON.stringify({ cmd: 'plan', app: appId, plan: p.id }),
        label: `${p.label} — Бесплатно`
      },
      color: 'positive'
    }]);
  }

  // Платные — по 2 в ряд (цены видны в тексте сообщения)
  for (let i = 0; i < paidPlans.length; i += 2) {
    const row = [{
      action: {
        type: 'callback',
        payload: JSON.stringify({ cmd: 'plan', app: appId, plan: paidPlans[i].id }),
        label: paidPlans[i].label
      },
      color: 'primary'
    }];
    if (paidPlans[i + 1]) {
      row.push({
        action: {
          type: 'callback',
          payload: JSON.stringify({ cmd: 'plan', app: appId, plan: paidPlans[i + 1].id }),
          label: paidPlans[i + 1].label
        },
        color: 'primary'
      });
    }
    buttons.push(row);
  }

  // Кнопка «Назад»
  buttons.push([{
    action: {
      type: 'callback',
      payload: JSON.stringify({ cmd: 'menu' }),
      label: '← Назад'
    },
    color: 'secondary'
  }]);

  return { inline: true, buttons };
}

// Кнопки после показа реквизитов
function paymentKeyboard(appId, planId) {
  return {
    inline: true,
    buttons: [
      [{
        action: {
          type: 'callback',
          payload: JSON.stringify({ cmd: 'paid', app: appId, plan: planId }),
          label: '✅ Я оплатил'
        },
        color: 'positive'
      }],
      [{
        action: {
          type: 'callback',
          payload: JSON.stringify({ cmd: 'app', id: appId }),
          label: '← Назад к тарифам'
        },
        color: 'secondary'
      }]
    ]
  };
}

// Кнопки у админа
function adminKeyboard(pendingId) {
  return {
    inline: true,
    buttons: [
      [
        {
          action: {
            type: 'callback',
            payload: JSON.stringify({ cmd: 'confirm', id: pendingId }),
            label: '✅ Подтвердить'
          },
          color: 'positive'
        },
        {
          action: {
            type: 'callback',
            payload: JSON.stringify({ cmd: 'reject', id: pendingId }),
            label: '❌ Отклонить'
          },
          color: 'negative'
        }
      ]
    ]
  };
}

// Меню после выдачи ключа, чтобы пользователь мог сразу перейти в обучение
function postPurchaseKeyboard(appId, isBundle) {
  let eduButton;

  if (isBundle) {
    // Если купили комплект — предлагаем выбор приложения для обучения
    eduButton = {
      action: {
        type: 'callback',
        payload: JSON.stringify({ cmd: 'education' }), // Возврат к меню приложений
        label: '🎓 Обучение'
      },
      color: 'primary'
    };
  } else {
    // Если одно приложение — сразу переходим к его темам
    eduButton = {
      action: {
        type: 'callback',
        payload: JSON.stringify({ cmd: 'edu_app', id: appId }),
        label: `🎓 К обучению (${PRODUCTS.find(p => p.id === appId)?.name?.replace(/[^a-zA-Zа-яА-ЯёЁ ]/g, '') || 'App'})`
      },
      color: 'primary'
    };
  }

  return {
    inline: true,
    buttons: [
      [eduButton],
      [{
        action: {
          type: 'callback',
          payload: JSON.stringify({ cmd: 'menu' }),
          label: '🏠 Главное меню'
        },
        color: 'secondary'
      }]
    ]
  };
}

// ========== ОБРАБОТЧИКИ ==========

// Любое текстовое сообщение → главное меню
async function handleNewMessage(msg) {
  const userId = msg.from_id;

  const welcome =
    'Привет! 👋\n\n' +
    'Здесь можно приобрести приложения для артистов.\n\n' +
    'Выберите приложение:';

  await sendMessage(userId, welcome, mainMenuKeyboard());
}

// Нажатие callback-кнопки
async function handleMessageEvent(event) {
  const { event_id, user_id, peer_id, payload } = event;

  let data;
  try {
    data = typeof payload === 'string' ? JSON.parse(payload) : payload;
  } catch {
    return;
  }

  switch (data.cmd) {
    // ─── Главное меню ───
    case 'menu': {
      await answerEvent(event_id, user_id, peer_id, 'Главное меню');
      await sendMessage(user_id, 'Выберите приложение:', mainMenuKeyboard());
      break;
    }

    // ─── Выбор приложения → показать тарифы ───
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

      await sendMessage(user_id, msg, plansKeyboard(data.id));
      break;
    }

    // ─── Выбор тарифа ───
    case 'plan': {
      const app = PRODUCTS.find(p => p.id === data.app);
      const plan = app ? app.plans.find(p => p.id === data.plan) : null;
      if (!app || !plan) return;

      // Бесплатный пробный → сразу выдаём ключ
      if (plan.price === 0) {
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
          const hasAnyTraining = app.bundleApps.some(id => TRAINING[id] && TRAINING[id].length > 0);
          if (hasAnyTraining) {
            trialBundleButtons.push([{ action: { type: 'callback', payload: JSON.stringify({ cmd: 'training_choose' }), label: '🎓 Обучение' }, color: 'positive' }]);
          }
          trialBundleButtons.push([{ action: { type: 'callback', payload: JSON.stringify({ cmd: 'menu' }), label: '← В меню' }, color: 'secondary' }]);
          await editMessage(user_id, msg, { inline: true, buttons: trialBundleButtons });
          await vkApi('messages.send', { user_id, message: key, random_id: Math.floor(Math.random() * 2e9) });
        } else {
          const key = await generateAndSaveKey({ appId: app.id, userId: `vk_${user_id}`, buyerName: name, price: 0, days: plan.days, planLabel: plan.label });
          const msg = `🎉 Пробный период активирован!\n\nСрок: ${plan.days} дней\n\n🔑 Ключ — в следующем сообщении (зажмите его для копирования)`;
          const trialButtons = [];
          if (app.appUrl) trialButtons.push([{ action: { type: 'open_link', link: app.appUrl, label: `📲 Открыть ${app.name}` } }]);
          if (TRAINING[app.id] && TRAINING[app.id].length > 0) {
            trialButtons.push([{ action: { type: 'callback', payload: JSON.stringify({ cmd: 'training', app: app.id }), label: '🎓 Обучение' }, color: 'positive' }]);
          }
          trialButtons.push([{ action: { type: 'callback', payload: JSON.stringify({ cmd: 'menu' }), label: '← В меню' }, color: 'secondary' }]);
          await editMessage(user_id, msg, { inline: true, buttons: trialButtons });
          await vkApi('messages.send', { user_id, message: key, random_id: Math.floor(Math.random() * 2e9) });
        }

        // Уведомление админу о пробном ключе
        const trialName = await getUserName(user_id);
        await sendMessage(ADMIN_VK_ID,
          `🆓 Пробный ключ выдан\n👤 ${trialName} (vk.com/id${user_id})\n📱 ${app.name} — ${plan.label}`
        );
        break;
      }

      // Платный тариф → показываем реквизиты
      await answerEvent(event_id, user_id, peer_id, 'Реквизиты для оплаты');

      // Сохраняем pending-состояние
      await db.ref(`vk_pending/${user_id}`).set({
        appId: app.id,
        planId: plan.id,
        appName: app.name,
        planLabel: plan.label,
        price: plan.price,
        days: plan.days,
        isBundle: !!app.isBundle,
        bundleApps: app.bundleApps || null,
        timestamp: new Date().toISOString()
      });

      let msg = `${app.name}\n`;
      msg += `Тариф: ${plan.label} — ${plan.price.toLocaleString('ru-RU')} ₽\n\n`;
      msg += `━━━━━━━━━━━━━━━\n`;
      msg += `Переведите на карту ${PAYMENT.bank}:\n\n`;
      msg += `💳 Карта: ${PAYMENT.card}\n`;
      msg += `📱 СБП: ${PAYMENT.phone}\n`;
      msg += `👤 Получатель: ${PAYMENT.holder}\n`;
      msg += `💰 Сумма: ${plan.price.toLocaleString('ru-RU')} ₽\n`;
      msg += `━━━━━━━━━━━━━━━\n\n`;
      msg += `После перевода нажмите «Я оплатил».\n`;
      msg += `В комментарии к переводу ничего писать не надо.`;

      await sendMessage(user_id, msg, paymentKeyboard(data.app, data.plan));
      break;
    }

    // ─── Пользователь нажал «Я оплатил» ───
    case 'paid': {
      await answerEvent(event_id, user_id, peer_id, 'Заявка отправлена!');

      // Получаем pending
      const snapshot = await db.ref(`vk_pending/${user_id}`).once('value');
      const pending = snapshot.val();

      if (!pending) {
        await sendMessage(user_id, 'Заявка не найдена. Попробуйте выбрать тариф заново.', mainMenuKeyboard());
        return;
      }

      const userName = await getUserName(user_id);

      // Подтверждение пользователю
      await sendMessage(user_id,
        'Спасибо! Заявка отправлена на проверку. ✨\n\n' +
        'Обычно это занимает 5-15 минут (с 09:00 до 00:00 по Москве).\n' +
        'Если перевели ночью — ключ придёт утром.'
      );

      // Создаём уникальный ID заявки
      const pendingId = `${user_id}_${Date.now()}`;
      await db.ref(`vk_admin_pending/${pendingId}`).set({
        ...pending,
        vkUserId: user_id,
        userName,
        userLink: `vk.com/id${user_id}`
      });

      // Уведомляем админа
      const moscowTime = new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' });

      let adminMsg = '💰 НОВАЯ ОПЛАТА (ВК)\n\n';
      adminMsg += `👤 ${userName}\n`;
      adminMsg += `🔗 vk.com/id${user_id}\n\n`;
      adminMsg += `📱 ${pending.appName}\n`;
      adminMsg += `📋 Тариф: ${pending.planLabel}\n`;
      adminMsg += `💵 Сумма: ${pending.price.toLocaleString('ru-RU')} ₽\n`;
      adminMsg += `⏰ ${moscowTime}`;

      await sendMessage(ADMIN_VK_ID, adminMsg, adminKeyboard(pendingId));
      break;
    }

    // ─── Админ подтверждает оплату ───
    case 'confirm': {
      if (user_id !== ADMIN_VK_ID) {
        await answerEvent(event_id, user_id, peer_id, 'Нет доступа');
        return;
      }

      await answerEvent(event_id, user_id, peer_id, 'Генерирую ключ...');

      const snap = await db.ref(`vk_admin_pending/${data.id}`).once('value');
      const pending = snap.val();

      if (!pending) {
        await sendMessage(ADMIN_VK_ID, '⚠️ Заявка не найдена или уже обработана.');
        return;
      }

      // Удаляем из pending
      await db.ref(`vk_admin_pending/${data.id}`).remove();
      await db.ref(`vk_pending/${pending.vkUserId}`).remove();

      // Генерируем ключ
      const key = await generateAndSaveKey({
        appId: pending.appId,
        userId: `vk_${pending.vkUserId}`,
        buyerName: pending.userName,
        price: pending.price,
        days: pending.days,
        planLabel: pending.planLabel
      });

      const isLifetime = pending.days >= 36500;
      const durationLabel = isLifetime ? 'Бессрочно' : `${pending.days} дней`;

      let userMsg = `🎉 Оплата подтверждена!\n\n`;
      if (pending.isBundle) {
        userMsg += `Тариф: ${pending.planLabel}\nСрок: ${durationLabel}\n\nВведите ключ и в Калькуляторе, и в Календаре.\n\n🔑 Ключ — в следующем сообщении (зажмите его для копирования)`;
      } else {
        userMsg += `Тариф: ${pending.planLabel}\nСрок: ${durationLabel}\n\n🔑 Ключ — в следующем сообщении (зажмите его для копирования)`;
      }
      const appIds = (pending.isBundle && pending.bundleApps) ? pending.bundleApps : [pending.appId];

      const afterPurchaseButtons = [];
      for (const appId of appIds) {
        const product = PRODUCTS.find(p => p.id === appId);
        if (product && product.appUrl) {
          afterPurchaseButtons.push([{
            action: { type: 'open_link', link: product.appUrl, label: `📲 Открыть ${product.name}` }
          }]);
        }
      }

      if (appIds.length > 1) {
        const hasAnyTraining = appIds.some(id => TRAINING[id] && TRAINING[id].length > 0);
        if (hasAnyTraining) {
          afterPurchaseButtons.push([{ action: { type: 'callback', payload: JSON.stringify({ cmd: 'training_choose' }), label: '🎓 Обучение' }, color: 'positive' }]);
        }
      } else {
        const appId = appIds[0];
        if (TRAINING[appId] && TRAINING[appId].length > 0) {
          afterPurchaseButtons.push([{ action: { type: 'callback', payload: JSON.stringify({ cmd: 'training', app: appId }), label: '🎓 Обучение' }, color: 'positive' }]);
        }
      }

      const reviewAppId = appIds[0];
      afterPurchaseButtons.push([{ action: { type: 'callback', payload: JSON.stringify({ cmd: 'review_start', app: reviewAppId }), label: '⭐ Оставить отзыв' }, color: 'secondary' }]);
      afterPurchaseButtons.push([{ action: { type: 'callback', payload: JSON.stringify({ cmd: 'menu' }), label: '← В меню' }, color: 'secondary' }]);

      await sendMessage(pending.vkUserId, userMsg, { inline: true, buttons: afterPurchaseButtons });
      await vkApi('messages.send', { user_id: pending.vkUserId, message: key, random_id: Math.floor(Math.random() * 2e9) });

      await sendMessage(ADMIN_VK_ID, `✅ Ключ выдан для ${pending.userName}:\n${key}`);
      break;
    }

    // ─── Админ отклоняет оплату ───
    case 'reject': {
      if (user_id !== ADMIN_VK_ID) {
        await answerEvent(event_id, user_id, peer_id, 'Нет доступа');
        return;
      }

      await answerEvent(event_id, user_id, peer_id, 'Отклонено');

      const snap = await db.ref(`vk_admin_pending/${data.id}`).once('value');
      const pending = snap.val();

      if (!pending) {
        await sendMessage(ADMIN_VK_ID, '⚠️ Заявка не найдена.');
        return;
      }

      await db.ref(`vk_admin_pending/${data.id}`).remove();
      await db.ref(`vk_pending/${pending.vkUserId}`).remove();

      await sendMessage(pending.vkUserId,
        'К сожалению, оплата не подтверждена. 😔\n\n' +
        'Возможно, перевод не дошёл или сумма не совпала.\n' +
        'Напишите мне в личку — разберёмся: vk.com/id196783025'
      );

      await sendMessage(ADMIN_VK_ID, `❌ Оплата отклонена для ${pending.userName}.`);
      break;
    }

    // ─── Обучение: Выбор приложения ───
    case 'education': {
      await answerEvent(event_id, user_id, peer_id, 'Раздел обучения');
      await sendMessage(user_id, 'Выберите приложение для обучения:', educationAppsKeyboard());
      break;
    }

    // ─── Обучение: Темы ───
    case 'edu_app': {
      const app = PRODUCTS.find(p => p.id === data.id);
      if (!app) return;

      await answerEvent(event_id, user_id, peer_id, app.name);
      await sendMessage(user_id, `Обучение по ${app.name}.\nВыберите тему:`, educationTopicsKeyboard(data.id));
      break;
    }

    // ─── Обучение: Клик по теме ───
    case 'edu_topic': {
      if (data.id === 'activation') {
        await answerEvent(event_id, user_id, peer_id, 'Запускаю видео...');
        const videoAttachment = 'video-236098668_456239017'; // Video ID from user
        await sendMessage(user_id, '▶️ Активация приложения', null, videoAttachment);
      } else {
        await answerEvent(event_id, user_id, peer_id, 'Скоро будет доступно!');
        // Здесь потом будем отправлять видео или ссылки для других тем
      }
      break;
    }

    // ─── Поддержка ───
    // Выбор приложения для обучения (комплект)
    case 'training_choose': {
      await answerEvent(event_id, user_id, peer_id, 'Обучение');
      const chooseButtons = [];
      for (const prod of PRODUCTS) {
        if (prod.isBundle) continue;
        if (TRAINING[prod.id] && TRAINING[prod.id].length > 0) {
          chooseButtons.push([{
            action: { type: 'callback', payload: JSON.stringify({ cmd: 'training', app: prod.id }), label: `🎓 ${prod.name}` },
            color: 'primary'
          }]);
        }
      }
      chooseButtons.push([{ action: { type: 'callback', payload: JSON.stringify({ cmd: 'menu' }), label: '← Назад' }, color: 'secondary' }]);
      await editMessage(user_id, '🎓 Выберите приложение для обучения:', { inline: true, buttons: chooseButtons });
      break;
    }

    case 'training': {
      await answerEvent(event_id, user_id, peer_id, 'Обучение');

      // Проверяем, есть ли у пользователя лицензия (платная или пробная)
      if (user_id !== ADMIN_VK_ID) {
        try {
          const appProduct = PRODUCTS.find(p => p.id === data.app);
          const licensesSnap = await db.ref('licenses').once('value');
          const allLicenses = licensesSnap.val() || {};
          const hasLicense = Object.values(allLicenses).some(lic =>
            lic.buyer && lic.buyer.id === `vk_${user_id}` &&
            (lic.appName === (appProduct ? appProduct.name : '') || lic.appName === '🎁 Комплект')
          );
          const trialSnap = await db.ref(`vk_trials/${user_id}/${data.app}`).once('value');
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

    case 'support': {
      await answerEvent(event_id, user_id, peer_id, 'Поддержка');
      const msg =
        'Если есть вопросы — пишите:\n\n' +
        '📱 Telegram: t.me/Dmitrokko\n' +
        '💬 ВКонтакте: vk.com/id196783025';
      await sendMessage(user_id, msg, mainMenuKeyboard());
      break;
    }
  }
}

// ========== WEBHOOK (Firebase Cloud Function) ==========
exports.vkBot = functions
  .region('europe-west1')
  .https.onRequest(async (req, res) => {
    // Принимаем только POST
    if (req.method !== 'POST') {
      return res.status(405).send('Method Not Allowed');
    }

    const body = req.body;

    // Проверка секретного ключа
    if (VK_SECRET && body.secret && body.secret !== VK_SECRET) {
      console.warn('Invalid secret received');
      return res.status(403).send('Invalid secret');
    }

    // Подтверждение сервера для VK Callback API
    if (body.type === 'confirmation' && body.group_id) {
      console.log(`Confirmation request from group ${body.group_id}`);
      return res.status(200).send(VK_CONFIRMATION);
    }

    // Сразу отвечаем «ok» — VK ждёт ответ не более 5 секунд
    res.status(200).send('ok');

    try {
      if (body.type === 'message_new') {
        await handleNewMessage(body.object.message);
      } else if (body.type === 'message_event') {
        await handleMessageEvent(body.object);
      }
    } catch (err) {
      console.error('Error handling VK event:', err);
    }
  });
