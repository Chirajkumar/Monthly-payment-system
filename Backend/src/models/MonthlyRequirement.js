const mongoose = require('mongoose');

const monthlyRequirementSchema = new mongoose.Schema({
  month: {
    type: String,
    required: true
  },
  year: {
    type: Number,
    required: true
  },
  amount: {
    type: Number,
    required: true,
    default: 200
  },
  dueDate: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  description: {
    type: String,
    default: 'Monthly contribution'
  }
}, {
  timestamps: true
});

// Compound index for unique month-year
monthlyRequirementSchema.index({ month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('MonthlyRequirement', monthlyRequirementSchema);