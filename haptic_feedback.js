// ============================================
// ТАКТИЛЬНАЯ ВИБРАЦИЯ ДЛЯ КАЛЕНДАРЯ
// ============================================
// Добавьте этот код в <script> тег в index.html
// Вставить ПЕРЕД закрывающим </script> (примерно строка 7000+)

(function() {
  // Проверяем поддержку Vibration API
  const isVibrationSupported = 'vibrate' in navigator;

  // Паттерны вибрации (в миллисекундах)
  const HAPTIC = {
    light: 15,       // Легкая вибрация
    medium: 25,      // Средняя вибрация
    strong: 35,      // Сильная вибрация
    date: [20, 30, 20],  // Особый паттерн для выбора даты! (два импульса)
    success: [15, 50, 15],  // Паттерн успеха
    error: [10, 50, 10, 50, 10]  // Паттерн ошибки
  };

  // Главная функция вибрации
  window.hapticFeedback = function(type = 'medium') {
    if (!isVibrationSupported) return;
    const pattern = HAPTIC[type] || HAPTIC.medium;
    navigator.vibrate(pattern);
  };

  // Ждем загрузки DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHaptics);
  } else {
    initHaptics();
  }

  function initHaptics() {
    console.log('✅ Calendar Haptic feedback initialized', { supported: isVibrationSupported });

    // ============================================
    // КЛИК ПО ДАТАМ КАЛЕНДАРЯ (ОСОБЕННО ВАЖНО!)
    // ============================================
    // Перехватываем функцию selectDate для вибрации
    if (window.selectDate) {
      const originalSelectDate = window.selectDate;

      window.selectDate = function(date) {
        // СИЛЬНАЯ ВИБРАЦИЯ С ДВОЙНЫМ ИМПУЛЬСОМ для выбора даты!
        hapticFeedback('date');

        // Вызываем оригинальную функцию
        return originalSelectDate.call(this, date);
      };
    }

    // ============================================
    // ПЕРЕОПРЕДЕЛЯЕМ ФУНКЦИИ СОБЫТИЙ
    // ============================================

    // Перехватываем saveEvent - сохранение события
    if (window.saveEvent) {
      const originalSaveEvent = window.saveEvent;

      window.saveEvent = function() {
        // Паттерн успеха при сохранении
        hapticFeedback('success');

        // Вызываем оригинальную функцию
        return originalSaveEvent.call(this);
      };
    }

    // Перехватываем deleteEvent - удаление события
    if (window.deleteEvent) {
      const originalDeleteEvent = window.deleteEvent;

      window.deleteEvent = function() {
        // Средняя вибрация при удалении
        hapticFeedback('medium');

        // Вызываем оригинальную функцию
        return originalDeleteEvent.call(this);
      };
    }

    // Перехватываем openEventModal - открытие модального окна
    if (window.openEventModal) {
      const originalOpenEventModal = window.openEventModal;

      window.openEventModal = function(date) {
        // Легкая вибрация при открытии модалки
        hapticFeedback('light');

        // Вызываем оригинальную функцию
        return originalOpenEventModal.call(this, date);
      };
    }

    // ============================================
    // ПЕРЕОПРЕДЕЛЯЕМ showToast ДЛЯ АВТОМАТИЧЕСКОЙ ВИБРАЦИИ
    // ============================================
    if (window.showToast) {
      const originalShowToast = window.showToast;

      window.showToast = function(message) {
        // Определяем тип вибрации по сообщению
        if (message.includes('сохранено') || message.includes('Сохранено') || message.includes('удалено') || message.includes('Удалено')) {
          hapticFeedback('success');  // Успех - двойной импульс
        } else if (message.includes('ошибка') || message.includes('Ошибка') || message.includes('❌')) {
          hapticFeedback('error');  // Ошибка - паттерн
        } else {
          hapticFeedback('light');  // Остальное - легкая
        }

        // Вызываем оригинальную функцию
        return originalShowToast.call(this, message);
      };
    }

    // ============================================
    // ДОБАВЛЯЕМ ВИБРАЦИЮ НА КНОПКИ
    // ============================================

    // Кнопки навигации по месяцам
    document.querySelectorAll('[onclick*="changeMonth"]').forEach(btn => {
      btn.addEventListener('click', () => {
        hapticFeedback('light');
      });
    });

    // Кнопки табов (календарь, создать, дашборд)
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        hapticFeedback('medium');
      });
    });

    // Кнопки первичных действий (сохранить, создать и т.д.)
    document.querySelectorAll('.btn-primary').forEach(btn => {
      btn.addEventListener('click', () => {
        hapticFeedback('medium');
      });
    });

    // Кнопки вторичных действий (отмена и т.д.)
    document.querySelectorAll('.btn-secondary').forEach(btn => {
      btn.addEventListener('click', () => {
        hapticFeedback('light');
      });
    });

    // Кнопки опасных действий (удалить)
    document.querySelectorAll('.btn-danger').forEach(btn => {
      btn.addEventListener('click', () => {
        hapticFeedback('medium');
      });
    });

    // Кнопки заголовков секций (раскрываемые секции)
    document.querySelectorAll('[onclick*="toggleSection"]').forEach(btn => {
      btn.addEventListener('click', () => {
        hapticFeedback('light');
      });
    });

    // Кнопка закрытия модальных окон
    document.querySelectorAll('.modal-close').forEach(btn => {
      btn.addEventListener('click', () => {
        hapticFeedback('light');
      });
    });

    // ============================================
    // ДОПОЛНИТЕЛЬНЫЕ ФУНКЦИИ ДЛЯ РАЗРАБОТЧИКА
    // ============================================

    // Функция вибрации при ошибке
    window.hapticError = function() {
      hapticFeedback('error');
    };

    // Функция вибрации при успехе
    window.hapticSuccess = function() {
      hapticFeedback('success');
    };

    // Функция вибрации при выборе даты (для ручного использования)
    window.hapticDateSelect = function() {
      hapticFeedback('date');
    };
  }

  console.log('📳 Calendar Haptic feedback module loaded');
})();
