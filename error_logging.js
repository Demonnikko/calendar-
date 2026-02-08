// ============================================
// СИСТЕМА ЛОГИРОВАНИЯ ОШИБОК В TELEGRAM БОТ
// ДЛЯ КАЛЕНДАРЯ
// ============================================
// Скопируйте этот код в index.html календаря
// Вставьте в <script> тег сразу после открытия (примерно строка 50+)

(function() {
  // ВАШ ТОКЕН БОТА (из config.js)
  const BOT_TOKEN = '8408967906:AAEAORd0O4jp7IVJTlYYok4-jSBTjn2VsYM';

  // ID вашего бота (число перед двоеточием в токене)
  const BOT_CHAT_ID = BOT_TOKEN.split(':')[0];

  // URL для отправки команд боту
  const TELEGRAM_API_URL = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

  // Функция отправки ошибки в Telegram
  function sendErrorToBot(errorData) {
    // Добавляем метку что это из календаря
    errorData.app = 'calendar';

    const command = `/app_error ${JSON.stringify(errorData)}`;

    fetch(TELEGRAM_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: BOT_CHAT_ID,
        text: command
      })
    }).catch(() => {
      // Не показываем ошибку пользователю
      console.log('Failed to send error to bot');
    });
  }

  // Функция отправки события в Telegram
  window.logAppEvent = function(eventName, data) {
    const eventData = {
      app: 'calendar',
      event: eventName,
      data: data || {},
      timestamp: new Date().toISOString(),
      url: window.location.href
    };

    const command = `/app_event ${JSON.stringify(eventData)}`;

    fetch(TELEGRAM_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: BOT_CHAT_ID,
        text: command
      })
    }).catch(() => {
      console.log('Failed to send event to bot');
    });
  };

  // Ловим все JavaScript ошибки
  window.addEventListener('error', function(event) {
    const errorData = {
      type: 'js_error',
      message: event.message || 'Unknown error',
      file: event.filename || '',
      line: event.lineno || 0,
      column: event.colno || 0,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString()
    };

    sendErrorToBot(errorData);

    // Также логируем в консоль для разработки
    console.error('Error logged:', errorData);
  });

  // Ловим Promise ошибки
  window.addEventListener('unhandledrejection', function(event) {
    const errorData = {
      type: 'promise_error',
      reason: String(event.reason || 'Unknown promise rejection'),
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString()
    };

    sendErrorToBot(errorData);

    console.error('Promise rejection logged:', errorData);
  });

  console.log('✅ Error logging to Telegram bot initialized (Calendar)');
})();
