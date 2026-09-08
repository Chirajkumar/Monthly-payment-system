const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const normalizeMemberName = (value = '') => value.trim().toLowerCase();

const normalizeDobString = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 10);
};

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// Login with Name and DOB
exports.loginWithNameAndDOB = async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const dateOfBirth = req.body.dateOfBirth;

    if (!name || !dateOfBirth) {
      return res.status(400).json({
        success: false,
        message: 'Name and date of birth are required'
      });
    }

    const normalizedDob = normalizeDobString(dateOfBirth);
    if (!normalizedDob) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid date of birth'
      });
    }

    const matchingUsers = await User.find({
      isActive: true,
      name: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
    }).lean();

    const user = matchingUsers.find((candidate) => {
      const storedDob = normalizeDobString(candidate.dateOfBirth);
      return normalizeMemberName(candidate.name) === normalizeMemberName(name) && storedDob === normalizedDob;
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid name or date of birth'
      });
    }

    // Check if user has a password (for admin)
    // If not, they can login with just name and DOB

    // Generate token
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        memberId: user.memberId,
        isAdmin: user.isAdmin,
        email: user.email,
        phone: user.phone
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Admin Login
exports.adminLogin = async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    const user = await User.findOne({ email, isAdmin: true });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const configuredEmail = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const configuredPassword = String(process.env.ADMIN_PASSWORD || '');
    const passwordMatches =
      (user.password && password === user.password) ||
      (configuredEmail && email === configuredEmail && configuredPassword && password === configuredPassword);

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (!user.password && configuredPassword) {
      user.password = configuredPassword;
      await user.save();
    }

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        memberId: user.memberId,
        isAdmin: user.isAdmin
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get current user
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    res.json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};