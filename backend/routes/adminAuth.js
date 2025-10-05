const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { getSetting, setSetting, setHashedPassword, verifyPassword } = require('../config/settingsManager');

// Middleware cek login admin
function adminAuth(req, res, next) {
  if (req.session && req.session.isAdmin) {
    next();
  } else {
    res.redirect('/admin/login');
  }
}

// GET: Halaman login admin
router.get('/login', (req, res) => {
  res.render('adminLogin', { error: null });
});

// POST: Proses login admin
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const adminUsername = getSetting('admin_username', 'admin');

    // Validasi input
    if (!username || !password) {
      return res.render('adminLogin', { error: 'Username dan password harus diisi.' });
    }

    // Cek username
    if (username !== adminUsername) {
      return res.render('adminLogin', { error: 'Username atau password salah.' });
    }

    // Verifikasi password menggunakan utility function
    const isValidPassword = await verifyPassword(password);

    if (isValidPassword) {
      req.session.isAdmin = true;
      req.session.adminUser = username;
      res.redirect('/admin/dashboard');
    } else {
      res.render('adminLogin', { error: 'Username atau password salah.' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.render('adminLogin', { error: 'Terjadi kesalahan sistem. Silakan coba lagi.' });
  }
});

// POST: Setup atau ubah password admin (untuk setup awal)
router.post('/setup-password', adminAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Validasi input
    if (!newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Password baru dan konfirmasi harus diisi.'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Password baru dan konfirmasi tidak cocok.'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password harus minimal 8 karakter.'
      });
    }

    // Cek current password jika sudah ada hash
    const adminPasswordHash = getSetting('admin_password', '');
    if (adminPasswordHash) {
      // Ada hash, cek current password
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          message: 'Password saat ini harus diisi untuk mengubah password.'
        });
      }

      const isCurrentValid = await verifyPassword(currentPassword);
      if (!isCurrentValid) {
        return res.status(400).json({
          success: false,
          message: 'Password saat ini salah.'
        });
      }
    }

    // Hash dan simpan password baru
    const success = await setHashedPassword(newPassword);
    if (!success) {
      return res.status(500).json({
        success: false,
        message: 'Gagal menyimpan password baru.'
      });
    }

    // Hapus plain text password jika ada
    setSetting('admin_password_plain', '');

    res.json({
      success: true,
      message: 'Password berhasil diubah.'
    });

  } catch (error) {
    console.error('Setup password error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan sistem.'
    });
  }
});

// GET: Logout admin
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/admin/login');
  });
});

module.exports = { router, adminAuth };
