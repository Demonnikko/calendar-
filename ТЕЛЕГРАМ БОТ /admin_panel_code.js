// ============================================
// АДМИН ПАНЕЛЬ - ОБРАБОТЧИКИ
// (Этот файл будет встроен в index.js перед bot.launch())
// ============================================

// 📊 СТАТИСТИКА
bot.action('admin_stats', async (ctx) => {
  await ctx.answerCbQuery('Загружаю статистику...');
  await ctx.editMessageText('⏳ Загрузка статистики...', { parse_mode: 'Markdown' });

  const dbRef = ref(getDatabase());

  try {
    // Получаем все данные
    const [usersSnapshot, licensesSnapshot] = await Promise.all([
      get(child(dbRef, 'users')),
      get(child(dbRef, 'licenses'))
    ]);

    // Подсчитываем статистику
    const users = usersSnapshot.val() || {};
    const licenses = licensesSnapshot.val() || {};

    const totalUsers = Object.keys(users).length;
    const totalLicenses = Object.keys(licenses).length;

    let activeLicenses = 0;
    let todaySales = 0;
    let monthSales = 0;
    let totalRevenue = 0;
    const appStats = {};

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    Object.values(licenses).forEach(license => {
      if (license.activated) activeLicenses++;

      const created = new Date(license.created);
      if (created >= todayStart) todaySales++;
      if (created >= monthStart) monthSales++;

      totalRevenue += license.payment || 0;

      // Статистика по приложениям
      const appName = license.appName || 'Неизвестно';
      appStats[appName] = (appStats[appName] || 0) + 1;
    });

    // Сортируем приложения по популярности
    const topApps = Object.entries(appStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => `  • ${name}: ${count} продаж`)
      .join('\n');

    const message = `
📊 *СТАТИСТИКА*

👥 *Пользователи:* ${totalUsers}
🔑 *Лицензии:* ${totalLicenses}
✅ *Активных:* ${activeLicenses}

💰 *Продажи:*
  • За сегодня: ${todaySales}
  • За месяц: ${monthSales}
  • Общая выручка: ${totalRevenue.toLocaleString('ru-RU')} ₽

📱 *Топ приложений:*
${topApps || '  Пока нет продаж'}
    `.trim();

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('🔄 Обновить', 'admin_stats')],
      [Markup.button.callback('🔙 Назад в меню', 'admin_menu')]
    ]);

    await ctx.editMessageText(message, { ...keyboard, parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Admin stats error:', error);
    await ctx.editMessageText('❌ Ошибка при загрузке статистики', {
      reply_markup: { inline_keyboard: [[Markup.button.callback('🔙 Назад', 'admin_menu')]] }
    });
  }
});

// 🔑 УПРАВЛЕНИЕ ЛИЦЕНЗИЯМИ
bot.action('admin_licenses', async (ctx) => {
  await ctx.answerCbQuery();

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('📋 Список лицензий', 'admin_licenses_list_0')],
    [Markup.button.callback('➕ Создать ключ вручную', 'admin_licenses_create')],
    [Markup.button.callback('🔙 Назад', 'admin_menu')]
  ]);

  await ctx.editMessageText(
    '🔑 *УПРАВЛЕНИЕ ЛИЦЕНЗИЯМИ*\n\nВыберите действие:',
    { ...keyboard, parse_mode: 'Markdown' }
  );
});

// Список лицензий (с пагинацией)
bot.action(/admin_licenses_list_(\d+)/, async (ctx) => {
  const page = parseInt(ctx.match[1]);
  const PAGE_SIZE = 10;

  await ctx.answerCbQuery('Загружаю лицензии...');

  try {
    const dbRef = ref(getDatabase());
    const snapshot = await get(child(dbRef, 'licenses'));
    const licenses = snapshot.val() || {};

    const licenseArray = Object.entries(licenses)
      .sort((a, b) => new Date(b[1].created) - new Date(a[1].created));

    const start = page * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    const pageData = licenseArray.slice(start, end);

    let message = '🔑 *СПИСОК ЛИЦЕНЗИЙ*\n\n';

    if (pageData.length === 0) {
      message += 'Пока нет лицензий';
    } else {
      pageData.forEach(([key, data], index) => {
        const num = start + index + 1;
        const status = data.activated ? '✅' : '❌';
        const buyer = data.buyer?.firstName || 'Unknown';
        message += `${num}. ${status} \`${key}\`\n`;
        message += `   👤 ${buyer} | 📱 ${data.appName}\n\n`;
      });
    }

    const buttons = [];

    // Кнопки пагинации
    const navButtons = [];
    if (page > 0) {
      navButtons.push(Markup.button.callback('⬅️ Назад', `admin_licenses_list_${page - 1}`));
    }
    if (end < licenseArray.length) {
      navButtons.push(Markup.button.callback('➡️ Далее', `admin_licenses_list_${page + 1}`));
    }
    if (navButtons.length) buttons.push(navButtons);

    buttons.push([Markup.button.callback('🔙 К меню лицензий', 'admin_licenses')]);

    const keyboard = Markup.inlineKeyboard(buttons);

    await ctx.editMessageText(message, { ...keyboard, parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Error listing licenses:', error);
    await ctx.editMessageText('❌ Ошибка при загрузке лицензий');
  }
});

// Создать ключ вручную - выбор приложения
bot.action('admin_licenses_create', async (ctx) => {
  await ctx.answerCbQuery();

  // Показываем список приложений
  const buttons = apps.map(app => [
    Markup.button.callback(app.name, `admin_license_create_app_${app.id}`)
  ]);
  buttons.push([Markup.button.callback('🔙 Отмена', 'admin_licenses')]);

  const keyboard = Markup.inlineKeyboard(buttons);

  await ctx.editMessageText(
    '➕ *СОЗДАТЬ КЛЮЧ ВРУЧНУЮ*\n\nВыберите приложение:',
    { ...keyboard, parse_mode: 'Markdown' }
  );
});

// Выбор приложения
bot.action(/admin_license_create_app_(.+)/, async (ctx) => {
  const appId = ctx.match[1];
  const app = apps.find(a => a.id === appId);

  if (!app) return;

  await ctx.answerCbQuery();

  // Сохраняем выбор
  adminState[ctx.from.id] = { step: 'app_selected', appId, app };

  // Показываем тарифы
  const buttons = app.plans.map(plan => [
    Markup.button.callback(
      `${plan.label} — ${plan.price} ₽`,
      `admin_license_create_plan_${plan.id}`
    )
  ]);
  buttons.push([Markup.button.callback('🔙 Назад', 'admin_licenses_create')]);

  const keyboard = Markup.inlineKeyboard(buttons);

  await ctx.editMessageText(
    `➕ *СОЗДАТЬ КЛЮЧ ДЛЯ ${app.name}*\n\nВыберите тариф:`,
    { ...keyboard, parse_mode: 'Markdown' }
  );
});

// Выбор тарифа
bot.action(/admin_license_create_plan_(.+)/, async (ctx) => {
  const planId = ctx.match[1];
  const state = adminState[ctx.from.id];

  if (!state || state.step !== 'app_selected') {
    await ctx.answerCbQuery('Ошибка. Начните сначала.');
    return;
  }

  const plan = state.app.plans.find(p => p.id === planId);
  if (!plan) return;

  await ctx.answerCbQuery();

  // Сохраняем выбор
  state.step = 'plan_selected';
  state.planId = planId;
  state.plan = plan;

  await ctx.editMessageText(
    `➕ *СОЗДАТЬ КЛЮЧ*\n\n` +
    `📱 Приложение: ${state.app.name}\n` +
    `📋 Тариф: ${plan.label}\n\n` +
    `Отправьте Telegram ID пользователя (число)\nили нажмите "Без пользователя" чтобы создать ключ без привязки:`,
    {
      reply_markup: {
        inline_keyboard: [
          [Markup.button.callback('🔓 Без пользователя', 'admin_license_create_no_user')],
          [Markup.button.callback('🔙 Отмена', 'admin_licenses')]
        ]
      },
      parse_mode: 'Markdown'
    }
  );

  state.step = 'waiting_user_id';
});

// Создать без пользователя
bot.action('admin_license_create_no_user', async (ctx) => {
  const state = adminState[ctx.from.id];

  if (!state || state.step !== 'waiting_user_id') return;

  await ctx.answerCbQuery();

  // Создаем ключ без пользователя
  await createManualLicense(ctx, state, null);
  delete adminState[ctx.from.id];
});

// Функция создания ключа вручную
async function createManualLicense(ctx, state, userId) {
  const newKey = generateLicenseKey();
  const now = new Date().toISOString();

  const licenseData = {
    key: newKey,
    appName: state.app.name,
    buyer: userId ? {
      id: userId,
      firstName: 'Manual',
      lastName: '',
      username: ''
    } : null,
    payment: 0, // Выдано вручную
    currency: 'RUB',
    expiryDays: state.plan.duration,
    created: now,
    activated: false,
    deviceId: null,
    installId: null,
    activatedDate: null,
    lastCheck: null,
    planLabel: state.plan.label,
    createdBy: 'admin',
    adminNote: 'Выдано вручную'
  };

  try {
    await set(
      ref(firebaseDB, "licenses/" + newKey.replace(/[.#$[\]]/g, "-")),
      licenseData
    );

    let message = `✅ *КЛЮЧ СОЗДАН*\n\n🔑 \`${newKey}\`\n\n`;
    message += `📱 Приложение: ${state.app.name}\n`;
    message += `📋 Тариф: ${state.plan.label}\n`;
    message += `⏰ Срок: ${state.plan.duration} дней\n`;

    if (userId) {
      message += `\n👤 Пользователь: ${userId}\n`;
      message += `\nОтправить ключ пользователю?`;

      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('📤 Отправить', `admin_send_key_${userId}_${newKey}`)],
        [Markup.button.callback('✅ Готово', 'admin_licenses')]
      ]);

      await ctx.reply(message, { ...keyboard, parse_mode: 'Markdown' });
    } else {
      await ctx.reply(message + '\n\n(Ключ создан без привязки к пользователю)', {
        reply_markup: {
          inline_keyboard: [
            [Markup.button.callback('✅ Готово', 'admin_licenses')]
          ]
        },
        parse_mode: 'Markdown'
      });
    }
  } catch (error) {
    console.error('Error creating manual license:', error);
    await ctx.reply('❌ Ошибка при создании ключа. Попробуйте еще раз.');
  }
}

// Отправка ключа пользователю
bot.action(/admin_send_key_(\d+)_(.+)/, async (ctx) => {
  const userId = ctx.match[1];
  const key = ctx.match[2];

  await ctx.answerCbQuery('Отправляю...');

  try {
    await ctx.telegram.sendMessage(
      userId,
      `🎁 Вам выдан лицензионный ключ:\n\n🔑 \`${key}\`\n\n` +
      `Используйте его для активации приложения.`,
      { parse_mode: 'Markdown' }
    );

    await ctx.reply('✅ Ключ отправлен пользователю!', {
      reply_markup: {
        inline_keyboard: [[Markup.button.callback('✅ Готово', 'admin_licenses')]]
      }
    });
  } catch (error) {
    await ctx.reply('❌ Не удалось отправить. Возможно пользователь не запускал бота.');
  }
});

// 👥 УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ
bot.action('admin_users', async (ctx) => {
  await ctx.answerCbQuery();

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('📋 Список пользователей', 'admin_users_list_0')],
    [Markup.button.callback('🔍 Найти по ID', 'admin_users_search')],
    [Markup.button.callback('🔙 Назад', 'admin_menu')]
  ]);

  await ctx.editMessageText(
    '👥 *УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ*\n\nВыберите действие:',
    { ...keyboard, parse_mode: 'Markdown' }
  );
});

// Список пользователей
bot.action(/admin_users_list_(\d+)/, async (ctx) => {
  const page = parseInt(ctx.match[1]);
  const PAGE_SIZE = 10;

  await ctx.answerCbQuery('Загружаю пользователей...');

  try {
    const dbRef = ref(getDatabase());
    const snapshot = await get(child(dbRef, 'users'));
    const users = snapshot.val() || {};

    const userArray = Object.entries(users);
    const start = page * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    const pageData = userArray.slice(start, end);

    let message = '👥 *СПИСОК ПОЛЬЗОВАТЕЛЕЙ*\n\n';

    if (pageData.length === 0) {
      message += 'Пока нет пользователей';
    } else {
      pageData.forEach(([userId, userData], index) => {
        const num = start + index + 1;
        const purchases = userData.purchases ? Object.keys(userData.purchases).length : 0;
        message += `${num}. ID: \`${userId}\`\n`;
        message += `   🛒 Покупок: ${purchases}\n\n`;
      });
    }

    const buttons = [];
    const navButtons = [];
    if (page > 0) {
      navButtons.push(Markup.button.callback('⬅️', `admin_users_list_${page - 1}`));
    }
    if (end < userArray.length) {
      navButtons.push(Markup.button.callback('➡️', `admin_users_list_${page + 1}`));
    }
    if (navButtons.length) buttons.push(navButtons);

    buttons.push([Markup.button.callback('🔙 Назад', 'admin_users')]);

    const keyboard = Markup.inlineKeyboard(buttons);

    await ctx.editMessageText(message, { ...keyboard, parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Error listing users:', error);
    await ctx.editMessageText('❌ Ошибка при загрузке пользователей');
  }
});

// Поиск пользователя
bot.action('admin_users_search', async (ctx) => {
  await ctx.answerCbQuery();

  adminState[ctx.from.id] = { step: 'searching_user' };

  await ctx.editMessageText(
    '🔍 *ПОИСК ПОЛЬЗОВАТЕЛЯ*\n\nОтправьте Telegram ID пользователя:',
    {
      reply_markup: {
        inline_keyboard: [[Markup.button.callback('🔙 Отмена', 'admin_users')]]
      },
      parse_mode: 'Markdown'
    }
  );
});

// 📨 РАССЫЛКА
bot.action('admin_broadcast', async (ctx) => {
  await ctx.answerCbQuery();

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('📢 Отправить всем', 'admin_broadcast_all')],
    [Markup.button.callback('📤 Отправить одному', 'admin_broadcast_one')],
    [Markup.button.callback('🔙 Назад', 'admin_menu')]
  ]);

  await ctx.editMessageText(
    '📨 *РАССЫЛКА СООБЩЕНИЙ*\n\nВыберите действие:',
    { ...keyboard, parse_mode: 'Markdown' }
  );
});

// Рассылка всем
bot.action('admin_broadcast_all', async (ctx) => {
  await ctx.answerCbQuery();

  adminState[ctx.from.id] = { step: 'broadcast_all' };

  await ctx.editMessageText(
    '📢 *РАССЫЛКА ВСЕМ*\n\n' +
    'Отправьте сообщение которое хотите разослать:\n\n' +
    '(Поддерживается Markdown форматирование)',
    {
      reply_markup: {
        inline_keyboard: [[Markup.button.callback('🔙 Отмена', 'admin_broadcast')]]
      },
      parse_mode: 'Markdown'
    }
  );
});

// Рассылка одному
bot.action('admin_broadcast_one', async (ctx) => {
  await ctx.answerCbQuery();

  adminState[ctx.from.id] = { step: 'broadcast_one_id' };

  await ctx.editMessageText(
    '📤 *ОТПРАВИТЬ ОДНОМУ*\n\nОтправьте Telegram ID пользователя:',
    {
      reply_markup: {
        inline_keyboard: [[Markup.button.callback('🔙 Отмена', 'admin_broadcast')]]
      },
      parse_mode: 'Markdown'
    }
  );
});

// ОБРАБОТКА ТЕКСТОВЫХ СООБЩЕНИЙ ДЛЯ АДМИНКИ
// Заменим существующий bot.on('text') на этот расширенный вариант
// или добавим обработку админ состояний в существующий обработчик
