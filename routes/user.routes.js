const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const User = require('../models/User');
const logger = require('../utils/logger');

const router = express.Router();

// Get All Users (Admin)
router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      users: users.map(u => u.toJSON())
    });
  } catch (error) {
    logger.error(`Get users error: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get User by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      user: user.toJSON()
    });
  } catch (error) {
    logger.error(`Get user error: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update User Profile
router.put('/:id', authenticate, async (req, res) => {
  try {
    // Users can only update their own profile (except admin)
    if (req.user.role !== 'admin' && req.userId !== req.params.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this profile'
      });
    }

    const allowedUpdates = ['fullName', 'phone', 'profileImage', 'preferences'];
    const updates = {};
    
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    logger.info(`User profile updated: ${user._id}`);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: user.toJSON()
    });
  } catch (error) {
    logger.error(`Update user error: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update User Status (Admin)
router.put('/:id/status', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { accountStatus } = req.body;

    if (!['active', 'inactive', 'suspended', 'verified'].includes(accountStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid account status'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { accountStatus, updatedAt: new Date() },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    logger.info(`User status updated: ${user._id} to ${accountStatus}`);

    res.status(200).json({
      success: true,
      message: 'User status updated successfully',
      user: user.toJSON()
    });
  } catch (error) {
    logger.error(`Update user status error: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete User (Admin)
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    logger.info(`User deleted: ${user._id}`);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    logger.error(`Delete user error: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
