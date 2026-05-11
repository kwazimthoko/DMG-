const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const logger = require('../utils/logger');

const router = express.Router();

// Create Payment
router.post('/', authenticate, async (req, res) => {
  try {
    const paymentData = {
      customerId: req.userId,
      ...req.body,
      paymentStatus: 'pending'
    };

    const payment = new Payment(paymentData);
    await payment.save();
    await payment.populate('customerId');
    await payment.populate('bookingId');

    logger.info(`Payment created: ${payment._id}`);

    res.status(201).json({
      success: true,
      message: 'Payment created successfully',
      payment
    });
  } catch (error) {
    logger.error(`Create payment error: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get All Payments (Admin)
router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate('customerId')
      .populate('bookingId')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: payments.length,
      payments
    });
  } catch (error) {
    logger.error(`Get payments error: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get Payment by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('customerId')
      .populate('bookingId');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    res.status(200).json({
      success: true,
      payment
    });
  } catch (error) {
    logger.error(`Get payment error: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Process Payment
router.post('/:id/process', authenticate, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Update payment status to processing
    payment.paymentStatus = 'processing';
    await payment.save();

    logger.info(`Payment processing: ${payment._id}`);

    res.status(200).json({
      success: true,
      message: 'Payment is being processed',
      payment
    });
  } catch (error) {
    logger.error(`Process payment error: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Complete Payment
router.post('/:id/complete', authenticate, authorize('admin'), async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    await payment.markCompleted();

    // Update booking payment status
    if (payment.bookingId) {
      await Booking.findByIdAndUpdate(
        payment.bookingId,
        { paymentStatus: 'paid' }
      );
    }

    logger.info(`Payment completed: ${payment._id}`);

    res.status(200).json({
      success: true,
      message: 'Payment completed successfully',
      payment
    });
  } catch (error) {
    logger.error(`Complete payment error: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Refund Payment
router.post('/:id/refund', authenticate, authorize('admin'), async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    const { amount, reason } = req.body;
    await payment.refund(amount, reason);

    logger.info(`Payment refunded: ${payment._id}`);

    res.status(200).json({
      success: true,
      message: 'Payment refunded successfully',
      payment
    });
  } catch (error) {
    logger.error(`Refund payment error: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
