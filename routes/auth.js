const express = require('express');
const jwt     = require('jsonwebtoken');
const User    = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatValidationError(err) {
  return Object.values(err.errors).map((e) => e.message).join(' ');
}

/** Signs a JWT and sends it as an HTTP-only cookie + JSON body. */
function sendTokenResponse(user, statusCode, res) {
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn });

  const cookieOptions = {
    httpOnly: true,                            // not accessible via JS
    secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,          // 7 days in ms
  };

  res
    .status(statusCode)
    .cookie('accessToken', token, cookieOptions)
    .json({ token, user });
}

// ─── POST /api/auth/signup ────────────────────────────────────────────────────
// Body: { name, email, password, role? }
// Note: only 'user' role can be self-assigned; 'admin' requires an existing admin token
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Prevent self-elevating to admin via signup
    const user = new User({ name, email, password, role: 'user' });
    const saved = await user.save();

    sendTokenResponse(saved, 201, res);
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: formatValidationError(err) });
    }
    if (err.code === 11000) {
      return res.status(409).json({ error: 'An account with that email already exists.' });
    }
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
// Body: { email, password }
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    // Explicitly select password (excluded by default via `select: false`)
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    sendTokenResponse(user, 200, res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/auth/logout ────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  res
    .clearCookie('accessToken', { httpOnly: true, sameSite: 'strict' })
    .status(200)
    .json({ message: 'Logged out successfully.' });
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
// Returns the currently authenticated user
router.get('/me', protect, (req, res) => {
  res.status(200).json(req.user);
});

module.exports = router;
