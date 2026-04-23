const jwt  = require('jsonwebtoken');
const User = require('../models/User');

/**
 * protect — verifies the JWT from:
 *   1. HTTP-only cookie  (accessToken)
 *   2. Authorization header  (Bearer <token>)
 * Attaches the decoded user to req.user on success.
 */
async function protect(req, res, next) {
  let token;

  // 1. Check HTTP-only cookie first
  if (req.cookies && req.cookies.accessToken) {
    token = req.cookies.accessToken;
  }
  // 2. Fallback: Authorization: Bearer <token>
  else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ error: 'Not authenticated. Please log in.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user to request (exclude password)
    const user = await User.findOne({ id: decoded.id }).select('+role');
    if (!user) {
      return res.status(401).json({ error: 'User no longer exists.' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid token. Please log in again.' });
  }
}

/**
 * authorize — restricts access to specific roles.
 * Must be used after protect.
 * Usage: router.delete('/:id', protect, authorize('admin'), handler)
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Required role: ${roles.join(' or ')}.`,
      });
    }
    next();
  };
}

module.exports = { protect, authorize };
