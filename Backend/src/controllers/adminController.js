const User = require('../models/User');
const Payment = require('../models/Payment');
const MonthlyRequirement = require('../models/MonthlyRequirement');
const cloudinary = require('cloudinary').v2;

// Get all members
exports.getAllMembers = async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;

    let query = { isAdmin: false };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { memberId: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const members = await User.find(query)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      members,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Add member
exports.addMember = async (req, res) => {
  try {
    const { name, dateOfBirth, email, phone } = req.body;

    const user = new User({
      name,
      dateOfBirth: new Date(dateOfBirth),
      email,
      phone,
      isActive: true
    });

    await user.save();

    // Create pending payment for current month
    const now = new Date();
    const month = now.toLocaleString('default', { month: 'long' });
    const year = now.getFullYear();

    const payment = new Payment({
      userId: user._id,
      month,
      year,
      amount: 200,
      status: 'pending'
    });
    await payment.save();

    res.status(201).json({
      success: true,
      message: 'Member added successfully',
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update member
exports.updateMember = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, isActive } = req.body;

    const user = await User.findByIdAndUpdate(
      id,
      { name, email, phone, isActive },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    res.json({
      success: true,
      message: 'Member updated successfully',
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Delete member
exports.deleteMember = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByIdAndUpdate(id, { isActive: false });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    res.json({
      success: true,
      message: 'Member deactivated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get monthly payment status for all members
exports.getMonthlyStatus = async (req, res) => {
  try {
    const { month, year } = req.query;
    const searchMonth = month || new Date().toLocaleString('default', { month: 'long' });
    const searchYear = parseInt(year) || new Date().getFullYear();

    const members = await User.find({ isAdmin: false });

    const statuses = await Promise.all(members.map(async (member) => {
      const payment = await Payment.findOne({
        userId: member._id,
        month: searchMonth,
        year: searchYear
      });

      return {
        member: {
          id: member._id,
          name: member.name,
          memberId: member.memberId,
          email: member.email,
          phone: member.phone
        },
        payment: payment || null
      };
    }));

    const paidStatuses = statuses.filter(({ payment }) =>
      payment?.status === 'verified' || payment?.status === 'paid'
    );

    res.json({
      success: true,
      month: searchMonth,
      year: searchYear,
      totalMembers: members.length,
      paid: paidStatuses.length,
      pending: members.length - paidStatuses.length,
      data: statuses
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Verify payment
exports.verifyPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { status, rejectionReason } = req.body;

    const normalizedStatus =
      status === 'approved' || status === 'verified' ? 'verified' :
      status === 'cancelled' || status === 'rejected' ? 'rejected' :
      status;

    const payment = await Payment.findByIdAndUpdate(
      paymentId,
      {
        status: normalizedStatus,
        verifiedBy: req.userId,
        verifiedAt: new Date(),
        ...(rejectionReason && { rejectionReason })
      },
      { new: true }
    );

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    res.json({
      success: true,
      message: `Payment ${normalizedStatus === 'paid' ? 'approved' : 'cancelled'} successfully`,
      payment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get payment statistics
exports.getPaymentStatistics = async (req, res) => {
  try {
    const totalMembers = await User.countDocuments({ isAdmin: false });
    const currentMonth = new Date().toLocaleString('default', { month: 'long' });
    const currentYear = new Date().getFullYear();

    const currentMonthPaid = await Payment.countDocuments({
      month: currentMonth,
      year: currentYear,
      status: { $in: ['paid', 'verified'] }
    });

    const totalCollected = await Payment.aggregate([
      { $match: { status: { $in: ['paid', 'verified'] } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const monthlyStats = await Payment.aggregate([
      {
        $group: {
          _id: { month: '$month', year: '$year' },
          totalPaid: { $sum: { $cond: [{ $in: ['$status', ['paid', 'verified']] }, '$amount', 0] } },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } }
    ]);

    res.json({
      success: true,
      statistics: {
        totalMembers,
        currentMonth: {
          month: currentMonth,
          year: currentYear,
          paid: currentMonthPaid,
          pending: totalMembers - currentMonthPaid,
          total: totalMembers
        },
        totalCollected: totalCollected[0]?.total || 0,
        monthlyStats
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};