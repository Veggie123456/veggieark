const { Telegraf } = require("telegraf");
const { BOT_TOKEN, GROUP_ID } = require("./config");
const { pickRandomAnimal, ANIMALS } = require("./animals");
const { incrementCapture, getUserInventory } = require("./db");

const bot = new Telegraf(BOT_TOKEN);

// Log basic identity for debugging
bot.telegram.getMe().then((me) => {
  try {
    console.log(`Bot @${me.username} ready (id=${me.id}) · GROUP_ID=${GROUP_ID ?? 'unset'}`);
  } catch (_) {}
}).catch(() => {});

function isAllowedGroup(ctx) {
  // When GROUP_ID is configured, enforce it. If not configured, allow everywhere for testing.
  if (GROUP_ID == null) return true;
  return ctx.chat && ctx.chat.id === GROUP_ID;
}

function getUserIdentity(ctx) {
  const from = ctx.from || {};
  const identity = {
    telegramId: from.id,
    username: from.username || null,
    firstName: from.first_name || null,
    lastName: from.last_name || null,
    mention: from.username ? `@${from.username}` : (from.first_name || "Someone"),
  };
  return identity;
}
function safe(handler) {
  return async (ctx) => {
    try {
      await handler(ctx);
    } catch (err) {
      console.error("Handler error:", err);
      try {
        await ctx.reply("Something went wrong. Please try again.");
      } catch (_) {}
    }
  };
}

bot.command("save", safe(async (ctx) => {
  if (!isAllowedGroup(ctx)) {
    return; // ignore outside the allowed group when enforced
  }
  const u = getUserIdentity(ctx);
  try { console.log(`/save by ${u.telegramId} in chat ${ctx.chat && ctx.chat.id}`); } catch (_) {}

  const animal = pickRandomAnimal();
  const result = await incrementCapture(
    u.telegramId,
    u.username,
    u.firstName,
    u.lastName,
    animal
  );

  const rarityLabel = {
    legendary: "Legendary",
    epic: "Epic",
    rare: "Rare",
    uncommon: "Uncommon",
    common: "Common",
  }[animal.rarity] || animal.rarity;

  const lines = [
    `${animal.emoji} ${u.mention} rescued a ${animal.name}!`,
    `Rarity: ${rarityLabel} · Count: x${result && result.count ? result.count : 1}`,
  ];
  await ctx.reply(lines.join("\n"));
}));

bot.command("animals", safe(async (ctx) => {
  if (!isAllowedGroup(ctx)) {
    return; // ignore outside the allowed group when enforced
  }
  const u = getUserIdentity(ctx);
  try { console.log(`/animals by ${u.telegramId} in chat ${ctx.chat && ctx.chat.id}`); } catch (_) {}

  const items = await getUserInventory(u.telegramId, u.username);
  if (!items || items.length === 0) {
    return ctx.reply(`${u.mention} has no rescued animals yet. Use /save to rescue one!`);
  }

  const header = `${u.mention}'s Ark`;
  const lines = items.map((i) => `${i.emoji} ${i.animal} · ${i.rarity} · x${i.count}`);
  const message = `${header}:\n` + lines.join("\n");
  await ctx.reply(message);
}));
// Help (renamed to /helpark)
bot.command("helpark", safe(async (ctx) => {
  const lines = [
    "Welcome to Noah's Ark!",
    "",
    "Commands:",
    "- /save — Rescue a random animal",
    "- /animals — See your saved animals",
    "- /arklist — View all possible animals and rarities",
    "- /arkhelp — Show this help",
  ];
  await ctx.reply(lines.join("\n"));
}));

// Help alias: /arkhelp
bot.command("arkhelp", safe(async (ctx) => {
  const lines = [
    "Welcome to Noah's Ark!",
    "",
    "Commands:",
    "- /save — Rescue a random animal",
    "- /animals — See your saved animals",
    "- /arklist — View all possible animals and rarities",
    "- /arkhelp — Show this help",
  ];
  await ctx.reply(lines.join("\n"));
}));
// List all animals and rarities
bot.command("arklist", safe(async (ctx) => {
  if (!isAllowedGroup(ctx)) {
    return;
  }
  const byRarity = {
    legendary: [],
    epic: [],
    rare: [],
    uncommon: [],
    common: [],
  };
  for (const a of ANIMALS) {
    byRarity[a.rarity] = byRarity[a.rarity] || [];
    byRarity[a.rarity].push(`${a.emoji} ${a.name}`);
  }
  const order = ["legendary", "epic", "rare", "uncommon", "common"];
  const rarityTitle = {
    legendary: "Legendary",
    epic: "Epic",
    rare: "Rare",
    uncommon: "Uncommon",
    common: "Common",
  };
  const chunks = order
    .filter((r) => byRarity[r] && byRarity[r].length)
    .map((r) => `${rarityTitle[r]}:\n` + byRarity[r].join(", "));
  await ctx.reply(chunks.join("\n\n"));
}));

// Global error catcher
bot.catch((err, ctx) => {
  console.error("Global bot error:", err);
  if (ctx && ctx.reply) {
    ctx.reply("Unexpected error. Please try again.").catch(() => {});
  }
});
// Start the bot
bot.launch();
// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));


