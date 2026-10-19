const { ApiError } = require('../middleware/errorHandler');
const { createToken, safeEqual } = require('../middleware/auth');

// POST /api/auth/login
function login(req, res) {
  const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';

  if (!username || !password) {
    throw new ApiError(400, 'Username and password are required');
  }

  const expectedUser = process.env.RECEPTIONIST_USERNAME;
  const expectedPass = process.env.RECEPTIONIST_PASSWORD;
  if (!expectedUser || !expectedPass) {
    console.error('RECEPTIONIST_USERNAME / RECEPTIONIST_PASSWORD are not set in backend/.env');
    throw new ApiError(500, 'Receptionist login is not configured');
  }

  // Evaluate both comparisons so timing doesn't reveal which one failed.
  const userOk = safeEqual(username, expectedUser);
  const passOk = safeEqual(password, expectedPass);
  if (!userOk || !passOk) {
    throw new ApiError(401, 'Invalid username or password');
  }

  res.json({ token: createToken() });
}

module.exports = { login };
