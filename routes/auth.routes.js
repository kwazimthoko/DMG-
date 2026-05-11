const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { generateToken, generateRefreshToken, verifyToken } = require('../utils/jwt');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Register Route
router.post(
  '/register',
  [
    body('fullName').trim().notEmpty().withMessage('Full name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('phone').isMobilePhone().withMessage('Valid phone number is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('role').optional().isIn(['customer', 'driver']).withMessage('Invalid role')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { fullName, email, phone, password, role } = req.body;

      // Check if user exists
      const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'Email or phone number already registered'
        });
      }

      // Create new user
      const user = new User({
        fullName,
        email,
        phone,
        password,
        role: role || 'customer',
        accountStatus: 'active'
      });

      await user.save();
      logger.info(`New user registered: ${user._id}`);

      const token = generateToken(user._id);
      const refreshToken = generateRefreshToken(user._id);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        token,
        refreshToken,
        user: user.toJSON()
      });
    } catch (error) {
      logger.error(`Registration error: ${error.message}`);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// Login Route
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { email, password } = req.body;

      // Find user and select password
      const user = await User.findOne({ email }).select('+password');
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Check if account is locked
      if (user.isLocked()) {
        return res.status(403).json({
          success: false,
          message: 'Account is temporarily locked. Try again later.'
        });
      }

      // Compare password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        await user.incLoginAttempts();
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Reset login attempts on successful login
      await user.resetLoginAttempts();
      user.lastLogin = new Date();
      await user.save();

      logger.info(`User logged in: ${user._id}`);

      const token = generateToken(user._id);
      const refreshToken = generateRefreshToken(user._id);

      res.status(200).json({
        success: true,
        message: 'Login successful',
        token,
        refreshToken,
        user: user.toJSON()
      });
    } catch (error) {
      logger.error(`Login error: ${error.message}`);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// Refresh Token Route
router.post(
  '/refresh-token',
  [
    body('refreshToken').notEmpty().withMessage('Refresh token is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { refreshToken } = req.body;

      try {
        const decoded = verifyToken(refreshToken);
        const newToken = generateToken(decoded.id);
        const newRefreshToken = generateRefreshToken(decoded.id);

        res.status(200).json({
          success: true,
          message: 'Token refreshed successfully',
          token: newToken,
          refreshToken: newRefreshToken
        });
      } catch (error) {
        return res.status(401).json({
          success: false,
          message: 'Invalid refresh token'
        });
      }
    } catch (error) {
      logger.error(`Token refresh error: ${error.message}`);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// Verify Token Route
router.post(
  '/verify-token',
  [
    body('token').notEmpty().withMessage('Token is required')
  ],
  (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { token } = req.body;

      try {
        const decoded = verifyToken(token);
        res.status(200).json({
          success: true,
          message: 'Token is valid',
          userId: decoded.id
        });
      } catch (error) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired token'
        });
      }
    } catch (error) {
      logger.error(`Token verification error: ${error.message}`);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// Get Current User Route (requires authentication)
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    res.status(200).json({
      success: true,
      user: user.toJSON()
    });
  } catch (error) {
    logger.error(`Get user error: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
