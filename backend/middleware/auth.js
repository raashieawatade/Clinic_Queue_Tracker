const crypto = require('crypto');

// A deliberately simple session token for a single receptionist role:
//   "<expiry-ms>.<hmac-signature>"
// The signature proves the token was issued by this server, so it can't be forged
// from the browser. No user database is needed.

const TOKEN_LIFETIME_MS = 12 * 60 * 60 * 1000; // one working day

// If AUTH_SECRET isn't configured, a random secret is used; logins then expire on restart.
const secret = process.env.AUTH_SECRET || crypto.randomBytes(32).toString('hex');

function sign(value) {
  return crypto.createHmac('sha256', secret).update(value).digest('hex');
}

function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

function createToken() {
  const expiresAt = String(Date.now() + TOKEN_LIFETIME_MS);
  return `${expiresAt}.${sign(expiresAt)}`;
}

function isValidToken(token) {
  if (typeof token !== 'string') return false;
  const [expiresAt, signature] = token.split('.');
  if (!expiresAt || !signature) return false;
  if (!safeEqual(signature, sign(expiresAt))) return false;
  return Number(expiresAt) > Date.now();
}

function requireReceptionist(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!isValidToken(token)) {
    return res.status(401).json({ message: 'Please log in as receptionist' });
  }
  next();
}

module.exports = { createToken, requireReceptionist, safeEqual };
