const jwt = require('jsonwebtoken');
const db = require('../config/database');

const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      const [user] = await db.execute(
        'SELECT id, email FROM users WHERE id = ?',
        [decoded.id]
      );

      if (user.length === 0) {
        return res.status(401).json({ message: 'Not authorized' });
      }

      req.user = user[0];
      next();
    }

    if (!token) {
      return res.status(401).json({ message: 'Not authorized, no token' });
    }
  } catch (error) {
    res.status(401).json({ message: 'Not authorized' });
  }
};

module.exports = { protect };