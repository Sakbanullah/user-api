const db = require('../config/database');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { generateToken, generateResetCode, sendResetEmail } = require('../utils/authHelpers');

exports.register = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const [existingUser] = await db.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    
    if (existingUser.length > 0) {
      return res.status(400).json({ message: 'Email sudah terdaftar' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const [result] = await db.execute(
      'INSERT INTO users (email, password) VALUES (?, ?)',
      [email, hashedPassword]
    );

    res.status(201).json({
      message: 'Registrasi berhasil',
      token: generateToken(result.insertId),
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const [users] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);

    if (users.length === 0 || !(await bcrypt.compare(password, users[0].password))) {
      return res.status(401).json({ message: 'Email atau password salah' });
    }
    res.json({
      message: 'Login berhasil',
      token: generateToken(users[0].id),
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const [users] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);

    if (users.length === 0) {
      return res.status(404).json({ message: 'Email tidak ditemukan' });
    }
    const resetCode = generateResetCode();
    const resetCodeExpire = new Date(Date.now() + 15 * 60 * 1000);

    await db.execute(
      'UPDATE users SET reset_code = ?, reset_code_expire = ? WHERE email = ?',
      [resetCode, resetCodeExpire, email]
    );

    await sendResetEmail(email, resetCode);
    res.json({ 
      message: 'Kode reset password telah dikirim ke email Anda',
      email: email
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.verifyResetCode = async (req, res) => {
    try {
      const { email, resetCode } = req.body;
      console.log('Verifying reset code:', { email, resetCode });
      
      const [users] = await db.execute(
        'SELECT * FROM users WHERE email = ? AND reset_code = ? AND reset_code_expire > ?',
        [email, resetCode, new Date()]
      );
  
      if (users.length === 0) {
        return res.status(400).json({ message: 'Kode tidak valid atau sudah kadaluarsa' });
      }
  
      const tempToken = crypto.randomBytes(20).toString('hex');
      console.log('Generated tempToken:', tempToken);
      
      await db.execute(
        'UPDATE users SET reset_password_token = ? WHERE email = ?',
        [tempToken, email]
      );
  
      res.json({ 
        message: 'Kode verifikasi valid',
        tempToken
      });
    } catch (error) {
      console.error('Error in verifyResetCode:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  };
exports.resetPassword = async (req, res) => {
    try {
      const { tempToken, password } = req.body;
      
      // Tambahkan console.log untuk debugging
      console.log('Resetting password with token:', tempToken);
      
      const [users] = await db.execute(
        'SELECT * FROM users WHERE reset_password_token = ?',
        [tempToken]
      );
  
      // Log hasil query
      console.log('Found users:', users.length);
  
      if (users.length === 0) {
        return res.status(400).json({ message: 'Token tidak valid' });
      }
  
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
  
      await db.execute(
        `UPDATE users 
         SET password = ?, 
             reset_password_token = NULL, 
             reset_code = NULL, 
             reset_code_expire = NULL 
         WHERE id = ?`,
        [hashedPassword, users[0].id]
      );
  
      res.json({
        message: 'Password berhasil direset',
        token: generateToken(users[0].id)
      });
    } catch (error) {
      console.error('Error in resetPassword:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  };