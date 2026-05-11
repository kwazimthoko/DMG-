const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const Booking = require('../models/Booking');
const logger = require('../utils/logger');

const router = express.Router();

// Create Booking (Customer)
router.post('/', authenticate, authorize('customer', 'admin'), async (req, res) => {
  try {
    const bookingData = {
      customerId: req.userId,
      ...req.body
    };

    const booking = new Booking(bookingData);
    await booking.save();
    await booking.populate('customerId');

    logger.info(`Booking created: ${booking._id}`);

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      booking
    });
  } catch (error) {
    logger.error(`Create booking error: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get All Bookings
router.get('/', authenticate, async (req, res) => {
  try {
    const query = req.user.role === 'customer' ? { customerId: req.userId } : {};
    const bookings = await Booking.find(query)
      .populate('customerId')
      .populate('driverId')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: bookings.length,
      bookings
    });
  } catch (error) {
    logger.error(`Get bookings error: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get Booking by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('customerId')
      .populate('driverId');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    res.status(200).json({
      success: true,
      booking
    });
  } catch (error) {
    logger.error(`Get booking error: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update Booking
router.put('/:id', authenticate, async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).populate('customerId').populate('driverId');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    logger.info(`Booking updated: ${booking._id}`);

    res.status(200).json({
      success: true,
      message: 'Booking updated successfully',
      booking
    });
  } catch (error) {
    logger.error(`Update booking error: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Cancel Booking
router.post('/:id/cancel', authenticate, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    booking.bookingStatus = 'cancelled';
    booking.statusHistory.push({
      status: 'cancelled',
      notes: req.body.cancellationReason || 'Cancelled by customer'
    });
    await booking.save();

    logger.info(`Booking cancelled: ${booking._id}`);

    res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully',
      booking
    });
  } catch (error) {
    logger.error(`Cancel booking error: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
