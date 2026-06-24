const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
require("dotenv").config();

const app = express();

// CORS: allow production frontend and localhost during development
const FRONTEND_URL = process.env.FRONTEND_URL;
const allowedOrigins = [
  "https://latinms.redly.com.ar",
  "https://www.latinms.redly.com.ar",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:3000",
];
if (FRONTEND_URL && !allowedOrigins.includes(FRONTEND_URL)) {
  allowedOrigins.push(FRONTEND_URL);
}

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // allow non-browser requests like curl/postman
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("CORS not allowed"));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

const pool = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3307),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "cosmic",
  waitForConnections: true,
  connectionLimit: 10,
});

const VOTE_BASE_NX = Number(process.env.VOTE_BASE_NX || 500);
const VOTE_WEEKLY_BONUS_NX = Number(process.env.VOTE_WEEKLY_BONUS_NX || 1000);
const VOTE_MONTHLY_BONUS_NX = Number(process.env.VOTE_MONTHLY_BONUS_NX || 5000);
const VOTE_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const VOTE_STREAK_RESET_SECONDS = Number(process.env.VOTE_STREAK_RESET_SECONDS || 172800);
const GTOP100_PINGBACK_KEY = process.env.GTOP100_PINGBACK_KEY || "";
const VOTE_TOKEN_TTL_SECONDS = Number(process.env.VOTE_TOKEN_TTL_SECONDS || 3600); // 1 hora
const NEWS_IMAGE_MAX_BYTES = 500 * 1024;

const JWT_SECRET = process.env.JWT_SECRET || "dev_jwt_secret_change_me";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
const ADMIN_HTTP_URL = (process.env.ADMIN_HTTP_URL || "http://127.0.0.1:9001").replace(/\/+$/, "");
const ADMIN_HTTP_TOKEN = process.env.ADMIN_HTTP_TOKEN || "";
const PUBLIC_SITE_URL = (process.env.PUBLIC_SITE_URL || process.env.FRONTEND_URL || "https://latinms.redly.com.ar").replace(/\/+$/, "");
const PASSWORD_RESET_EXPIRES_MINUTES = Number(process.env.PASSWORD_RESET_EXPIRES_MINUTES || 30);
const SMTP_HOST = process.env.SMTP_HOST || "";
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_SECURE = String(process.env.SMTP_SECURE || "false").toLowerCase() === "true";
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER || "";

function hashPassword(password, algorithm) {
  return crypto.createHash(algorithm).update(password, "utf8").digest("hex");
}

function verifyPassword(inputPassword, storedPassword) {
  if (!inputPassword || !storedPassword) return false;
  if (storedPassword === inputPassword) return true;

  if (storedPassword.startsWith("$2")) {
    try {
      return bcrypt.compareSync(inputPassword, storedPassword);
    } catch {
      return false;
    }
  }

  const normalizedStoredPassword = storedPassword.toLowerCase();
  return (
    hashPassword(inputPassword, "sha1") === normalizedStoredPassword ||
    hashPassword(inputPassword, "sha512") === normalizedStoredPassword
  );
}

function createPasswordResetToken() {
  return crypto.randomBytes(32).toString("hex");
}

function hashPasswordResetToken(token) {
  return crypto.createHash("sha256").update(token, "utf8").digest("hex");
}

function getPasswordResetUrl(token) {
  return `${PUBLIC_SITE_URL}/#reset-password?token=${encodeURIComponent(token)}`;
}

// `vote_time` is a MySQL TIMESTAMP. Asking MySQL for its Unix epoch keeps the
// comparison independent from the Node process or database session timezone.
async function getVoteCooldownStatus(accountId) {
  const [rows] = await pool.query(
    `SELECT UNIX_TIMESTAMP(vote_time) * 1000 AS last_accepted_vote_ms
     FROM gtop100_votes
     WHERE account_id = ? AND status = 'accepted'
     ORDER BY vote_time DESC
     LIMIT 1`,
    [accountId]
  );

  const lastAcceptedVoteMs = Number(rows[0]?.last_accepted_vote_ms);
  if (!Number.isFinite(lastAcceptedVoteMs)) {
    return {
      canVote: true,
      lastAcceptedVote: null,
      nextVoteAt: null,
      remainingSeconds: 0,
    };
  }

  const nextVoteAtMs = lastAcceptedVoteMs + VOTE_COOLDOWN_MS;
  const remainingSeconds = Math.max(0, Math.ceil((nextVoteAtMs - Date.now()) / 1000));

  return {
    canVote: remainingSeconds === 0,
    lastAcceptedVote: new Date(lastAcceptedVoteMs).toISOString(),
    nextVoteAt: new Date(nextVoteAtMs).toISOString(),
    remainingSeconds,
  };
}

function createMailTransport() {
  if (!SMTP_HOST || !SMTP_FROM) {
    throw new Error("SMTP no configurado. Define SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS y SMTP_FROM.");
  }

  const transport = {
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
  };

  if (SMTP_USER || SMTP_PASS) {
    transport.auth = {
      user: SMTP_USER,
      pass: SMTP_PASS,
    };
  }

  return nodemailer.createTransport(transport);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function sendPasswordRecoveryEmail({ to, username, resetUrl, expiresMinutes }) {
  const transporter = createMailTransport();
  const subject = "Recuperacion de contrasena - LatinMS";
  const text = [
    `Hola ${username},`,
    "",
    "Recibimos una solicitud para recuperar la contrasena de tu cuenta de LatinMS.",
    `Usa este enlace para crear una nueva contrasena. Expira en ${expiresMinutes} minutos:`,
    resetUrl,
    "",
    "Si no solicitaste este cambio, ignora este correo.",
    "LatinMS",
  ].join("\n");
  const safeUsername = escapeHtml(username);
  const safeResetUrl = escapeHtml(resetUrl);
  const html = `
    <p>Hola ${safeUsername},</p>
    <p>Recibimos una solicitud para recuperar la contrasena de tu cuenta de LatinMS.</p>
    <p><a href="${safeResetUrl}">Crear nueva contrasena</a></p>
    <p>Este enlace expira en ${expiresMinutes} minutos.</p>
    <p>Si no solicitaste este cambio, ignora este correo.</p>
  `;

  await transporter.sendMail({
    from: SMTP_FROM,
    to,
    subject,
    text,
    html,
  });
}

// Create web_profiles table if not exists (non-intrusive)
async function ensureWebProfilesTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS web_profiles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        account_id INT NOT NULL UNIQUE,
        display_name VARCHAR(50),
        avatar_url VARCHAR(255),
        bio VARCHAR(255),
        instagram_url VARCHAR(255),
        discord_url VARCHAR(255),
        website_url VARCHAR(255),
        location VARCHAR(80),
        country VARCHAR(80),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    try {
      await pool.query("ALTER TABLE web_profiles ADD COLUMN country VARCHAR(80)");
    } catch (err) {
      if (err.code !== "ER_DUP_FIELDNAME") throw err;
    }
    for (const columnSql of [
      "ALTER TABLE web_profiles ADD COLUMN instagram_url VARCHAR(255)",
      "ALTER TABLE web_profiles ADD COLUMN discord_url VARCHAR(255)",
      "ALTER TABLE web_profiles ADD COLUMN website_url VARCHAR(255)",
      "ALTER TABLE web_profiles ADD COLUMN location VARCHAR(80)",
    ]) {
      try {
        await pool.query(columnSql);
      } catch (err) {
        if (err.code !== "ER_DUP_FIELDNAME") throw err;
      }
    }
    console.log("web_profiles table ensured");
  } catch (err) {
    console.error("Error ensuring web_profiles table:", err.message);
  }
}

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90) || "noticia";
}

function getDataUrlByteLength(dataUrl) {
  const base64 = String(dataUrl || "").split(",")[1] || "";
  return Buffer.byteLength(base64, "base64");
}

function validateNewsImage(dataUrl, required = true) {
  if (!dataUrl) {
    if (required) return "La imagen principal es requerida.";
    return "";
  }

  if (!String(dataUrl).startsWith("data:image/webp;base64,")) {
    return "Las imagenes deben estar recortadas y convertidas a WebP antes de guardarse.";
  }

  if (getDataUrlByteLength(dataUrl) > NEWS_IMAGE_MAX_BYTES) {
    return "Cada imagen debe pesar como maximo 500 KB.";
  }

  return "";
}

function normalizeGallery(gallery) {
  const source = Array.isArray(gallery) ? gallery : [];
  return source.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 8);
}

function mapNewsRow(row) {
  let gallery = [];
  try {
    gallery = JSON.parse(row.galeria_json || "[]");
  } catch {
    gallery = [];
  }

  return {
    id: row.id,
    titulo: row.titulo,
    resumen: row.resumen,
    contenido: row.contenido,
    categoria: row.categoria,
    imagen_principal: row.imagen_principal,
    galeria: Array.isArray(gallery) ? gallery : [],
    galeria_json: row.galeria_json,
    slug: row.slug,
    vistas: row.vistas,
    destacada: Boolean(row.destacada),
    estado: row.estado,
    fecha_publicacion: row.fecha_publicacion,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function createUniqueNewsSlug(title, currentId = null) {
  const base = slugify(title);
  let slug = base;
  let suffix = 2;

  while (true) {
    const params = [slug];
    let sql = "SELECT id FROM noticias WHERE slug = ? LIMIT 1";
    if (currentId) {
      sql = "SELECT id FROM noticias WHERE slug = ? AND id <> ? LIMIT 1";
      params.push(currentId);
    }

    const [rows] = await pool.query(sql, params);
    if (rows.length === 0) return slug;
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
}

async function ensureSocialTables() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS social_posts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        account_id INT NOT NULL,
        caption VARCHAR(500) NOT NULL,
        image_url MEDIUMTEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_social_posts_created (created_at),
        INDEX idx_social_posts_account (account_id)
      )
    `);
    await pool.query("ALTER TABLE social_posts MODIFY COLUMN image_url MEDIUMTEXT");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS social_post_likes (
        post_id INT NOT NULL,
        account_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (post_id, account_id)
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS social_post_comments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        post_id INT NOT NULL,
        account_id INT NOT NULL,
        comment VARCHAR(300) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_social_comments_post (post_id, created_at)
      )
    `);
    console.log("social tables ensured");
  } catch (err) {
    console.error("Error ensuring social tables:", err.message);
  }
}

async function ensureNoticiasTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS noticias (
        id INT AUTO_INCREMENT PRIMARY KEY,
        titulo VARCHAR(180) NOT NULL,
        resumen VARCHAR(320) NOT NULL,
        contenido MEDIUMTEXT NOT NULL,
        categoria VARCHAR(80) NOT NULL,
        imagen_principal MEDIUMTEXT NOT NULL,
        galeria_json MEDIUMTEXT,
        slug VARCHAR(120) NOT NULL UNIQUE,
        vistas INT NOT NULL DEFAULT 0,
        destacada TINYINT(1) NOT NULL DEFAULT 0,
        estado ENUM('Publicado', 'Borrador') NOT NULL DEFAULT 'Borrador',
        fecha_publicacion DATETIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_noticias_publicas (estado, fecha_publicacion),
        INDEX idx_noticias_categoria (categoria),
        INDEX idx_noticias_destacada (destacada)
      )
    `);
    console.log("noticias table ensured");
  } catch (err) {
    console.error("Error ensuring noticias table:", err.message);
  }
}

function getIpFromRequest(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || req.connection.remoteAddress || "unknown";
}

function normalizeVoteFieldFromSources(sources, names) {
  const normalizedNames = names.map((name) => name.toLowerCase());
  for (const source of sources) {
    if (!source || typeof source !== "object") continue;

    for (const name of names) {
      const value = source[name];
      if (typeof value !== "undefined") {
        return value;
      }
    }

    for (const [key, value] of Object.entries(source)) {
      if (normalizedNames.includes(key.toLowerCase()) && typeof value !== "undefined") {
        return value;
      }
    }
  }
  return undefined;
}

async function ensurePasswordResetTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        account_id INT NOT NULL,
        token_hash CHAR(64) NOT NULL UNIQUE,
        expires_at DATETIME NOT NULL,
        used_at DATETIME DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        request_ip VARCHAR(64) DEFAULT NULL,
        INDEX idx_password_reset_account (account_id),
        INDEX idx_password_reset_expires (expires_at),
        CONSTRAINT fk_password_reset_account FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
      )
    `);
    console.log("password_reset_tokens table ensured");
  } catch (err) {
    console.error("Error ensuring password_reset_tokens table:", err.message);
  }
}

function normalizeVoteField(req, names, extraSources = []) {
  return normalizeVoteFieldFromSources([req.query, ...extraSources, req.body], names);
}

function flattenVoteEntry(entry) {
  if (Array.isArray(entry)) {
    return entry.reduce((fields, part) => {
      if (part && typeof part === "object" && !Array.isArray(part)) {
        return { ...fields, ...part };
      }
      return fields;
    }, {});
  }

  return entry && typeof entry === "object" ? entry : {};
}

function buildLegacyVoteId(username, ip) {
  const date = new Date().toISOString().slice(0, 10);
  return `legacy:${username}:${ip}:${date}`;
}

async function processGTop100VoteEntry(req, entry, sharedFields = {}) {
  const fieldSources = [entry, sharedFields];

  const siteid = normalizeVoteField(req, ["siteid", "siteId", "SiteID", "site_id", "site"], fieldSources) || "gtop100";
  const pb_id =
    normalizeVoteField(req, ["pb_id", "pbId", "PB_ID", "pbid", "id", "ID", "voteid", "VoteID"], fieldSources) ||
    null;
  const successValue = normalizeVoteField(req, ["success", "Success", "Successful", "successful", "status"], fieldSources);
  const username = normalizeVoteField(req, [
    "username",
    "pingUsername",
    "PingUsername",
    "pingusername",
    "PINGUSERNAME",
    "pb_name",
    "PB_NAME",
    "name",
    "user",
    "account",
  ], fieldSources);
  const ip =
    normalizeVoteField(req, ["ip", "IP", "VoterIP", "voterIP", "voterip"], fieldSources) ||
    getIpFromRequest(req);
  const success = Number(successValue);

  if (typeof successValue === "undefined" || !username || Number.isNaN(success)) {
    console.warn("GTop100 pingback rejected: missing required fields", { siteid, pb_id, username, successValue });
    return { httpStatus: 400, body: { ok: false, message: "Faltan campos obligatorios en pingback" } };
  }

  const voteId = pb_id || buildLegacyVoteId(username, ip);

  // --- Resolución de cuenta: token seguro (nuevo flujo) o username (fallback legacy) ---
  // Un token válido es exactamente 64 caracteres hexadecimales.
  const TOKEN_RE = /^[0-9a-f]{64}$/i;
  let account = null;
  let resolvedVia = "legacy_username";

  if (TOKEN_RE.test(username)) {
    // Flujo nuevo: pingUsername contiene un vote_token
    const [tokenRows] = await pool.query(
      `SELECT vt.id AS token_id, vt.account_id, vt.account_name, vt.expires_at, vt.used_at,
              a.nxCredit, a.nxPrepaid
       FROM vote_tokens vt
       JOIN accounts a ON a.id = vt.account_id
       WHERE vt.token = ? LIMIT 1`,
      [username]
    );
    if (tokenRows.length === 0) {
      console.warn("GTop100 pingback rejected: vote token not found", { token: username.slice(0, 8) + "..." });
      return { httpStatus: 404, body: { ok: false, message: "Token de voto no encontrado" } };
    }
    const tokenRow = tokenRows[0];
    if (tokenRow.used_at) {
      console.warn("GTop100 pingback rejected: vote token already used", { accountId: tokenRow.account_id, tokenId: tokenRow.token_id });
      return { httpStatus: 200, body: { ok: false, status: "duplicate", message: "Token de voto ya utilizado" } };
    }
    if (new Date(tokenRow.expires_at) < new Date()) {
      console.warn("GTop100 pingback rejected: vote token expired", { accountId: tokenRow.account_id, tokenId: tokenRow.token_id });
      return { httpStatus: 400, body: { ok: false, message: "Token de voto expirado" } };
    }
    account = { id: tokenRow.account_id, name: tokenRow.account_name, nxCredit: tokenRow.nxCredit, nxPrepaid: tokenRow.nxPrepaid, _tokenId: tokenRow.token_id };
    resolvedVia = "vote_token";
    console.info("GTop100 pingback: account resolved via secure token", { accountId: account.id, account: account.name });
  } else {
    // Flujo legacy: pingUsername es el nombre de cuenta (texto libre)
    // ADVERTENCIA: propenso a errores con cuentas de nombres similares.
    const [accountRows] = await pool.query(
      "SELECT id, name, nxCredit, nxPrepaid FROM accounts WHERE UPPER(name) = UPPER(?) LIMIT 1",
      [username]
    );
    if (accountRows.length === 0) {
      console.warn("GTop100 pingback rejected: account not found (legacy flow)", { username });
      return { httpStatus: 404, body: { ok: false, message: "Cuenta no encontrada" } };
    }
    account = accountRows[0];
    console.warn("GTop100 pingback: account resolved via legacy username (inseguro)", { username, accountId: account.id, account: account.name });
  }
  const [existingRows] = await pool.query(
    "SELECT id FROM gtop100_votes WHERE siteid = ? AND pb_id = ? LIMIT 1",
    [siteid, voteId]
  );
  if (existingRows.length > 0) {
    console.warn("GTop100 vote duplicate", { accountId: account.id, siteid, pb_id: voteId });
    return { httpStatus: 200, body: { ok: false, status: "duplicate", message: "Voto duplicado" } };
  }

  const now = new Date();
  const [lastVoteRows] = await pool.query(
    `SELECT *, UNIX_TIMESTAMP(vote_time) * 1000 AS vote_time_ms
     FROM gtop100_votes
     WHERE account_id = ? AND status = 'accepted'
     ORDER BY vote_time DESC
     LIMIT 1`,
    [account.id]
  );
  const lastVote = lastVoteRows[0] || null;
  let streak = 1;
  let totalVotes = 0;
  let lastWeeklyReward = null;
  let lastMonthlyReward = null;
  let rewardNx = 0;
  let status = "rejected";
  let votedWithinDay = false;
  let weeklyBonus = 0;
  let monthlyBonus = 0;

  if (lastVote) {
    totalVotes = lastVote.total_votes || 0;
    lastWeeklyReward = lastVote.last_weekly_reward;
    lastMonthlyReward = lastVote.last_monthly_reward;
    const ageSeconds = (now.getTime() - Number(lastVote.vote_time_ms)) / 1000;
    if (ageSeconds < VOTE_COOLDOWN_MS / 1000) {
      votedWithinDay = true;
      streak = lastVote.streak || 0;
    } else if (ageSeconds <= VOTE_STREAK_RESET_SECONDS) {
      streak = (lastVote.streak || 0) + 1;
    } else {
      streak = 1;
      console.info("GTop100 vote streak reset", { accountId: account.id, username, ageSeconds });
    }
  }

  if (success === 0) {
    const [totalRows] = await pool.query(
      `SELECT COUNT(*) AS total_votes FROM gtop100_votes WHERE account_id = ? AND status = 'accepted'`,
      [account.id]
    );
    totalVotes = totalRows[0]?.total_votes ?? 0;
    if (!votedWithinDay) {
      rewardNx = VOTE_BASE_NX;
      status = "accepted";
      totalVotes += 1;
      if (streak >= 7 && streak % 7 === 0) {
        weeklyBonus = VOTE_WEEKLY_BONUS_NX;
        rewardNx += weeklyBonus;
        console.info("GTop100 weekly bonus delivered", { accountId: account.id, username, streak, weeklyBonus });
      }
      if (streak === 30) {
        monthlyBonus = VOTE_MONTHLY_BONUS_NX;
        rewardNx += monthlyBonus;
        console.info("GTop100 monthly bonus delivered", { accountId: account.id, username, streak, monthlyBonus });
      }
    } else {
      status = "too_soon";
      streak = lastVote ? lastVote.streak || 0 : 0;
      console.warn("GTop100 vote rejected: reward already granted in last 24h", { accountId: account.id, username, streak });
    }
  } else {
    status = "failed";
    streak = lastVote ? lastVote.streak || 0 : 0;
    console.warn("GTop100 pingback with non-zero success rejected", { accountId: account.id, username, success });
  }

  await pool.query(
    `INSERT INTO gtop100_votes
       (account_id, siteid, pb_id, success, status, vote_time, ip, reward_nx, streak, total_votes, last_weekly_reward, last_monthly_reward)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      account.id,
      String(siteid),
      String(voteId),
      success,
      status,
      now,
      ip,
      rewardNx,
      streak,
      totalVotes,
      weeklyBonus > 0 ? now : lastWeeklyReward,
      monthlyBonus > 0 ? now : lastMonthlyReward,
    ]
  );

  // Obtener id del voto recién insertado y marcar el token como usado
  const [insertedVoteRows] = await pool.query(
    "SELECT id FROM gtop100_votes WHERE account_id = ? AND pb_id = ? AND siteid = ? LIMIT 1",
    [account.id, String(voteId), String(siteid)]
  );
  const insertedVoteId = insertedVoteRows[0]?.id || null;

  if (resolvedVia === "vote_token" && account._tokenId) {
    await pool.query(
      "UPDATE vote_tokens SET used_at = ?, vote_id = ? WHERE id = ?",
      [now, insertedVoteId, account._tokenId]
    );
  }

  if (status === "accepted" && rewardNx > 0) {
    const previousNxCredit = account.nxCredit;
    const [updateResult] = await pool.query(
      `UPDATE accounts SET nxCredit = COALESCE(nxCredit, 0) + ? WHERE id = ?`,
      [rewardNx, account.id]
    );

    // Verificación post-update: consultar saldo real
    const [verifyRows] = await pool.query(
      "SELECT id, name, nxCredit, nxPrepaid FROM accounts WHERE id = ? LIMIT 1",
      [account.id]
    );
    const finalNxCredit = verifyRows[0]?.nxCredit ?? null;

    const updateLog = {
      resolvedVia,
      account: account.name,
      accountId: account.id,
      previousNxCredit,
      rewardNx,
      finalNxCredit,
      affectedRows: updateResult.affectedRows,
      changedRows: updateResult.changedRows,
    };
    if (updateResult.affectedRows === 0) {
      console.warn("GTop100 vote reward update affected 0 rows", updateLog);
    } else {
      console.info("GTop100 vote reward delivered", updateLog);
    }
  }

  return { httpStatus: 200, body: { ok: true, status, reward_nx: rewardNx, streak, total_votes: totalVotes } };
}

function getGTop100VoteEntries(req) {
  const common = req.body?.Common;
  if (Array.isArray(common) && common.length > 0) {
    return common.map(flattenVoteEntry);
  }

  return [flattenVoteEntry(req.body)];
}

// Genera un token seguro vinculado al account_id del usuario autenticado.
// El frontend usa este token como pingUsername en la URL de GTop100.
// Cuando llega el pingback, la API resuelve account_id desde el token
// en vez de hacer un lookup por nombre (que puede coincidir con cuentas similares).
app.post("/vote/token", authMiddleware, async (req, res) => {
  try {
    const uid = req.user.id;
    const [accountRows] = await pool.query(
      "SELECT id, name FROM accounts WHERE id = ? LIMIT 1",
      [uid]
    );
    if (accountRows.length === 0) {
      return res.status(404).json({ ok: false, message: "Cuenta no encontrada" });
    }
    const account = accountRows[0];

    const cooldown = await getVoteCooldownStatus(account.id);
    if (!cooldown.canVote) {
      return res.status(429).json({
        success: false,
        ok: false,
        code: "VOTE_COOLDOWN",
        message: "TodavÃ­a no pasaron 24 horas desde tu Ãºltimo voto.",
        nextVoteAt: cooldown.nextVoteAt,
        remainingSeconds: cooldown.remainingSeconds,
      });
    }

    // Invalidar tokens anteriores no usados de este usuario
    await pool.query(
      "DELETE FROM vote_tokens WHERE account_id = ? AND used_at IS NULL",
      [uid]
    );

    const token = require("crypto").randomBytes(32).toString("hex"); // 64 chars hex
    const expiresAt = new Date(Date.now() + VOTE_TOKEN_TTL_SECONDS * 1000);
    const ip = getIpFromRequest(req);

    await pool.query(
      `INSERT INTO vote_tokens (token, account_id, account_name, ip, expires_at)
       VALUES (?, ?, ?, ?, ?)`,
      [token, account.id, account.name, ip, expiresAt]
    );

    console.info("Vote token created", { accountId: account.id, account: account.name, expiresAt });
    return res.json({ ok: true, token, account_id: account.id, account_name: account.name, expires_at: expiresAt });
  } catch (err) {
    console.error("Error creating vote token:", err);
    return res.status(500).json({ ok: false, message: "Error generando token de voto" });
  }
});

app.all("/vote/gtop100/pingback", async (req, res) => {
  try {
    const pingbackKey = normalizeVoteField(req, [
      "pingbackkey",
      "pingbackKey",
      "PingbackKey",
      "key",
      "secret",
    ]);
    if (!GTOP100_PINGBACK_KEY) {
      console.error("GTop100 pingback request rejected because pingback key is not configured.");
      return res.status(500).json({ ok: false, message: "Pingback key no configurada" });
    }
    if (!pingbackKey || pingbackKey !== GTOP100_PINGBACK_KEY) {
      console.warn("GTop100 pingback rejected: invalid pingback key", { pingbackKey: !!pingbackKey });
      return res.status(401).json({ ok: false, message: "Pingback key inválida" });
    }

    const sharedFields = flattenVoteEntry(req.body);
    const entries = getGTop100VoteEntries(req);
    const results = [];
    for (const entry of entries) {
      results.push(await processGTop100VoteEntry(req, entry, sharedFields));
    }

    const failedResult = results.find((result) => result.httpStatus >= 400);
    if (failedResult) {
      return res.status(failedResult.httpStatus).json(failedResult.body);
    }

    return res.json({
      ok: true,
      results: results.map((result) => result.body),
      ...(results.length === 1 ? results[0].body : {}),
    });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      console.warn("GTop100 vote duplicate prevented by constraint", { error: err.message });
      return res.status(200).json({ ok: false, status: "duplicate", message: "Voto duplicado" });
    }
    console.error("Error processing GTop100 pingback:", err);
    return res.status(500).json({ ok: false, message: "Error interno al procesar voto", error: err.message });
  }
});

app.get("/vote/status", authMiddleware, async (req, res) => {
  try {
    const uid = req.user.id;
    const cooldown = await getVoteCooldownStatus(uid);
    const [latestRows] = await pool.query(
      `SELECT vote_time, streak, total_votes
       FROM gtop100_votes
       WHERE account_id = ? AND status = 'accepted'
       ORDER BY vote_time DESC
       LIMIT 1`,
      [uid]
    );
    const latest = latestRows[0] || null;
    const now = new Date();
    let streak = 0;
    let totalVotes = 0;

    if (latest) {
      streak = latest.streak || 0;
      totalVotes = latest.total_votes || 0;
    }

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const [monthRows] = await pool.query(
      `SELECT COALESCE(SUM(reward_nx), 0) AS nx_this_month
       FROM gtop100_votes
       WHERE account_id = ? AND success = 0 AND vote_time >= ?`,
      [uid, monthStart]
    );
    const nxThisMonth = monthRows[0]?.nx_this_month || 0;

    return res.json({
      success: true,
      ok: true,
      ...cooldown,
      rewardNx: VOTE_BASE_NX,
      alreadyVotedToday: !cooldown.canVote,
      nextVoteInSeconds: cooldown.remainingSeconds,
      currentStreak: streak,
      nxGainedThisMonthApprox: nxThisMonth,
      lastVoteTime: cooldown.lastAcceptedVote,
      totalVotes,
    });
  } catch (err) {
    console.error("Error getting vote status:", err);
    return res.status(500).json({ ok: false, message: "Error obteniendo estado de votación", error: err.message });
  }
});

async function ensureGTop100VotesTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS gtop100_votes (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        account_id INT UNSIGNED NOT NULL,
        siteid VARCHAR(64) NOT NULL,
        pb_id VARCHAR(128) NOT NULL,
        success TINYINT UNSIGNED NOT NULL DEFAULT 0,
        status VARCHAR(32) NOT NULL,
        vote_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        ip VARCHAR(45) NOT NULL,
        reward_nx INT NOT NULL DEFAULT 0,
        streak INT NOT NULL DEFAULT 0,
        total_votes INT NOT NULL DEFAULT 0,
        last_weekly_reward TIMESTAMP NULL DEFAULT NULL,
        last_monthly_reward TIMESTAMP NULL DEFAULT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY unique_vote (siteid, pb_id),
        KEY account_idx (account_id)
      )
    `);
    console.log("gtop100_votes table ensured");
  } catch (err) {
    console.error("Error ensuring gtop100_votes table:", err.message);
  }
}

async function ensureVoteTokensTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS vote_tokens (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        token CHAR(64) NOT NULL,
        account_id INT UNSIGNED NOT NULL,
        account_name VARCHAR(64) NOT NULL,
        ip VARCHAR(45) NOT NULL DEFAULT '',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NOT NULL,
        used_at DATETIME DEFAULT NULL,
        vote_id INT UNSIGNED DEFAULT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_token (token),
        KEY idx_account (account_id),
        KEY idx_expires (expires_at)
      )
    `);
    console.log("vote_tokens table ensured");
  } catch (err) {
    console.error("Error ensuring vote_tokens table:", err.message);
  }
}

// Auth middleware
function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer "))
    return res.status(401).json({ ok: false, message: "No autorizado" });

  const token = auth.split(" ")[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { id: payload.id, name: payload.name };
    return next();
  } catch (err) {
    return res.status(401).json({ ok: false, message: "Token inválido" });
  }
}

function getOptionalUser(req) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) return null;

  try {
    const payload = jwt.verify(auth.split(" ")[1], JWT_SECRET);
    return { id: payload.id, name: payload.name };
  } catch {
    return null;
  }
}

// Admin middleware dinámico
async function adminMiddleware(req, res, next) {
  try {
    const uid = req.user.id;
    const dbName = process.env.DB_NAME || "cosmic";

    console.log(`[AdminCheck] Verificando permisos para UID: ${uid} en DB: ${dbName}`);

    // Verificar columnas existentes en la tabla accounts
    const [accCols] = await pool.query(
      "SELECT COLUMN_NAME FROM information_schema.columns WHERE table_schema = ? AND table_name = 'accounts'",
      [dbName]
    );
    const accColNames = accCols.map(c => c.COLUMN_NAME.toLowerCase());
    console.log(`[AdminCheck] Columnas encontradas en accounts:`, accColNames);

    let isAdmin = false;
    const accChecks = [];
    if (accColNames.includes('gm')) accChecks.push("gm > 0");
    if (accColNames.includes('admin')) accChecks.push("admin > 0");

    if (accChecks.length > 0) {
      const [accRows] = await pool.query(
        `SELECT id FROM accounts WHERE id = ? AND (${accChecks.join(" OR ")}) LIMIT 1`,
        [uid]
      );
      console.log(`[AdminCheck] Resultado chequeo cuentas:`, accRows.length > 0 ? "Admin encontrado" : "No es admin en accounts");
      if (accRows.length > 0) isAdmin = true;
    }

    // Si no es admin por cuenta, verificar si tiene algún personaje GM
    if (!isAdmin) {
      const [charCols] = await pool.query(
        "SELECT COLUMN_NAME FROM information_schema.columns WHERE table_schema = ? AND table_name = 'characters'",
        [dbName]
      );
      const charColNames = charCols.map(c => c.COLUMN_NAME.toLowerCase());

      if (charColNames.includes('gm')) {
        const [charRows] = await pool.query(
          "SELECT id FROM characters WHERE accountid = ? AND gm > 0 LIMIT 1",
          [uid]
        );
        console.log(`[AdminCheck] Resultado chequeo personajes:`, charRows.length > 0 ? "GM encontrado" : "No tiene personajes GM");
        if (charRows.length > 0) isAdmin = true;
      }
    }

    if (!isAdmin) {
      console.warn(`[AdminCheck] Acceso denegado para UID: ${uid}`);
      return res.status(403).json({ ok: false, message: "No tenés permisos de administrador." });
    }

    next();
  } catch (err) {
    console.error("Error en adminMiddleware:", err);
    res.status(500).json({ ok: false, message: "Error al verificar permisos." });
  }
}

async function loadOnlinePlayersFromAdminHttp() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);

  try {
    const headers = {};
    if (ADMIN_HTTP_TOKEN) headers["X-Admin-Token"] = ADMIN_HTTP_TOKEN;

    const response = await fetch(`${ADMIN_HTTP_URL}/admin/online-players`, {
      headers,
      signal: controller.signal,
    });
    const body = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(`Admin HTTP ${response.status}`);
    }

    return Array.isArray(body?.players) ? body.players : [];
  } finally {
    clearTimeout(timeout);
  }
}

async function loadOnlinePlayersFromDatabase() {
  try {
    const [rows] = await pool.query(`
      SELECT
        c.id,
        c.name,
        c.map
      FROM characters c
      INNER JOIN accounts a ON a.id = c.accountid
      WHERE a.loggedin > 0
      ORDER BY c.name ASC
      LIMIT 100
    `);

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      map: row.map,
    }));
  } catch (err) {
    console.warn("Online players DB fallback failed:", err.message);
    return [];
  }
}

async function loadOnlinePlayers() {
  try {
    return await loadOnlinePlayersFromAdminHttp();
  } catch (err) {
    console.warn("Admin HTTP online players unavailable, using DB fallback:", err.message);
    return loadOnlinePlayersFromDatabase();
  }
}

app.get("/admin/stats", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const dbName = process.env.DB_NAME || "cosmic";

    const [accCols] = await pool.query("SELECT COLUMN_NAME FROM information_schema.columns WHERE table_schema = ? AND table_name = 'accounts'", [dbName]);
    const accColNames = accCols.map(c => c.COLUMN_NAME.toLowerCase());

    const [charCols] = await pool.query("SELECT COLUMN_NAME FROM information_schema.columns WHERE table_schema = ? AND table_name = 'characters'", [dbName]);
    const charColNames = charCols.map(c => c.COLUMN_NAME.toLowerCase());

    const stats = {};

    // Conteos básicos
    const [totalAcc] = await pool.query("SELECT COUNT(*) AS total FROM accounts");
    stats.totalAccounts = totalAcc[0].total;

    const [totalChar] = await pool.query("SELECT COUNT(*) AS total FROM characters");
    stats.totalCharacters = totalChar[0].total;

    // Baneados
    if (accColNames.includes('banned')) {
      const [banned] = await pool.query("SELECT COUNT(*) AS total FROM accounts WHERE banned = 1");
      stats.bannedAccounts = banned[0].total;
    } else stats.bannedAccounts = 0;

    // Online (loggedin)
    if (accColNames.includes('loggedin')) {
      const [online] = await pool.query("SELECT COUNT(*) AS total FROM accounts WHERE loggedin > 0");
      stats.onlineUsers = online[0].total;
    } else stats.onlineUsers = 0;

    // GMs en personajes
    if (charColNames.includes('gm')) {
      const [gms] = await pool.query("SELECT COUNT(*) AS total FROM characters WHERE gm > 0");
      stats.gmCharacters = gms[0].total;
    } else stats.gmCharacters = 0;

    stats.normalCharacters = stats.totalCharacters - stats.gmCharacters;

    // Listas (sin datos sensibles)
    stats.latestAccounts = (await pool.query("SELECT id, name FROM accounts ORDER BY id DESC LIMIT 5"))[0];
    stats.latestCharacters = (await pool.query("SELECT id, name, level, job FROM characters ORDER BY id DESC LIMIT 5"))[0];
    stats.onlineList = await loadOnlinePlayers();
    stats.voteRanking = (await pool.query(`
      SELECT
        v.account_id,
        a.name AS account_name,
        COUNT(*) AS accepted_votes,
        COALESCE(SUM(v.reward_nx), 0) AS total_reward_nx,
        MAX(v.vote_time) AS last_accepted_vote
      FROM gtop100_votes v
      INNER JOIN accounts a ON a.id = v.account_id
      WHERE v.status = 'accepted'
      GROUP BY v.account_id, a.name
      ORDER BY accepted_votes DESC, last_accepted_vote DESC, v.account_id ASC
      LIMIT 100
    `))[0];

    res.json({ ok: true, stats });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: "No se pudieron cargar las estadísticas.", error: err.message });
  }
});

app.get("/admin/online-players", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    return res.json({
      ok: true,
      players: await loadOnlinePlayers(),
    });
  } catch (err) {
    console.error("Error loading online players:", err.message);
    return res.status(500).json({
      ok: false,
      message: "No se pudieron cargar los jugadores online.",
      error: err.message,
    });
  }
});

app.get("/noticias", async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit || 6), 1), 24);
    const offset = Math.max(Number(req.query.offset || 0), 0);
    const search = String(req.query.search || "").trim();
    const categoria = String(req.query.categoria || "").trim();
    const desde = String(req.query.desde || "").trim();
    const hasta = String(req.query.hasta || "").trim();
    const where = ["estado = 'Publicado'", "fecha_publicacion <= NOW()"];
    const params = [];

    if (search) {
      where.push("(titulo LIKE ? OR resumen LIKE ? OR contenido LIKE ?)");
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (categoria && categoria !== "Todas" && categoria !== "All") {
      where.push("categoria = ?");
      params.push(categoria);
    }

    if (desde) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(desde)) return res.status(400).json({ ok: false, message: "Fecha desde invalida." });
      where.push("fecha_publicacion >= ?");
      params.push(`${desde} 00:00:00`);
    }

    if (hasta) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(hasta)) return res.status(400).json({ ok: false, message: "Fecha hasta invalida." });
      where.push("fecha_publicacion < DATE_ADD(?, INTERVAL 1 DAY)");
      params.push(`${hasta} 00:00:00`);
    }

    const [rows] = await pool.query(
      `SELECT id, titulo, resumen, contenido, categoria, imagen_principal, galeria_json, slug, vistas, destacada, estado, fecha_publicacion, created_at, updated_at
       FROM noticias
       WHERE ${where.join(" AND ")}
       ORDER BY destacada DESC, fecha_publicacion DESC, id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit + 1, offset]
    );

    return res.json({
      ok: true,
      noticias: rows.slice(0, limit).map(mapNewsRow),
      hasMore: rows.length > limit,
      nextOffset: offset + Math.min(rows.length, limit),
    });
  } catch (err) {
    console.error("Error loading noticias:", err);
    return res.status(500).json({ ok: false, message: "No se pudieron cargar las noticias.", error: err.message });
  }
});

app.get("/noticias/categorias", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT DISTINCT categoria
       FROM noticias
       WHERE estado = 'Publicado' AND fecha_publicacion <= NOW()
       ORDER BY categoria ASC`
    );
    return res.json({ ok: true, categorias: rows.map((row) => row.categoria).filter(Boolean) });
  } catch (err) {
    console.error("Error loading news categories:", err);
    return res.status(500).json({ ok: false, message: "No se pudieron cargar las categorias.", error: err.message });
  }
});

app.get("/noticias/:slug", async (req, res) => {
  try {
    const slug = String(req.params.slug || "").trim();
    const [rows] = await pool.query(
      `SELECT id, titulo, resumen, contenido, categoria, imagen_principal, galeria_json, slug, vistas, destacada, estado, fecha_publicacion, created_at, updated_at
       FROM noticias
       WHERE slug = ? AND estado = 'Publicado' AND fecha_publicacion <= NOW()
       LIMIT 1`,
      [slug]
    );

    if (rows.length === 0) return res.status(404).json({ ok: false, message: "Noticia no encontrada." });

    await pool.query("UPDATE noticias SET vistas = vistas + 1 WHERE id = ?", [rows[0].id]);
    rows[0].vistas = Number(rows[0].vistas || 0) + 1;

    const [relatedRows] = await pool.query(
      `SELECT id, titulo, resumen, categoria, imagen_principal, slug, vistas, destacada, estado, fecha_publicacion, created_at, updated_at
       FROM noticias
       WHERE id <> ? AND categoria = ? AND estado = 'Publicado' AND fecha_publicacion <= NOW()
       ORDER BY destacada DESC, fecha_publicacion DESC
       LIMIT 3`,
      [rows[0].id, rows[0].categoria]
    );

    return res.json({ ok: true, noticia: mapNewsRow(rows[0]), relacionadas: relatedRows.map(mapNewsRow) });
  } catch (err) {
    console.error("Error loading noticia detail:", err);
    return res.status(500).json({ ok: false, message: "No se pudo cargar la noticia.", error: err.message });
  }
});

app.get("/admin/noticias", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, titulo, resumen, contenido, categoria, imagen_principal, galeria_json, slug, vistas, destacada, estado, fecha_publicacion, created_at, updated_at
       FROM noticias
       ORDER BY created_at DESC, id DESC`
    );
    return res.json({ ok: true, noticias: rows.map(mapNewsRow) });
  } catch (err) {
    console.error("Error loading admin noticias:", err);
    return res.status(500).json({ ok: false, message: "No se pudieron cargar las noticias.", error: err.message });
  }
});

app.post("/admin/noticias", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const titulo = String(req.body.titulo || "").trim();
    const resumen = String(req.body.resumen || "").trim();
    const contenido = String(req.body.contenido || "").trim();
    const categoria = String(req.body.categoria || "").trim();
    const imagenPrincipal = String(req.body.imagen_principal || "").trim();
    const galeria = normalizeGallery(req.body.galeria);
    const estado = req.body.estado === "Publicado" ? "Publicado" : "Borrador";
    const destacada = req.body.destacada ? 1 : 0;
    const fechaPublicacion = req.body.fecha_publicacion ? new Date(req.body.fecha_publicacion) : new Date();

    if (!titulo || !resumen || !contenido || !categoria) {
      return res.status(400).json({ ok: false, message: "Titulo, resumen, contenido y categoria son requeridos." });
    }
    if (titulo.length > 180 || resumen.length > 320 || categoria.length > 80 || Number.isNaN(fechaPublicacion.getTime())) {
      return res.status(400).json({ ok: false, message: "Hay campos con formato invalido." });
    }

    const mainImageError = validateNewsImage(imagenPrincipal, true);
    if (mainImageError) return res.status(400).json({ ok: false, message: mainImageError });
    const galleryImageError = galeria.map((image) => validateNewsImage(image, false)).find(Boolean);
    if (galleryImageError) return res.status(400).json({ ok: false, message: galleryImageError });

    const slug = await createUniqueNewsSlug(titulo);
    const [created] = await pool.query(
      `INSERT INTO noticias
       (titulo, resumen, contenido, categoria, imagen_principal, galeria_json, slug, vistas, destacada, estado, fecha_publicacion)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
      [titulo, resumen, contenido, categoria, imagenPrincipal, JSON.stringify(galeria), slug, destacada, estado, fechaPublicacion]
    );

    const [rows] = await pool.query("SELECT * FROM noticias WHERE id = ? LIMIT 1", [created.insertId]);
    return res.status(201).json({ ok: true, message: "Noticia creada.", noticia: mapNewsRow(rows[0]) });
  } catch (err) {
    console.error("Error creating noticia:", err);
    return res.status(500).json({ ok: false, message: "No se pudo crear la noticia.", error: err.message });
  }
});

app.put("/admin/noticias/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ ok: false, message: "ID invalido." });

    const titulo = String(req.body.titulo || "").trim();
    const resumen = String(req.body.resumen || "").trim();
    const contenido = String(req.body.contenido || "").trim();
    const categoria = String(req.body.categoria || "").trim();
    const imagenPrincipal = String(req.body.imagen_principal || "").trim();
    const galeria = normalizeGallery(req.body.galeria);
    const estado = req.body.estado === "Publicado" ? "Publicado" : "Borrador";
    const destacada = req.body.destacada ? 1 : 0;
    const fechaPublicacion = req.body.fecha_publicacion ? new Date(req.body.fecha_publicacion) : new Date();

    if (!titulo || !resumen || !contenido || !categoria) {
      return res.status(400).json({ ok: false, message: "Titulo, resumen, contenido y categoria son requeridos." });
    }
    if (titulo.length > 180 || resumen.length > 320 || categoria.length > 80 || Number.isNaN(fechaPublicacion.getTime())) {
      return res.status(400).json({ ok: false, message: "Hay campos con formato invalido." });
    }

    const mainImageError = validateNewsImage(imagenPrincipal, true);
    if (mainImageError) return res.status(400).json({ ok: false, message: mainImageError });
    const galleryImageError = galeria.map((image) => validateNewsImage(image, false)).find(Boolean);
    if (galleryImageError) return res.status(400).json({ ok: false, message: galleryImageError });

    const slug = await createUniqueNewsSlug(titulo, id);
    const [updated] = await pool.query(
      `UPDATE noticias
       SET titulo = ?, resumen = ?, contenido = ?, categoria = ?, imagen_principal = ?, galeria_json = ?, slug = ?, destacada = ?, estado = ?, fecha_publicacion = ?
       WHERE id = ?`,
      [titulo, resumen, contenido, categoria, imagenPrincipal, JSON.stringify(galeria), slug, destacada, estado, fechaPublicacion, id]
    );

    if (updated.affectedRows === 0) return res.status(404).json({ ok: false, message: "Noticia no encontrada." });

    const [rows] = await pool.query("SELECT * FROM noticias WHERE id = ? LIMIT 1", [id]);
    return res.json({ ok: true, message: "Noticia actualizada.", noticia: mapNewsRow(rows[0]) });
  } catch (err) {
    console.error("Error updating noticia:", err);
    return res.status(500).json({ ok: false, message: "No se pudo actualizar la noticia.", error: err.message });
  }
});

app.delete("/admin/noticias/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ ok: false, message: "ID invalido." });
    const [deleted] = await pool.query("DELETE FROM noticias WHERE id = ?", [id]);
    if (deleted.affectedRows === 0) return res.status(404).json({ ok: false, message: "Noticia no encontrada." });
    return res.json({ ok: true, message: "Noticia eliminada." });
  } catch (err) {
    console.error("Error deleting noticia:", err);
    return res.status(500).json({ ok: false, message: "No se pudo eliminar la noticia.", error: err.message });
  }
});

app.get("/", (req, res) => {
  res.json({ ok: true, message: "Maple API funcionando" });
});

async function buildStatusPayload() {
  const [accounts] = await pool.query("SELECT COUNT(*) AS total FROM accounts");
  const [characters] = await pool.query("SELECT COUNT(*) AS total FROM characters");
  const [onlinePlayers] = await pool.query("SELECT COUNT(*) AS total FROM accounts WHERE loggedin > 0");
  const [loginStates] = await pool.query(`
    SELECT loggedin, COUNT(*) AS total
    FROM accounts
    GROUP BY loggedin
    ORDER BY loggedin
  `);

  return {
    ok: true,
    server: "online",
    statusVersion: "online-counter-v2",
    accounts: Number(accounts[0].total || 0),
    characters: Number(characters[0].total || 0),
    onlinePlayers: Number(onlinePlayers[0].total || 0),
    playersOnline: Number(onlinePlayers[0].total || 0),
    online_players: Number(onlinePlayers[0].total || 0),
    loginStates,
  };
}

app.get("/status", async (req, res) => {
  try {
    res.json(await buildStatusPayload());
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, server: "offline", message: "No se pudo conectar a la base de datos", error: error.message });
  }
});

app.get("/status/debug", async (req, res) => {
  try {
    const status = await buildStatusPayload();
    res.json({
      ...status,
      database: {
        host: process.env.DB_HOST || "127.0.0.1",
        port: Number(process.env.DB_PORT || 3307),
        name: process.env.DB_NAME || "cosmic",
      },
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, server: "offline", message: "No se pudo conectar a la base de datos", error: error.message });
  }
});

app.get("/social/posts", async (req, res) => {
  try {
    const user = getOptionalUser(req);
    const limit = Math.min(Math.max(Number(req.query.limit || 6), 1), 24);
    const offset = Math.max(Number(req.query.offset || 0), 0);
    const desde = String(req.query.desde || "").trim();
    const hasta = String(req.query.hasta || "").trim();
    const where = [];
    const params = [];

    if (desde) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(desde)) return res.status(400).json({ ok: false, message: "Fecha desde invalida." });
      where.push("sp.created_at >= ?");
      params.push(`${desde} 00:00:00`);
    }

    if (hasta) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(hasta)) return res.status(400).json({ ok: false, message: "Fecha hasta invalida." });
      where.push("sp.created_at < DATE_ADD(?, INTERVAL 1 DAY)");
      params.push(`${hasta} 00:00:00`);
    }

    const likedByMeSql = user
      ? "(SELECT COUNT(*) FROM social_post_likes mine WHERE mine.post_id = sp.id AND mine.account_id = ?) AS liked_by_me"
      : "0 AS liked_by_me";
    const queryParams = user ? [user.id, ...params, limit + 1, offset] : [...params, limit + 1, offset];
    const [posts] = await pool.query(`
      SELECT
        sp.id,
        sp.account_id,
        sp.caption,
        sp.image_url,
        sp.created_at,
        a.name AS account_name,
        wp.display_name,
        wp.avatar_url,
        (
          SELECT c.name
          FROM characters c
          WHERE c.accountid = sp.account_id
          ORDER BY c.level DESC, c.id DESC
          LIMIT 1
        ) AS main_character_name,
        (
          SELECT c.level
          FROM characters c
          WHERE c.accountid = sp.account_id
          ORDER BY c.level DESC, c.id DESC
          LIMIT 1
        ) AS level,
        (
          SELECT c.job
          FROM characters c
          WHERE c.accountid = sp.account_id
          ORDER BY c.level DESC, c.id DESC
          LIMIT 1
        ) AS job,
        (
          SELECT c.gender
          FROM characters c
          WHERE c.accountid = sp.account_id
          ORDER BY c.level DESC, c.id DESC
          LIMIT 1
        ) AS gender,
        (
          SELECT c.skincolor
          FROM characters c
          WHERE c.accountid = sp.account_id
          ORDER BY c.level DESC, c.id DESC
          LIMIT 1
        ) AS skin,
        (
          SELECT c.face
          FROM characters c
          WHERE c.accountid = sp.account_id
          ORDER BY c.level DESC, c.id DESC
          LIMIT 1
        ) AS face,
        (
          SELECT c.hair
          FROM characters c
          WHERE c.accountid = sp.account_id
          ORDER BY c.level DESC, c.id DESC
          LIMIT 1
        ) AS hair,
        (SELECT COUNT(*) FROM social_post_likes spl WHERE spl.post_id = sp.id) AS likes,
        (SELECT COUNT(*) FROM social_post_comments spc WHERE spc.post_id = sp.id) AS comments_count,
        ${likedByMeSql}
      FROM social_posts sp
      LEFT JOIN accounts a ON sp.account_id = a.id
      LEFT JOIN web_profiles wp ON sp.account_id = wp.account_id
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY sp.created_at DESC
      LIMIT ? OFFSET ?
    `, queryParams);

    const visiblePosts = posts.slice(0, limit);
    const postIds = visiblePosts.map((post) => post.id);
    let commentsByPost = new Map();

    if (postIds.length > 0) {
      const placeholders = postIds.map(() => "?").join(",");
      const [comments] = await pool.query(`
        SELECT
          spc.id,
          spc.post_id,
          spc.comment,
          spc.created_at,
          a.name AS account_name,
          wp.display_name
        FROM social_post_comments spc
        LEFT JOIN accounts a ON spc.account_id = a.id
        LEFT JOIN web_profiles wp ON spc.account_id = wp.account_id
        WHERE spc.post_id IN (${placeholders})
        ORDER BY spc.created_at ASC
      `, postIds);

      commentsByPost = comments.reduce((map, comment) => {
        const list = map.get(comment.post_id) || [];
        list.push(comment);
        map.set(comment.post_id, list.slice(-3));
        return map;
      }, new Map());
    }

    return res.json({
      ok: true,
      posts: visiblePosts.map((post) => ({
        ...post,
        likes: Number(post.likes || 0),
        comments_count: Number(post.comments_count || 0),
        liked_by_me: Number(post.liked_by_me || 0) > 0,
        comments: commentsByPost.get(post.id) || [],
      })),
      hasMore: posts.length > limit,
      nextOffset: offset + Math.min(posts.length, limit),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, message: "No se pudieron cargar los posteos.", error: err.message });
  }
});

app.post("/social/posts", authMiddleware, async (req, res) => {
  try {
    const uid = req.user.id;
    const { caption, image_url } = req.body;
    const cleanCaption = String(caption || "").trim();
    const cleanImageUrl = String(image_url || "").trim();

    if (!cleanCaption) return res.status(400).json({ ok: false, message: "El texto del post es requerido." });
    if (cleanCaption.length > 500) return res.status(400).json({ ok: false, message: "El post no puede superar 500 caracteres." });
    if (cleanImageUrl.length > 4_000_000) return res.status(400).json({ ok: false, message: "La imagen es demasiado pesada." });
    if (
      cleanImageUrl &&
      !/^https?:\/\/.+/i.test(cleanImageUrl) &&
      !/^data:image\/(png|jpe?g|gif|webp);base64,/i.test(cleanImageUrl)
    ) {
      return res.status(400).json({ ok: false, message: "La imagen debe ser una URL valida o una imagen cargada." });
    }

    await pool.query(
      "INSERT INTO social_posts (account_id, caption, image_url) VALUES (?, ?, ?)",
      [uid, cleanCaption, cleanImageUrl || null]
    );

    return res.json({ ok: true, message: "Post publicado correctamente." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, message: "No se pudo publicar el post.", error: err.message });
  }
});

app.post("/social/posts/:id/like", authMiddleware, async (req, res) => {
  try {
    const uid = req.user.id;
    const postId = Number(req.params.id);
    if (!Number.isFinite(postId)) return res.status(400).json({ ok: false, message: "Post invalido." });

    const [existing] = await pool.query("SELECT post_id FROM social_post_likes WHERE post_id = ? AND account_id = ? LIMIT 1", [postId, uid]);
    if (existing.length > 0) {
      await pool.query("DELETE FROM social_post_likes WHERE post_id = ? AND account_id = ?", [postId, uid]);
      return res.json({ ok: true, liked: false });
    }

    await pool.query("INSERT IGNORE INTO social_post_likes (post_id, account_id) VALUES (?, ?)", [postId, uid]);
    return res.json({ ok: true, liked: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, message: "No se pudo actualizar el like.", error: err.message });
  }
});

app.post("/social/posts/:id/comments", authMiddleware, async (req, res) => {
  try {
    const uid = req.user.id;
    const postId = Number(req.params.id);
    const comment = String(req.body.comment || "").trim();

    if (!Number.isFinite(postId)) return res.status(400).json({ ok: false, message: "Post invalido." });
    if (!comment) return res.status(400).json({ ok: false, message: "El comentario es requerido." });
    if (comment.length > 300) return res.status(400).json({ ok: false, message: "El comentario no puede superar 300 caracteres." });

    await pool.query("INSERT INTO social_post_comments (post_id, account_id, comment) VALUES (?, ?, ?)", [postId, uid, comment]);
    return res.json({ ok: true, message: "Comentario publicado." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, message: "No se pudo publicar el comentario.", error: err.message });
  }
});

app.get("/ranking", async (req, res) => {
  try {
    const { job, country } = req.query;
    const where = ["c.gm = 0"];
    const params = [];

    if (job && job !== "all") {
      const jobId = Number(job);
      if (!Number.isInteger(jobId)) {
        return res.status(400).json({ ok: false, message: "Filtro de job invalido." });
      }
      where.push("c.job = ?");
      params.push(jobId);
    }

    if (country && country !== "all") {
      where.push("p.country = ?");
      params.push(country);
    }

    const [rows] = await pool.query(`
      SELECT
        c.id,
        c.name,
        c.level,
        c.job,
        c.fame,
        c.gender,
        c.skincolor AS skin,
        c.face,
        c.hair,
        c.guildid,
        g.name AS guild_name,
        p.display_name,
        p.avatar_url,
        p.bio,
        p.instagram_url,
        p.discord_url,
        p.website_url,
        p.location,
        p.country
      FROM characters c
      LEFT JOIN guilds g ON c.guildid = g.guildid
      LEFT JOIN web_profiles p ON c.accountid = p.account_id
      WHERE ${where.join(" AND ")}
      ORDER BY c.level DESC, c.exp DESC
      LIMIT 50
    `, params);

    if (rows.length === 0) {
      return res.json({ ok: true, rankingVersion: "equips-filters-v1", filters: { job: job || "all", country: country || "all" }, ranking: [] });
    }

    const characterIds = rows.map((row) => row.id);
    const placeholders = characterIds.map(() => "?").join(",");
    const [equipRows] = await pool.query(`
      SELECT characterid, itemid, position
      FROM inventoryitems
      WHERE characterid IN (${placeholders})
        AND inventorytype = -1
        AND position < 0
      ORDER BY characterid, position
    `, characterIds);

    const equipsByCharacter = new Map();
    for (const equip of equipRows) {
      if (!equipsByCharacter.has(equip.characterid)) {
        equipsByCharacter.set(equip.characterid, []);
      }
      equipsByCharacter.get(equip.characterid).push({
        itemid: equip.itemid,
        position: equip.position,
      });
    }

    const ranking = rows.map((row) => ({
      ...row,
      equips: equipsByCharacter.get(row.id) || [],
    }));

    return res.json({ ok: true, rankingVersion: "equips-filters-v1", filters: { job: job || "all", country: country || "all" }, ranking });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      ok: false,
      message: "No se pudo cargar el ranking.",
      error: error.message,
    });
  }
});

app.get("/ranking/guilds", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        g.guildid AS id,
        g.guildid,
        g.name,
        g.GP AS gp,
        g.capacity,
        g.leader AS leader_id,
        leader.name AS leader_name,
        COUNT(c.id) AS member_count,
        COALESCE(SUM(c.level), 0) AS total_level,
        COALESCE(MAX(c.level), 0) AS top_level
      FROM guilds g
      LEFT JOIN characters c ON c.guildid = g.guildid AND c.gm = 0
      LEFT JOIN characters leader ON leader.id = g.leader
      GROUP BY g.guildid, g.name, g.GP, g.capacity, g.leader, leader.name
      ORDER BY g.GP DESC, member_count DESC, total_level DESC, g.name ASC
      LIMIT 50
    `);

    const ranking = rows.map((row) => ({
      id: `guild-${row.guildid}`,
      guildid: row.guildid,
      type: "guild",
      name: row.name,
      job: "Guild",
      level: Number(row.member_count || 0),
      fame: Number(row.gp || 0),
      gp: Number(row.gp || 0),
      points: Number(row.gp || 0),
      member_count: Number(row.member_count || 0),
      capacity: Number(row.capacity || 0),
      leader_id: row.leader_id,
      leader_name: row.leader_name || "",
      total_level: Number(row.total_level || 0),
      top_level: Number(row.top_level || 0),
      guild_name: row.leader_name ? `Leader: ${row.leader_name}` : "",
    }));

    return res.json({ ok: true, rankingVersion: "guilds-v1", ranking });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      ok: false,
      message: "No se pudo cargar el ranking de guilds.",
      error: error.message,
    });
  }
});

// Register - keep compatibility, don't return sensitive fields
app.post("/register", async (req, res) => {
  try {
    const { username, displayName, email, password, confirmPassword, country, birthDate } = req.body;

    if (!username || !displayName || !email || !password || !confirmPassword || !country || !birthDate) {
      return res.status(400).json({ ok: false, message: "Completá todos los campos." });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ ok: false, message: "Las contraseñas no coinciden." });
    }

    if (username.length < 4 || username.length > 13) {
      return res.status(400).json({ ok: false, message: "El usuario debe tener entre 4 y 13 caracteres." });
    }

    if (password.length < 4 || password.length > 30) {
      return res.status(400).json({ ok: false, message: "La contraseña debe tener entre 4 y 30 caracteres." });
    }

    if (displayName.length > 20) {
      return res.status(400).json({ ok: false, message: "El nombre debe tener hasta 20 caracteres." });
    }

    if (email.length > 45 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ ok: false, message: "Ingresa un correo electronico valido." });
    }

    if (country.length > 80) {
      return res.status(400).json({ ok: false, message: "El pais es demasiado largo." });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
      return res.status(400).json({ ok: false, message: "Ingresa una fecha de cumpleanos valida." });
    }

    const [existing] = await pool.query("SELECT id FROM accounts WHERE name = ? LIMIT 1", [username]);
    if (existing.length > 0) return res.status(409).json({ ok: false, message: "Ese usuario ya existe." });

    const hashedPassword = await bcrypt.hash(password, 12);
    const [created] = await pool.query(
      `INSERT INTO accounts (name, password, loggedin, banned, birthday, email)
       VALUES (?, ?, 0, 0, ?, ?)`,
      [username, hashedPassword, birthDate, email]
    );

    await pool.query(
      `INSERT INTO web_profiles (account_id, display_name, country)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE display_name = VALUES(display_name), country = VALUES(country)`,
      [created.insertId, displayName, country]
    );

    return res.json({ ok: true, message: "Cuenta creada correctamente." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ ok: false, message: "Error al crear la cuenta.", error: error.message });
  }
});

// Login
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ ok: false, message: "username y password requeridos" });

    const [rows] = await pool.query("SELECT id, name, password, banned FROM accounts WHERE name = ? LIMIT 1", [username]);
    const account = rows[0];

    console.log("[login] usuario:", username);
    console.log("[login] cuenta encontrada:", Boolean(account));

    if (!account) return res.status(401).json({ ok: false, message: "Credenciales inválidas" });

    console.log("[login] banned:", account?.banned);
    console.log("[login] password length DB:", account?.password?.length);
    console.log("[login] password prefix DB:", account?.password?.slice(0, 8));

    if (Number(account.banned) === 1) return res.status(403).json({ ok: false, message: "Cuenta bloqueada" });

    const passwordMatches = verifyPassword(password, account.password);
    console.log("[login] password match:", passwordMatches);
    if (!passwordMatches) return res.status(401).json({ ok: false, message: "Credenciales inválidas" });

    const token = jwt.sign({ id: account.id, name: account.name }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    return res.json({ ok: true, message: "Inicio de sesión correcto.", token, account: { id: account.id, name: account.name } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, message: "Error en login", error: err.message });
  }
});

app.post("/login-legacy-disabled", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ ok: false, message: "username y password requeridos" });

    const [rows] = await pool.query("SELECT id, name, password, banned FROM accounts WHERE name = ? LIMIT 1", [username]);
    if (rows.length === 0) return res.status(401).json({ ok: false, message: "Credenciales inválidas" });

    const account = rows[0];
    console.log("[login] usuario:", username);
    console.log("[login] cuenta encontrada:", Boolean(account));
    console.log("[login] banned:", account?.banned);
    console.log("[login] password length DB:", account?.password?.length);
    console.log("[login] password prefix DB:", account?.password?.slice(0, 8));

    if (Number(account.banned) === 1) return res.status(403).json({ ok: false, message: "Cuenta bloqueada" });

    // direct comparison to remain compatible with existing /register
    if (!verifyPassword(password, account.password)) return res.status(401).json({ ok: false, message: "Credenciales inválidas" });

    const token = jwt.sign({ id: account.id, name: account.name }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    return res.json({ ok: true, message: "Inicio de sesión correcto.", token, account: { id: account.id, name: account.name } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, message: "Error en login", error: err.message });
  }
});

app.post("/password-recovery", async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim();
    if (!email || email.length > 45 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ ok: false, message: "Ingresa un correo electronico valido." });
    }

    const genericMessage = "Si el correo existe, enviaremos los pasos para recuperar tu cuenta.";
    const [rows] = await pool.query(
      "SELECT id, name, email FROM accounts WHERE LOWER(email) = LOWER(?) AND banned = 0 LIMIT 1",
      [email]
    );

    if (rows.length === 0) {
      return res.json({ ok: true, message: genericMessage });
    }

    const account = rows[0];
    const token = createPasswordResetToken();
    const tokenHash = hashPasswordResetToken(token);
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRES_MINUTES * 60 * 1000);
    const resetUrl = getPasswordResetUrl(token);

    await pool.query(
      `INSERT INTO password_reset_tokens (account_id, token_hash, expires_at, request_ip)
       VALUES (?, ?, ?, ?)`,
      [account.id, tokenHash, expiresAt, getIpFromRequest(req)]
    );

    try {
      await sendPasswordRecoveryEmail({
        to: account.email,
        username: account.name,
        resetUrl,
        expiresMinutes: PASSWORD_RESET_EXPIRES_MINUTES,
      });
    } catch (mailError) {
      console.error("Password recovery email failed:", mailError.message);
      return res.status(503).json({
        ok: false,
        message: "No se pudo enviar el correo de recuperacion. Revisa la configuracion SMTP del API.",
      });
    }

    return res.json({ ok: true, message: genericMessage });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, message: "Error al iniciar la recuperacion.", error: err.message });
  }
});

app.post("/password-recovery/reset", async (req, res) => {
  try {
    const token = String(req.body?.token || "").trim();
    const { newPassword, confirmPassword } = req.body;

    if (!token || !newPassword || !confirmPassword) {
      return res.status(400).json({ ok: false, message: "Todos los campos son requeridos." });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ ok: false, message: "Las nuevas contrasenas no coinciden." });
    }

    if (newPassword.length < 4 || newPassword.length > 30) {
      return res.status(400).json({ ok: false, message: "La contrasena debe tener entre 4 y 30 caracteres." });
    }

    const tokenHash = hashPasswordResetToken(token);
    const [tokenRows] = await pool.query(
      `SELECT id, account_id
       FROM password_reset_tokens
       WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW()
       LIMIT 1`,
      [tokenHash]
    );

    if (tokenRows.length === 0) {
      return res.status(400).json({ ok: false, message: "El enlace de recuperacion es invalido o expiro." });
    }

    const resetToken = tokenRows[0];
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);
    await pool.query("UPDATE accounts SET password = ? WHERE id = ?", [hashedNewPassword, resetToken.account_id]);
    await pool.query("UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ?", [resetToken.id]);

    return res.json({ ok: true, message: "Contrasena actualizada correctamente. Ya puedes iniciar sesion." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, message: "Error al restablecer la contrasena.", error: err.message });
  }
});

// Get logged account and profile
app.get("/account/me", authMiddleware, async (req, res) => {
  try {
    const uid = req.user.id;
    const [accRows] = await pool.query("SELECT id, name, loggedin, banned, nxCredit, nxPrepaid FROM accounts WHERE id = ? LIMIT 1", [uid]);
    if (accRows.length === 0) return res.status(404).json({ ok: false, message: "Cuenta no encontrada" });

    const account = accRows[0];

    const [profiles] = await pool.query("SELECT display_name, avatar_url, bio, instagram_url, discord_url, website_url, location FROM web_profiles WHERE account_id = ? LIMIT 1", [uid]);
    let profile = profiles[0];

    if (!profile) {
      await pool.query("INSERT INTO web_profiles (account_id, display_name, avatar_url, bio) VALUES (?, ?, ?, ?)", [uid, null, null, null]);
      const [newp] = await pool.query("SELECT display_name, avatar_url, bio, instagram_url, discord_url, website_url, location FROM web_profiles WHERE account_id = ? LIMIT 1", [uid]);
      profile = newp[0];
    }

    return res.json({ ok: true, account, profile });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, message: "Error al obtener cuenta", error: err.message });
  }
});

// Get characters for account
app.get("/account/me/characters", authMiddleware, async (req, res) => {
  try {
    const uid = req.user.id;
    // detect available columns to remain compatible with different schemas
    const [cols] = await pool.query(
      `SELECT COLUMN_NAME FROM information_schema.columns WHERE table_schema = ? AND table_name = 'characters'`,
      [process.env.DB_NAME || "cosmic"]
    );

    const available = cols.map((c) => c.COLUMN_NAME.toLowerCase());
    const desired = [
      "id",
      "name",
      "level",
      "job",
      "fame",
      "mesos",
      "map",
      "gender",
      "skincolor",
      "face",
      "hair",
      "exp",
    ];

    const toSelect = desired.filter((d) => available.includes(d));
    if (!toSelect.includes("id")) toSelect.unshift("id");

    const selectParts = toSelect.map((col) => (col === "skincolor" ? "skincolor AS skin" : col));
    const orderParts = ["level DESC"];
    if (available.includes("exp")) orderParts.push("exp DESC");

    const sql = `SELECT ${selectParts.join(", ")} FROM characters WHERE accountid = ? ORDER BY ${orderParts.join(", ")}`;
    const [rows] = await pool.query(sql, [uid]);

    return res.json({ ok: true, characters: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, message: "Error al obtener personajes", error: err.message });
  }
});

// Web character creation. This deliberately mirrors the v111 Adventurer
// creation path in CharLoginHandler/CreateChar instead of inserting a bare
// `characters` row: inventory slots, starter items, mount data and keymap are
// all required by the game server when it loads a new character.
const WEB_CHARACTER_WORLD = 0;
const WEB_CHARACTER_SLOTS = 6;
const WEB_CHARACTER_NAME_RE = /^[A-Za-z0-9]{3,12}$/;
const WEB_CHARACTER_RESERVED_NAMES = ["rental", "donor", "maplenews"];
const WEB_CHARACTER_DEFAULTS = {
  0: { face: 20000, hair: 30030, top: 1040002, bottom: 1060002 },
  1: { face: 21000, hair: 31000, top: 1041002, bottom: 1061002 },
};
const WEB_CHARACTER_STARTER_EQUIPS = [
  { itemId: 1040002, position: -5, upgradeSlots: 7, wdef: 3 },
  { itemId: 1041002, position: -5, upgradeSlots: 7, wdef: 3 },
  { itemId: 1060002, position: -6, upgradeSlots: 7, wdef: 2 },
  { itemId: 1061002, position: -6, upgradeSlots: 7, wdef: 2 },
  { itemId: 1072001, position: -7, upgradeSlots: 5, wdef: 2 },
  { itemId: 1302000, position: -11, upgradeSlots: 7, watk: 17 },
];
const WEB_CHARACTER_KEYMAP = [
  [2, 4, 10], [3, 4, 12], [4, 4, 13], [5, 4, 18], [6, 4, 24], [7, 4, 21],
  [16, 4, 8], [17, 4, 5], [18, 4, 0], [19, 4, 4], [23, 4, 1], [25, 4, 19],
  [26, 4, 14], [27, 4, 15], [29, 5, 52], [31, 4, 2], [34, 4, 17], [35, 4, 11],
  [37, 4, 3], [38, 4, 20], [40, 4, 16], [41, 4, 23], [43, 4, 9], [44, 5, 50],
  [45, 5, 51], [46, 4, 6], [48, 4, 22], [50, 4, 7], [56, 5, 53], [57, 5, 54],
  [59, 6, 100], [60, 6, 101], [61, 6, 102], [62, 6, 103], [63, 6, 104],
  [64, 6, 105], [65, 6, 106],
];

function normalizeWebCharacterName(value) {
  return String(value || "").trim();
}

function isEligibleWebCharacterName(name) {
  const lowerName = name.toLowerCase();
  return WEB_CHARACTER_NAME_RE.test(name)
    && !WEB_CHARACTER_RESERVED_NAMES.some((reserved) => lowerName.includes(reserved));
}

async function insertWebCharacterItem(connection, characterId, item) {
  const [result] = await connection.query(
    `INSERT INTO inventoryitems
      (characterid, itemid, inventorytype, position, quantity, owner, GM_Log, uniqueid, flag, expiredate, type, sender)
     VALUES (?, ?, ?, ?, ?, '', '', -1, 0, -1, 0, '')`,
    [characterId, item.itemId, item.inventoryType, item.position, item.quantity]
  );

  if (item.inventoryType !== -1) return;

  await connection.query(
    `INSERT INTO inventoryequipment
      (inventoryitemid, upgradeslots, level, \`str\`, dex, \`int\`, luk, hp, mp, watk, matk, wdef, mdef, acc, avoid, hands, speed, jump, ViciousHammer, itemEXP, durability, enhance, potential1, potential2, potential3, potential4, potential5, socket1, socket2, socket3, incSkill, charmEXP, pvpDamage)
     VALUES (?, ?, 0, 0, 0, 0, 0, 0, 0, ?, 0, ?, 0, 0, 0, 0, 0, 0, 0, 0, -1, 0, 0, 0, 0, 0, 0, -1, -1, -1, -1, 0, 0)`,
    [result.insertId, item.upgradeSlots, item.watk || 0, item.wdef || 0]
  );
}

app.post("/account/me/characters", authMiddleware, async (req, res) => {
  const name = normalizeWebCharacterName(req.body?.name);
  const gender = Number(req.body?.gender);
  const appearance = WEB_CHARACTER_DEFAULTS[gender];

  if (!isEligibleWebCharacterName(name)) {
    return res.status(400).json({ ok: false, message: "El nombre debe tener entre 3 y 12 caracteres alfanumericos y no puede estar reservado." });
  }
  if (!appearance) {
    return res.status(400).json({ ok: false, message: "Selecciona un genero valido." });
  }

  let connection;
  let advisoryLock = false;
  try {
    connection = await pool.getConnection();
    // The legacy schema has no unique key on characters.name. The advisory lock
    // closes the check-then-insert race across accounts without changing its SQL.
    const [lockRows] = await connection.query("SELECT GET_LOCK('latinms_web_character_creation', 10) AS acquired");
    advisoryLock = Number(lockRows[0]?.acquired) === 1;
    if (!advisoryLock) {
      return res.status(503).json({ ok: false, message: "El creador de personajes esta ocupado. Intenta nuevamente en unos segundos." });
    }

    await connection.beginTransaction();
    const accountId = req.user.id;
    const [accounts] = await connection.query("SELECT id, banned FROM accounts WHERE id = ? FOR UPDATE", [accountId]);
    if (accounts.length === 0 || Number(accounts[0].banned) === 1) {
      await connection.rollback();
      return res.status(403).json({ ok: false, message: "La cuenta no puede crear personajes." });
    }

    const [duplicateNames] = await connection.query("SELECT id FROM characters WHERE LOWER(name) = LOWER(?) LIMIT 1", [name]);
    if (duplicateNames.length > 0) {
      await connection.rollback();
      return res.status(409).json({ ok: false, message: "Ese nombre de personaje ya esta en uso." });
    }

    const [slotRows] = await connection.query(
      "SELECT charslots FROM character_slots WHERE accid = ? AND worldid = ? ORDER BY id ASC LIMIT 1 FOR UPDATE",
      [accountId, WEB_CHARACTER_WORLD]
    );
    if (slotRows.length === 0) {
      await connection.query("INSERT INTO character_slots (accid, worldid, charslots) VALUES (?, ?, ?)", [accountId, WEB_CHARACTER_WORLD, WEB_CHARACTER_SLOTS]);
    }
    const characterSlots = Number(slotRows[0]?.charslots ?? WEB_CHARACTER_SLOTS);
    const [characterCountRows] = await connection.query(
      "SELECT COUNT(*) AS count FROM characters WHERE accountid = ? AND world = ? FOR UPDATE",
      [accountId, WEB_CHARACTER_WORLD]
    );
    if (Number(characterCountRows[0].count) >= characterSlots) {
      await connection.rollback();
      return res.status(409).json({ ok: false, code: "CHARACTER_SLOTS_FULL", message: "No tienes espacios de personaje disponibles." });
    }

    const [created] = await connection.query(
      `INSERT INTO characters
        (level, \`str\`, dex, luk, \`int\`, hp, mp, maxhp, maxmp, sp, ap, skincolor, gender, job, hair, face, demonMarking, map, meso, party, buddyCapacity, pets, subcategory, accountid, name, world)
       VALUES (1, 12, 5, 4, 4, 50, 50, 50, 50, '0,0,0,0,0,0,0,0,0,0', 0, 0, ?, 0, ?, ?, 0, 0, 0, -1, 20, '-1,-1,-1', 0, ?, ?, ?)`,
      [gender, appearance.hair, appearance.face, accountId, name, WEB_CHARACTER_WORLD]
    );
    const characterId = created.insertId;

    await connection.query("INSERT INTO inventoryslot (characterid, \`equip\`, \`use\`, setup, etc, cash) VALUES (?, 32, 32, 32, 32, 60)", [characterId]);
    await connection.query("INSERT INTO mountdata (characterid, \`Level\`, \`Exp\`, \`Fatigue\`) VALUES (?, 1, 0, 0)", [characterId]);
    await connection.query(
      "INSERT INTO keymap (characterid, \`key\`, \`type\`, action) VALUES " + WEB_CHARACTER_KEYMAP.map(() => "(?, ?, ?, ?)").join(", "),
      WEB_CHARACTER_KEYMAP.flatMap(([key, type, action]) => [characterId, key, type, action])
    );

    const starterEquips = WEB_CHARACTER_STARTER_EQUIPS.filter((item) => item.itemId === appearance.top || item.itemId === appearance.bottom || item.itemId === 1072001 || item.itemId === 1302000);
    for (const item of starterEquips) {
      await insertWebCharacterItem(connection, characterId, { ...item, inventoryType: -1, quantity: 1 });
    }
    await insertWebCharacterItem(connection, characterId, { itemId: 2000013, inventoryType: 2, position: 1, quantity: 100 });
    await insertWebCharacterItem(connection, characterId, { itemId: 2000014, inventoryType: 2, position: 2, quantity: 100 });
    await insertWebCharacterItem(connection, characterId, { itemId: 4161001, inventoryType: 4, position: 1, quantity: 1 });

    await connection.commit();
    return res.status(201).json({
      ok: true,
      message: "Personaje creado correctamente. Ya puedes ingresar al juego con esta cuenta.",
      character: { id: characterId, name, level: 1, job: 0, gender, skin: 0, face: appearance.face, hair: appearance.hair, equips: starterEquips.map((item) => item.itemId) },
    });
  } catch (err) {
    try { await connection.rollback(); } catch { /* transaction was not started */ }
    console.error("Character creation failed:", err);
    return res.status(500).json({ ok: false, message: "No se pudo crear el personaje.", error: err.message });
  } finally {
    if (advisoryLock) {
      try { await connection.query("SELECT RELEASE_LOCK('latinms_web_character_creation')"); } catch { /* connection is being released */ }
    }
    connection?.release();
  }
});

// Update or create profile
app.put("/account/me/profile", authMiddleware, async (req, res) => {
  try {
    const uid = req.user.id;
    const { display_name, avatar_url, bio, instagram_url, discord_url, website_url, location } = req.body;

    if (display_name && display_name.length > 50) return res.status(400).json({ ok: false, message: "display_name demasiado largo" });
    if (avatar_url && avatar_url.length > 255) return res.status(400).json({ ok: false, message: "avatar_url demasiado largo" });
    if (bio && bio.length > 255) return res.status(400).json({ ok: false, message: "bio demasiado larga" });
    if (instagram_url && instagram_url.length > 255) return res.status(400).json({ ok: false, message: "instagram_url demasiado largo" });
    if (discord_url && discord_url.length > 255) return res.status(400).json({ ok: false, message: "discord_url demasiado largo" });
    if (website_url && website_url.length > 255) return res.status(400).json({ ok: false, message: "website_url demasiado largo" });
    if (location && location.length > 80) return res.status(400).json({ ok: false, message: "location demasiado larga" });

    await pool.query(
      `INSERT INTO web_profiles (account_id, display_name, avatar_url, bio, instagram_url, discord_url, website_url, location)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         display_name = VALUES(display_name),
         avatar_url = VALUES(avatar_url),
         bio = VALUES(bio),
         instagram_url = VALUES(instagram_url),
         discord_url = VALUES(discord_url),
         website_url = VALUES(website_url),
         location = VALUES(location)`,
      [uid, display_name || null, avatar_url || null, bio || null, instagram_url || null, discord_url || null, website_url || null, location || null]
    );

    const [profiles] = await pool.query("SELECT display_name, avatar_url, bio, instagram_url, discord_url, website_url, location FROM web_profiles WHERE account_id = ? LIMIT 1", [uid]);
    return res.json({ ok: true, message: "Perfil actualizado correctamente.", profile: profiles[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, message: "Error al actualizar perfil", error: err.message });
  }
});

// Change password
app.post("/account/me/change-password", authMiddleware, async (req, res) => {
  try {
    const uid = req.user.id;
    const { currentPassword, newPassword, confirmPassword } = req.body;
    if (!currentPassword || !newPassword || !confirmPassword) return res.status(400).json({ ok: false, message: "Todos los campos son requeridos" });
    if (newPassword !== confirmPassword) return res.status(400).json({ ok: false, message: "Las nuevas contraseñas no coinciden" });
    if (newPassword.length < 4 || newPassword.length > 30) return res.status(400).json({ ok: false, message: "La contraseña debe tener entre 4 y 30 caracteres." });

    const [rows] = await pool.query("SELECT password FROM accounts WHERE id = ? LIMIT 1", [uid]);
    if (rows.length === 0) return res.status(404).json({ ok: false, message: "Cuenta no encontrada" });
    const account = rows[0];

    if (!verifyPassword(currentPassword, account.password)) return res.status(401).json({ ok: false, message: "Contraseña actual incorrecta" });

    const hashedChangedPassword = await bcrypt.hash(newPassword, 12);
    await pool.query("UPDATE accounts SET password = ? WHERE id = ?", [hashedChangedPassword, uid]);
    return res.json({ ok: true, message: "Contraseña actualizada correctamente." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, message: "Error al cambiar contraseña", error: err.message });
  }
});

// Authenticated health check
app.get("/account/check", authMiddleware, (req, res) => {
  return res.json({ ok: true, user: req.user });
});

const PORT = process.env.PORT || 3001;

// Ensure web_profiles and start server
Promise.all([
  ensureWebProfilesTable(),
  ensureGTop100VotesTable(),
  ensureVoteTokensTable(),
  ensurePasswordResetTable(),
  ensureSocialTables(),
  ensureNoticiasTable(),
]).then(async () => {
  // Log de conexión a DB para diagnóstico (sin contraseña)
  try {
    const [dbRows] = await pool.query("SELECT DATABASE() AS db");
    console.log(`[DB] host=${process.env.DB_HOST || "127.0.0.1"} port=${process.env.DB_PORT || 3307} db=${dbRows[0]?.db} user=${process.env.DB_USER || "root"}`);
  } catch (e) {
    console.error("[DB] No se pudo obtener database()", e.message);
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Maple API corriendo en puerto ${PORT}`);
  });
});
