// Временный файл чтобы узнать ваш Telegram ID
const { Telegraf } = require("telegraf");
const { token } = require("./config");

const bot = new Telegraf(token);

bot.start((ctx) => {
  const yourId = ctx.from.id;
  ctx.reply(`Ваш Telegram ID: ${yourId}\n\nСкопируйте его и добавьте в config.js`);
  console.log(`\n✅ ВАШ TELEGRAM ID: ${yourId}\n`);
});

bot.launch();
console.log("Бот запущен! Напишите ему /start чтобы узнать свой ID");

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
