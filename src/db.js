const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");
const { Pool } = require("pg");

const dataDir = path.join(__dirname, "..", "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbFile = path.join(dataDir, "noahark.sqlite3");
const DATABASE_URL = process.env.DATABASE_URL;

let db = null;
let pgPool = null;
let driver = "sqlite";
if (DATABASE_URL) {
  driver = "pg";
  pgPool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
} else {
  db = new Database(dbFile);
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
}

if (driver === "sqlite") {
  // Ensure base tables exist with the latest schema (SQLite)
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      telegram_id INTEGER UNIQUE,
      username TEXT UNIQUE,
      first_name TEXT,
      last_name TEXT
    );
    CREATE TABLE IF NOT EXISTS captures (
      id INTEGER PRIMARY KEY,
      user_id INTEGER NOT NULL,
      animal TEXT NOT NULL,
      emoji TEXT NOT NULL,
      rarity TEXT NOT NULL,
      count INTEGER NOT NULL DEFAULT 0,
      UNIQUE(user_id, animal),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
} else {
  // Ensure base tables exist with the latest schema (Postgres)
  const ensurePgSchema = async () => {
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        telegram_id BIGINT UNIQUE,
        username TEXT UNIQUE,
        first_name TEXT,
        last_name TEXT
      );
    `);
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS captures (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        animal TEXT NOT NULL,
        emoji TEXT NOT NULL,
        rarity TEXT NOT NULL,
        count INTEGER NOT NULL DEFAULT 0,
        UNIQUE(user_id, animal)
      );
    `);
  };
  // Fire and forget init
  ensurePgSchema().catch((e) => console.error("Failed to ensure PG schema", e));
}

// Lightweight migrations for older installs
if (driver === "sqlite") {
  // 1) If users table exists without telegram_id column, add it
  const userCols = db.prepare("PRAGMA table_info(users)").all();
  const hasTelegramId = userCols.some((c) => c.name === "telegram_id");
  if (!hasTelegramId) {
    // SQLite cannot add a UNIQUE column directly; add column, then create unique index
    db.exec("ALTER TABLE users ADD COLUMN telegram_id INTEGER");
    db.exec(
      "CREATE UNIQUE INDEX IF NOT EXISTS users_telegram_id_unique ON users(telegram_id)"
    );
  }
  // 2) If username column is NOT NULL in an older schema, rebuild table to allow NULL
  const usernameCol = userCols.find((c) => c.name === "username");
  if (usernameCol && usernameCol.notnull === 1) {
    const tx = db.transaction(() => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS users_new (
          id INTEGER PRIMARY KEY,
          telegram_id INTEGER UNIQUE,
          username TEXT UNIQUE,
          first_name TEXT,
          last_name TEXT
        );
      `);
      db.exec(`
        INSERT INTO users_new (id, telegram_id, username, first_name, last_name)
        SELECT id, telegram_id, username, first_name, last_name FROM users;
      `);
      db.exec("DROP TABLE users");
      db.exec("ALTER TABLE users_new RENAME TO users");
      // ensure unique index exists after rebuild
      db.exec(
        "CREATE UNIQUE INDEX IF NOT EXISTS users_telegram_id_unique ON users(telegram_id)"
      );
    });
    tx();
  }
}

let sqliteStatements = null;
if (driver === "sqlite") {
  sqliteStatements = {
    getUserByUsername: db.prepare(
      "SELECT id, username, telegram_id FROM users WHERE username = ?"
    ),
    getUserByTelegramId: db.prepare(
      "SELECT id, telegram_id FROM users WHERE telegram_id = ?"
    ),
    insertUserWithTelegram: db.prepare(
      "INSERT INTO users (telegram_id, username, first_name, last_name) VALUES (?, ?, ?, ?)"
    ),
    updateUserTelegramById: db.prepare(
      "UPDATE users SET telegram_id = ? WHERE id = ?"
    ),
    upsertCapture: db.prepare(`
      INSERT INTO captures (user_id, animal, emoji, rarity, count)
      VALUES (?, ?, ?, ?, 1)
      ON CONFLICT(user_id, animal) DO UPDATE SET count = count + 1
    `),
    findCapture: db.prepare(
      "SELECT count FROM captures WHERE user_id = ? AND animal = ?"
    ),
    getCapturesForUser: db.prepare(
      "SELECT animal, emoji, rarity, count FROM captures WHERE user_id = ?"
    ),
  };
}

async function getOrCreateUserId(telegramId, username, firstName, lastName) {
  if (driver === "sqlite") {
    if (telegramId != null) {
      const byTg = sqliteStatements.getUserByTelegramId.get(telegramId);
      if (byTg) return byTg.id;
    }
    if (username) {
      const byUsername = sqliteStatements.getUserByUsername.get(username);
      if (byUsername) {
        if (telegramId != null && byUsername.telegram_id == null) {
          sqliteStatements.updateUserTelegramById.run(telegramId, byUsername.id);
        }
        return byUsername.id;
      }
    }
    const info = sqliteStatements.insertUserWithTelegram.run(
      telegramId || null,
      username || null,
      firstName || null,
      lastName || null
    );
    return info.lastInsertRowid;
  } else {
    // PG path
    if (telegramId != null) {
      const res = await pgPool.query(
        "SELECT id FROM users WHERE telegram_id = $1",
        [telegramId]
      );
      if (res.rows.length) return res.rows[0].id;
    }
    if (username) {
      const res = await pgPool.query(
        "SELECT id, telegram_id FROM users WHERE username = $1",
        [username]
      );
      if (res.rows.length) {
        const row = res.rows[0];
        if (telegramId != null && row.telegram_id == null) {
          await pgPool.query("UPDATE users SET telegram_id = $1 WHERE id = $2", [telegramId, row.id]);
        }
        return row.id;
      }
    }
    const insert = await pgPool.query(
      "INSERT INTO users (telegram_id, username, first_name, last_name) VALUES ($1,$2,$3,$4) RETURNING id",
      [telegramId || null, username || null, firstName || null, lastName || null]
    );
    return insert.rows[0].id;
  }
}

async function incrementCapture(telegramId, username, firstName, lastName, capture) {
  const userId = await getOrCreateUserId(telegramId, username, firstName, lastName);
  if (driver === "sqlite") {
    sqliteStatements.upsertCapture.run(userId, capture.name, capture.emoji, capture.rarity);
    const row = sqliteStatements.findCapture.get(userId, capture.name);
    return { userId, count: row ? row.count : 1 };
  } else {
    await pgPool.query(
      `INSERT INTO captures (user_id, animal, emoji, rarity, count)
       VALUES ($1,$2,$3,$4,1)
       ON CONFLICT (user_id, animal)
       DO UPDATE SET count = captures.count + 1`,
      [userId, capture.name, capture.emoji, capture.rarity]
    );
    const res = await pgPool.query(
      "SELECT count FROM captures WHERE user_id = $1 AND animal = $2",
      [userId, capture.name]
    );
    const count = res.rows.length ? res.rows[0].count : 1;
    return { userId, count };
  }
}

async function getUserInventory(telegramId, username) {
  if (driver === "sqlite") {
    let user = null;
    if (telegramId != null) {
      user = sqliteStatements.getUserByTelegramId.get(telegramId);
    }
    if (!user && username) {
      user = sqliteStatements.getUserByUsername.get(username);
    }
    if (!user) return [];
    const rows = sqliteStatements.getCapturesForUser.all(user.id);
    const rarityRank = { legendary: 1, epic: 2, rare: 3, uncommon: 4, common: 5 };
    return rows
      .slice()
      .sort((a, b) => {
        const r = (rarityRank[a.rarity] || 99) - (rarityRank[b.rarity] || 99);
        if (r !== 0) return r;
        if (b.count !== a.count) return b.count - a.count;
        return a.animal.localeCompare(b.animal);
      });
  } else {
    let userId = null;
    if (telegramId != null) {
      const res = await pgPool.query("SELECT id FROM users WHERE telegram_id = $1", [telegramId]);
      if (res.rows.length) userId = res.rows[0].id;
    }
    if (!userId && username) {
      const res = await pgPool.query("SELECT id FROM users WHERE username = $1", [username]);
      if (res.rows.length) userId = res.rows[0].id;
    }
    if (!userId) return [];
    const res = await pgPool.query(
      "SELECT animal, emoji, rarity, count FROM captures WHERE user_id = $1",
      [userId]
    );
    const rarityRank = { legendary: 1, epic: 2, rare: 3, uncommon: 4, common: 5 };
    return res.rows
      .slice()
      .sort((a, b) => {
        const r = (rarityRank[a.rarity] || 99) - (rarityRank[b.rarity] || 99);
        if (r !== 0) return r;
        if (b.count !== a.count) return b.count - a.count;
        return a.animal.localeCompare(b.animal);
      });
  }
}

module.exports = {
  incrementCapture,
  getUserInventory,
};



