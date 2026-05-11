const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const Quote = require('../models/Quote');
const logger = require('../utils/logger');

const router = express.Router();

// Request Quote
router.post('/', async (req, res) => {
  try {
    const quoteData = {
      ...req.body,
      quoteStatus: 'pending'
    };

    const quote = new Quote(quoteData);
    await quote.save();

    logger.info(`Quote requested: ${quote._id}`);

    res.status(201).json({
      success: true,
      message: 'Quote request submitted successfully',
      quote
    });
  } catch (error) {
    logger.error(`Request quote error: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get All Quotes (Admin)
router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const quotes = await Quote.find()
      .populate('assignedTo')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: quotes.length,
      quotes
    });
  } catch (error) {
    logger.error(`Get quotes error: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get Quote by ID
router.get('/:id', async (req, res) => {
  try {
    const quote = await Quote.findById(req.params.id).populate('assignedTo');

    if (!quote) {
      return res.status(404).json({
        success: false,
        message: 'Quote not found'
      });
    }

    res.status(200).json({
      success: true,
      quote
    });
  } catch (error) {
    logger.error(`Get quote error: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update Quote (Admin)
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const quote = await Quote.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).populate('assignedTo');

    if (!quote) {
      return res.status(404).json({
        success: false,
        message: 'Quote not found'
      });
    }

    logger.info(`Quote updated: ${quote._id}`);

    res.status(200).json({
      success: true,
      message: 'Quote updated successfully',
      quote
    });
  } catch (error) {
    logger.error(`Update quote error: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Send Quote to Customer
router.post('/:id/send', authenticate, authorize('admin'), async (req, res) => {
  try {
    const quote = await Quote.findById(req.params.id);

    if (!quote) {
      return res.status(404).json({
        success: false,
        message: 'Quote not found'
      });
    }

    quote.quoteStatus = 'sent';
    quote.sentAt = new Date();
    await quote.save();

    logger.info(`Quote sent: ${quote._id}`);

    res.status(200).json({
      success: true,
      message: 'Quote sent successfully',
      quote
    });
  } catch (error) {
    logger.error(`Send quote error: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
