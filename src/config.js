require("dotenv").config();

const BOT_TOKEN = process.env.BOT_TOKEN;
const GROUP_ID_RAW = process.env.GROUP_ID;
if (!BOT_TOKEN) {
  throw new Error("Missing BOT_TOKEN in environment");
}

let GROUP_ID = undefined;
if (GROUP_ID_RAW && GROUP_ID_RAW.trim() !== "") {
  const parsed = Number(GROUP_ID_RAW);
  if (!Number.isFinite(parsed)) {
    throw new Error("GROUP_ID must be a number (e.g. -1001234567890)");
  }
  GROUP_ID = parsed;
}

module.exports = {
  BOT_TOKEN,
  GROUP_ID,
};


