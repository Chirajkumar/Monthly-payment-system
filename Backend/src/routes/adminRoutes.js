const express = require('express');
const router = express.Router();
const { auth, isAdmin } = require('../middleware/auth');
const {
  getAllMembers,
  addMember,
  updateMember,
  deleteMember,
  deletePayment,
  getMonthlyStatus,
  verifyPayment,
  getPaymentStatistics
} = require('../controllers/adminController');

router.use(auth, isAdmin);

router.get('/members', getAllMembers);
router.post('/members', addMember);
router.put('/members/:id', updateMember);
router.delete('/members/:id', deleteMember);
router.delete('/payments/:paymentId', deletePayment);

router.get('/monthly-status', getMonthlyStatus);
router.put('/verify-payment/:paymentId', verifyPayment);
router.get('/statistics', getPaymentStatistics);

module.exports = router;