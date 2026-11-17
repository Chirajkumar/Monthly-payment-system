const express = require('express');
const router = express.Router();
const { loginWithNameAndDOB, registerMember, adminLogin, getCurrentUser } = require('../controllers/authController');
const { auth } = require('../middleware/auth');

router.post('/register', registerMember);
router.post('/login', loginWithNameAndDOB);
router.post('/admin/login', adminLogin);
router.get('/me', auth, getCurrentUser);

module.exports = router;