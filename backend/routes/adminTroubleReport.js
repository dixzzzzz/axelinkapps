const express = require('express');
const router = express.Router();
const { adminAuth } = require('./adminAuth');
const { 
  getAllTroubleReports, 
  getTroubleReportById, 
  updateTroubleReportStatus 
} = require('../config/troubleReport');

// Middleware admin auth untuk semua route
router.use(adminAuth);

// GET: Halaman daftar semua laporan gangguan
router.get('/', (req, res) => {
  // Dapatkan semua laporan gangguan
  const reports = getAllTroubleReports();
  
  // Hitung jumlah laporan berdasarkan status
  const stats = {
    total: reports.length,
    open: reports.filter(r => r.status === 'open').length,
    inProgress: reports.filter(r => r.status === 'in_progress').length,
    resolved: reports.filter(r => r.status === 'resolved').length,
    closed: reports.filter(r => r.status === 'closed').length
  };
  
  // Render halaman admin laporan gangguan
  res.render('admin/trouble-reports', {
    reports,
    stats,
    title: 'Manajemen Laporan Gangguan'
  });
});

// GET: Halaman detail laporan gangguan
router.get('/detail/:id', (req, res) => {
  const reportId = req.params.id;
  
  // Dapatkan detail laporan
  const report = getTroubleReportById(reportId);
  
  // Validasi laporan ditemukan
  if (!report) {
    req.flash('error', 'Laporan gangguan tidak ditemukan');
    return res.redirect('/admin/trouble');
  }
  
  // Render halaman detail laporan
  res.render('admin/trouble-report-detail', {
    report,
    title: `Detail Laporan #${reportId}`
  });
});

// POST: Update status laporan gangguan
router.post('/update-status/:id', (req, res) => {
  const reportId = req.params.id;
  const { status, notes, sendNotification } = req.body;
  
  // Validasi status
  const validStatuses = ['open', 'in_progress', 'resolved', 'closed'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Status tidak valid'
    });
  }
  
  // Update status laporan dengan parameter sendNotification
  const updatedReport = updateTroubleReportStatus(reportId, status, notes, sendNotification);
  
  if (!updatedReport) {
    return res.status(500).json({
      success: false,
      message: 'Gagal mengupdate status laporan'
    });
  }
  
  res.json({
    success: true,
    message: 'Status laporan berhasil diupdate',
    report: updatedReport
  });
});

// POST: Tambah catatan pada laporan tanpa mengubah status
router.post('/add-note/:id', (req, res) => {
  const reportId = req.params.id;
  const { notes } = req.body;
  
  // Dapatkan detail laporan untuk mendapatkan status saat ini
  const report = getTroubleReportById(reportId);
  
  if (!report) {
    return res.status(404).json({
      success: false,
      message: 'Laporan tidak ditemukan'
    });
  }
  
  // Update laporan dengan catatan baru tanpa mengubah status
  const updatedReport = updateTroubleReportStatus(reportId, report.status, notes);
  
  if (!updatedReport) {
    return res.status(500).json({
      success: false,
      message: 'Gagal menambahkan catatan'
    });
  }
  
  res.json({
    success: true,
    message: 'Catatan berhasil ditambahkan',
    report: updatedReport
  });
});

// GET: API endpoint untuk mendapatkan semua laporan dalam format JSON
router.get('/api/reports', (req, res) => {
  try {
    const reports = getAllTroubleReports();
    
    // Hitung statistik
    const stats = {
      total: reports.length,
      open: reports.filter(r => r.status === 'open').length,
      inProgress: reports.filter(r => r.status === 'in_progress').length,
      resolved: reports.filter(r => r.status === 'resolved').length,
      closed: reports.filter(r => r.status === 'closed').length
    };
    
    res.json({
      success: true,
      reports,
      stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      reports: [],
      stats: { total: 0, open: 0, inProgress: 0, resolved: 0, closed: 0 }
    });
  }
});

// GET: API endpoint untuk mendapatkan detail laporan berdasarkan ID
router.get('/api/reports/:id', (req, res) => {
  try {
    const reportId = req.params.id;
    const report = getTroubleReportById(reportId);
    
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Laporan gangguan tidak ditemukan'
      });
    }
    
    res.json({
      success: true,
      report
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// POST: API endpoint untuk update status laporan (JSON response)
router.post('/api/reports/:id/status', (req, res) => {
  const reportId = req.params.id;
  const { status, notes, sendNotification } = req.body;
  
  // Validasi status
  const validStatuses = ['open', 'in_progress', 'resolved', 'closed'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Status tidak valid. Status yang valid: ' + validStatuses.join(', ')
    });
  }
  
  // Validasi catatan diperlukan
  if (!notes || notes.trim() === '') {
    return res.status(400).json({
      success: false,
      message: 'Catatan diperlukan saat mengupdate status'
    });
  }
  
  // Update status laporan
  const updatedReport = updateTroubleReportStatus(reportId, status, notes, sendNotification);
  
  if (!updatedReport) {
    return res.status(404).json({
      success: false,
      message: 'Laporan tidak ditemukan atau gagal mengupdate status'
    });
  }
  
  res.json({
    success: true,
    message: `Status laporan berhasil diupdate menjadi ${status}`,
    report: updatedReport
  });
});

// POST: API endpoint untuk menambah catatan tanpa mengubah status
router.post('/api/reports/:id/note', (req, res) => {
  const reportId = req.params.id;
  const { notes } = req.body;
  
  if (!notes || notes.trim() === '') {
    return res.status(400).json({
      success: false,
      message: 'Catatan tidak boleh kosong'
    });
  }
  
  // Dapatkan detail laporan untuk mendapatkan status saat ini
  const report = getTroubleReportById(reportId);
  
  if (!report) {
    return res.status(404).json({
      success: false,
      message: 'Laporan tidak ditemukan'
    });
  }
  
  // Update laporan dengan catatan baru tanpa mengubah status
  const updatedReport = updateTroubleReportStatus(reportId, report.status, notes, false);
  
  if (!updatedReport) {
    return res.status(500).json({
      success: false,
      message: 'Gagal menambahkan catatan'
    });
  }
  
  res.json({
    success: true,
    message: 'Catatan berhasil ditambahkan',
    report: updatedReport
  });
});

module.exports = router;
