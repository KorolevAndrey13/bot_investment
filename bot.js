require('dotenv').config();
const TOKEN = process.env.TELEGRAM_TOKEN;

const { Telegraf, Markup } = require('telegraf');

const bot = new Telegraf(TOKEN);

const sessions = new Map();

bot.start((ctx) => {
  sessions.set(ctx.chat.id, {});
  ctx.reply('Привет! Что ты хочешь рассчитать?', Markup.keyboard([
    ['📈 Сколько я накоплю за...'],
    ['⏳ За сколько я накоплю...']
  ]).resize());
});

bot.hears('📈 Сколько я накоплю за...', (ctx) => {
  const session = sessions.get(ctx.chat.id) || {};
  session.mode = 'future_value';
  ctx.reply('Введите срок накопления в месяцах:');
  sessions.set(ctx.chat.id, session);
});

bot.hears('⏳ За сколько я накоплю...', (ctx) => {
  const session = sessions.get(ctx.chat.id) || {};
  session.mode = 'time_needed';
  ctx.reply('Введите желаемую сумму накоплений:');
  sessions.set(ctx.chat.id, session);
});

bot.on('text', (ctx) => {
  const session = sessions.get(ctx.chat.id) || {};

  if (session.mode === 'future_value') {
    if (!session.months) {
      session.months = parseInt(ctx.message.text);
      ctx.reply('Введите сумму ежемесячного пополнения:');
    } else if (!session.monthly) {
      session.monthly = parseFloat(ctx.message.text);
      ctx.reply('Введите годовой процент инвестирования (например 8):');
    } else if (!session.percent) {
      session.percent = parseFloat(ctx.message.text);
      const { months, monthly, percent } = session;
      const r = percent / 100 / 12;
      const fv = monthly * ((Math.pow(1 + r, months) - 1) / r);

      ctx.reply(`💰 Через ${months} мес ты накопишь: ${fv.toFixed(2)} ₽`);
      sessions.delete(ctx.chat.id);
    }
  }

  else if (session.mode === 'time_needed') {
    if (!session.target) {
      session.target = parseFloat(ctx.message.text);
      ctx.reply('Введите сумму ежемесячного пополнения:');
    } else if (!session.monthly) {
      session.monthly = parseFloat(ctx.message.text);
      ctx.reply('Введите годовой процент инвестирования:');
    } else if (!session.percent) {
      session.percent = parseFloat(ctx.message.text);

      const { target, monthly, percent } = session;
      const r = percent / 100 / 12;
      let months = 0;
      let total = 0;

      while (total < target && months < 1000) {
        total = monthly * ((Math.pow(1 + r, months) - 1) / r);
        months++;
      }

      if (months >= 1000) {
        ctx.reply('❌ Цель недостижима с текущими параметрами.');
      } else {
        ctx.reply(`🕒 Ты достигнешь цели через ${months} мес`);
      }

      sessions.delete(ctx.chat.id);
    }
  }
});

bot.launch();
