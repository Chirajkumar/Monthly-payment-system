const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const connectDB = require('./src/config/database');
const User = require('./src/models/User');

dotenv.config();

const app = express();

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 100 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please wait a moment and try again.'
  }
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));
app.use('/api', limiter);

// Routes
const authRoutes = require('./src/routes/authRoutes');
const paymentRoutes = require('./src/routes/paymentRoutes');
const adminRoutes = require('./src/routes/adminRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);

// Error handling middleware
app.use((err, req, res, _next) => {
  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE'
      ? 'Payment proof image is too large. Max size is 5MB.'
      : `Upload error: ${err.message}`;
    return res.status(400).json({ success: false, message });
  }

  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

const PORT = process.env.PORT || 5000;

// Create default admin from env credentials if it doesn't exist
const seedAdmin = async () => {
  const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.log('Skipping admin bootstrap: ADMIN_EMAIL/ADMIN_PASSWORD not set');
    return;
  }

  const existing = await User.findOne({ email, isAdmin: true });
  if (existing) {
    if (!existing.password.startsWith('$2')) {
      existing.password = await bcrypt.hash(password, 10);
      await existing.save();
      console.log('Admin password hashed');
    }
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const admin = new User({
    name: 'Administrator',
    email,
    password: hashedPassword,
    memberId: 'ADM0001',
    isAdmin: true,
    isActive: true,
    dateOfBirth: new Date('1990-01-01')
  });
  await admin.save();
  console.log(`Admin user created (${email})`);
};

const seedMember = async () => {
  const memberName = 'Chetan';
  const memberDob = new Date('1995-03-04T00:00:00Z');

  const existing = await User.findOne({
    isAdmin: false,
    name: { $regex: new RegExp(`^${memberName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
  });

  if (existing) {
    if (!existing.dateOfBirth || existing.dateOfBirth.toISOString().slice(0, 10) !== '1995-03-04') {
      existing.dateOfBirth = memberDob;
      await existing.save();
      console.log(`Member ${memberName} DOB updated to 04/03/1995`);
    }
    return;
  }

  const member = new User({
    name: memberName,
    dateOfBirth: memberDob,
    isActive: true
  });

  await member.save();
  console.log(`Member user created (${memberName} - 04/03/1995, ID: ${member.memberId})`);
};

const startServer = async () => {
  await connectDB();
  await seedAdmin();
  await seedMember();

    const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.log(`Server is already running on port ${PORT}`);
        return;
      }

      console.error('Server startup error:', error);
      process.exitCode = 1;
    });
};

  startServer().catch((error) => {
    console.error('Server startup error:', error);
    process.exitCode = 1;
  });