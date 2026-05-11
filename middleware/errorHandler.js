const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  // Handle validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn(`Validation error: ${JSON.stringify(errors.array())}`);
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: errors.array()
    });
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    logger.warn(`Mongoose validation error: ${messages}`);
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: messages
    });
  }

  // Handle Mongoose cast errors
  if (err.name === 'CastError') {
    logger.warn(`Invalid ID format: ${err.value}`);
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format'
    });
  }

  // Handle duplicate key errors
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    logger.warn(`Duplicate key error on field: ${field}`);
    return res.status(409).json({
      success: false,
      message: `${field} already exists`
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    logger.warn(`JWT error: ${err.message}`);
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    logger.warn(`Token expired: ${err.message}`);
    return res.status(401).json({
      success: false,
      message: 'Token expired'
    });
  }

  // Handle generic errors
  logger.error(`Server error: ${err.message}`);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;
