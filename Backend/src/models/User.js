const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  dateOfBirth: {
    type: Date,
    required: true
  },
  email: {
    type: String,
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  password: {
    type: String,
    default: ''
  },
  memberId: {
    type: String,
    unique: true,
    required: true
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  monthlyAmount: {
    type: Number,
    default: 200
  },
  profilePicture: {
    type: String,
    default: ''
  },
  joinedDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Generate unique member ID
userSchema.pre('validate', async function(next) {
  if (this.memberId) {
    return next();
  }

  const User = mongoose.model('User');
  const users = await User.find({ isAdmin: false, memberId: /^MEM\d+$/ }, 'memberId').lean();

  const usedNumbers = new Set(
    users
      .map((user) => {
        const match = String(user.memberId || '').match(/(\d+)$/);
        return match ? Number(match[1]) : null;
      })
      .filter((value) => value !== null)
  );

  let nextNumber = 1;
  while (usedNumbers.has(nextNumber)) {
    nextNumber += 1;
  }

  this.memberId = `MEM${String(nextNumber).padStart(4, '0')}`;
  next();
});

module.exports = mongoose.model('User', userSchema);