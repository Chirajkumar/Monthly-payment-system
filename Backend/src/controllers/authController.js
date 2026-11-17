const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const normalizeMemberName = (value = '') => value.trim().toLowerCase();

const normalizeDobString = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  const raw = String(value).trim();
  if (!raw) {
    return null;
  }

  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [_, year, month, day] = isoMatch;
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    const normalized = Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
    return normalized === raw ? normalized : null;
  }

  const slashMatch = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (slashMatch) {
    const [, day, month, year] = slashMatch;
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    const normalized = Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
    return normalized && Number(day) === date.getUTCDate() &&
      Number(month) === date.getUTCMonth() + 1 &&
      Number(year) === date.getUTCFullYear()
      ? normalized
      : null;
  }

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 10);
};

exports.registerMember = async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const normalizedDob = normalizeDobString(req.body.dateOfBirth);

    if (!name || !normalizedDob) {
      return res.status(400).json({
        success: false,
        message: 'Full name and a valid date of birth are required'
      });
    }

    if (new Date(`${normalizedDob}T00:00:00.000Z`) > new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Date of birth cannot be in the future'
      });
    }

    const matchingUsers = await User.find({
      isAdmin: false,
      name: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
    }).select('name dateOfBirth');
    const alreadyRegistered = matchingUsers.some((user) =>
      normalizeMemberName(user.name) === normalizeMemberName(name) &&
      normalizeDobString(user.dateOfBirth) === normalizedDob
    );

    if (alreadyRegistered) {
      return res.status(409).json({
        success: false,
        message: 'A member with this name and date of birth is already registered'
      });
    }

    const user = new User({
      name,
      dateOfBirth: new Date(`${normalizedDob}T00:00:00.000Z`),
      isActive: true
    });

    await user.save();

    return res.status(201).json({
      success: true,
      message: 'Registration successful. You can now log in.',
      member: {
        id: user._id,
        name: user.name,
        memberId: user.memberId
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Unable to register this member because a record already exists'
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
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

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const user = await User.findOne({ email, isAdmin: true });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    let passwordMatches = false;
    if (user.password) {
      if (user.password.startsWith('$2')) {
        passwordMatches = await bcrypt.compare(password, user.password);
      } else {
        passwordMatches = password === user.password;
      }
    } else {
      const configuredPassword = String(process.env.ADMIN_PASSWORD || '');
      passwordMatches = configuredPassword && password === configuredPassword;
    }

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
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