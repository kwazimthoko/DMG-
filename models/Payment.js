const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    unique: true,
    index: true
  },
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'ZAR'
  },
  paymentMethod: {
    type: String,
    enum: ['stripe', 'payfast', 'bank_transfer', 'cash'],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'],
    default: 'pending'
  },
  // Stripe-specific
  stripePaymentIntentId: String,
  stripeClientSecret: String,
  
  // PayFast-specific
  payfastReference: String,
  payfastMerchantReference: String,
  payfastSignature: String,
  
  // Card Information (stored securely)
  cardLast4: String,
  cardBrand: String,
  cardExpiry: String,
  
  // Bank Transfer
  bankName: String,
  accountNumber: String,
  accountHolder: String,
  reference: String,
  
  // Receipt & Invoice
  receiptUrl: String,
  invoiceUrl: String,
  
  // Refund Information
  refundAmount: { type: Number, default: 0 },
  refundReason: String,
  refundedAt: Date,
  
  // Provider Information
  providerTransactionId: String,
  providerResponse: mongoose.Schema.Types.Mixed,
  
  // Retry Logic
  retryCount: { type: Number, default: 0 },
  maxRetries: { type: Number, default: 3 },
  lastRetryAt: Date,
  
  // Error Handling
  errorMessage: String,
  errorCode: String,
  
  // Metadata
  description: String,
  metadata: mongoose.Schema.Types.Mixed,
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  completedAt: Date,
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Pre-save middleware to generate transaction ID
paymentSchema.pre('save', async function(next) {
  if (!this.transactionId) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    
    // Get the count of payments this month
    const count = await mongoose.model('Payment').countDocuments({
      createdAt: {
        $gte: new Date(year, date.getMonth(), 1),
        $lt: new Date(year, date.getMonth() + 1, 1)
      }
    });
    
    this.transactionId = `TXN-${year}${month}-${String(count + 1).padStart(8, '0')}`;
  }
  next();
});

// Method to check if payment can be retried
paymentSchema.methods.canRetry = function() {
  return this.retryCount < this.maxRetries && 
         ['pending', 'processing', 'failed'].includes(this.paymentStatus);
};

// Method to increment retry count
paymentSchema.methods.incrementRetry = async function() {
  this.retryCount += 1;
  this.lastRetryAt = new Date();
  return this.save();
};

// Method to mark as completed
paymentSchema.methods.markCompleted = async function() {
  this.paymentStatus = 'completed';
  this.completedAt = new Date();
  return this.save();
};

// Method to refund payment
paymentSchema.methods.refund = async function(amount, reason) {
  this.refundAmount = amount;
  this.refundReason = reason;
  this.refundedAt = new Date();
  this.paymentStatus = 'refunded';
  return this.save();
};

// Indexes for performance
paymentSchema.index({ transactionId: 1 });
paymentSchema.index({ bookingId: 1 });
paymentSchema.index({ customerId: 1 });
paymentSchema.index({ paymentStatus: 1 });
paymentSchema.index({ createdAt: -1 });
paymentSchema.index({ payfastReference: 1 });
paymentSchema.index({ stripePaymentIntentId: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
