const Payment = require('../models/Payment');
const User = require('../models/User');
const cloudinary = require('cloudinary').v2;

// Get current month's payment status
exports.getCurrentMonthPayment = async (req, res) => {
  try {
    const userId = req.userId;
    const now = new Date();
    
    // Allow optional month/year parameters
    const month = req.query.month || now.toLocaleString('default', { month: 'long' });
    const year = req.query.year ? parseInt(req.query.year) : now.getFullYear();

    let payment = await Payment.findOne({
      userId,
      month,
      year
    }).sort({ createdAt: -1 });

    if (!payment) {
      // Create pending payment for the requested month
      payment = new Payment({
        userId,
        month,
        year,
        amount: 200,
        status: 'pending'
      });
      await payment.save();
    }

    res.json({
      success: true,
      payment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get payment history
exports.getPaymentHistory = async (req, res) => {
  try {
    const userId = req.userId;
    const { page = 1, limit = 12 } = req.query;

    const payments = await Payment.find({ userId })
      .sort({ year: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Payment.countDocuments({ userId });

    res.json({
      success: true,
      payments,
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

// Submit payment with proof
exports.submitPayment = async (req, res) => {
  try {
    const userId = req.userId;
    const { month, year, paymentDate, paymentMethod, paidTo, payerName, transactionId } = req.body;

    if (!paidTo || !paidTo.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please enter who you paid or gave the money to.'
      });
    }

    // Fetch user to get their name
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    const normalizedMethod = paymentMethod === 'online' ? 'online' : 'cash';

    const existingPayment = await Payment.findOne({ userId, month, year }).sort({ createdAt: -1 });
    const allowedResubmissionStatuses = ['pending', 'rejected'];
    if (existingPayment && !allowedResubmissionStatuses.includes(existingPayment.status)) {
      return res.status(400).json({
        success: false,
        message: `Payment for ${month} ${year} has already been ${existingPayment.status}. You can pay for a different month.`
      });
    }

    if (normalizedMethod === 'online' && !req.file) {
      return res.status(400).json({
        success: false,
        message: 'Payment proof is required for online payment.'
      });
    }

    // Upload screenshot to Cloudinary, or fallback to data URL when Cloudinary is not configured.
    let paymentProof = '';
    if (req.file) {
      const cloudinaryConfigured = Boolean(
        process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_CLOUD_NAME !== 'your-cloud-name' &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_KEY !== 'your-api-key' &&
        process.env.CLOUDINARY_API_SECRET &&
        process.env.CLOUDINARY_API_SECRET !== 'your-api-secret'
      );

      if (cloudinaryConfigured) {
        let uploadSource;

        if (req.file.buffer) {
          const base64 = req.file.buffer.toString('base64');
          uploadSource = `data:${req.file.mimetype};base64,${base64}`;
        } else if (req.file.path) {
          uploadSource = req.file.path;
        }

        if (uploadSource) {
          const result = await cloudinary.uploader.upload(uploadSource, {
            folder: 'payment-proofs',
            public_id: `${userId}_${month}_${year}_${Date.now()}`
          });
          paymentProof = result.secure_url;
        }
      } else {
        paymentProof = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      }
    }

    const payment = await Payment.findOneAndUpdate(
      { userId, month, year },
      {
        $set: {
          amount: 200,
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          paymentMethod: normalizedMethod,
          paidTo: paidTo.trim(),
          payerName: payerName ? payerName.trim() : user.name,
          paymentProof,
          transactionId: transactionId || '',
          status: 'paid'
        }
      },
      { new: true, upsert: true }
    );

    console.log('Payment submitted/updated:', {
      id: payment._id,
      month: payment.month,
      year: payment.year,
      amount: payment.amount,
      status: payment.status,
      paymentMethod: payment.paymentMethod
    });

    res.json({
      success: true,
      message: 'Payment submitted successfully',
      payment
    });
  } catch (error) {
    console.error('Error in submitPayment:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get payment summary
exports.getPaymentSummary = async (req, res) => {
  try {
    const userId = req.userId;
    console.log('\n========== PAYMENT SUMMARY ==========');
    console.log('UserId:', userId);

    // Get all paid/verified payments
    const paidPayments = await Payment.find({
      userId: userId,
      status: { $in: ['paid', 'verified'] }
    }).select('amount month year status');

    console.log('Paid payments found:', paidPayments.length);
    paidPayments.forEach(p => {
      console.log(`  - ${p.month} ${p.year}: Rs ${p.amount || 0} (${p.status})`);
    });

    // Calculate total manually
    let totalPaid = 0;
    paidPayments.forEach(payment => {
      const amount = Number(payment.amount) || 200;
      totalPaid += amount;
    });

    console.log('Total Paid Calculated:', totalPaid);

    const totalPending = await Payment.countDocuments({
      userId: userId,
      status: 'pending'
    });

    const currentMonth = new Date().toLocaleString('default', { month: 'long' });
    const currentYear = new Date().getFullYear();

    const currentMonthPayment = await Payment.findOne({
      userId: userId,
      month: currentMonth,
      year: currentYear
    });

    const monthsPaidCount = paidPayments.length;

    const currentMonthStatus = currentMonthPayment?.status || 'pending';

    console.log('Response:', {
      totalPaid,
      totalPending,
      monthsPaid: monthsPaidCount,
      currentStatus: currentMonthStatus
    });
    console.log('========== END SUMMARY ==========\n');

    res.json({
      success: true,
      summary: {
        totalPaid: totalPaid,
        totalPending: totalPending,
        currentMonthStatus: currentMonthStatus,
        monthsPaid: monthsPaidCount
      }
    });
  } catch (error) {
    console.error('Error in getPaymentSummary:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};