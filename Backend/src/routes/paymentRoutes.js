const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const {
  getCurrentMonthPayment,
  getPaymentHistory,
  submitPayment,
  getPaymentSummary
} = require('../controllers/paymentController');

router.get('/current', auth, getCurrentMonthPayment);
router.get('/history', auth, getPaymentHistory);
router.post('/submit', auth, upload.single('paymentProof'), submitPayment);
router.get('/summary', auth, getPaymentSummary);

module.exports = router;