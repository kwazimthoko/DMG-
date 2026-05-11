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
    enum: ['stripe', 'payfast', 'bank_transfer', 'cash', 'credit_card'],
    required: true
  },
  
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'],
    default: 'pending'
  },
  
  // Payment Provider Reference
  providerTransactionId: String,
  providerReference: String,
  
  // Stripe Specific
  stripePaymentIntentId: String,
  
  // PayFast Specific
  payfastMerchantPaymentId: String,
  
  // Payer Information
  payerEmail: String,
  payerName: String,
  payerPhone: String,
  
  // Card Information (if applicable)
  cardLast4: String,
  cardBrand: String,
  cardExpiry: String,
  
  // Additional Details
  description: String,
  notes: String,
  
  // Receipt
  receiptUrl: String,
  invoiceUrl: String,
  
  // Refund Information
  refundAmount: {
    type: Number,
    default: 0
  },
  refundReason: String,
  refundDate: Date,
  
  // Error Handling
  errorMessage: String,
  retryCount: {
    type: Number,
    default: 0
  },
  
  // Metadata
  metadata: mongoose.Schema.Types.Mixed,
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Auto-generate transaction ID
paymentSchema.pre('save', async function(next) {
  if (!this.transactionId) {
    const count = await this.constructor.countDocuments();
    const date = new Date();
    this.transactionId = `TXN-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}-${String(count + 1).padStart(8, '0')}`;
  }
  next();
});

// Index for faster queries
paymentSchema.index({ bookingId: 1, createdAt: -1 });
paymentSchema.index({ customerId: 1, createdAt: -1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ transactionId: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
