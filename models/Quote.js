const mongoose = require('mongoose');

const quoteSchema = new mongoose.Schema({
  quoteNumber: {
    type: String,
    unique: true,
    index: true
  },
  customerName: {
    type: String,
    required: true
  },
  customerEmail: {
    type: String,
    required: true,
    lowercase: true
  },
  customerPhone: {
    type: String,
    required: true
  },
  serviceType: {
    type: String,
    enum: [
      'Household Relocations',
      'Furniture Removals',
      'Delivery Services',
      'Commercial Logistics',
      'Parcel Transportation',
      'Shuttle Services',
      'Office Relocations',
      'Cargo Transport',
      'Long Distance Deliveries'
    ],
    required: true
  },
  pickupLocation: {
    address: { type: String, required: true },
    city: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  dropoffLocation: {
    address: { type: String, required: true },
    city: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  description: {
    type: String,
    required: true
  },
  itemsDescription: String,
  estimatedWeight: Number, // in kg
  estimatedVolume: Number, // in cubic meters
  preferredDate: Date,
  urgency: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  quotePrice: {
    type: Number,
    default: null
  },
  currency: {
    type: String,
    default: 'ZAR'
  },
  validityPeriod: {
    type: Number,
    default: 7 // days
  },
  expiryDate: Date,
  quoteStatus: {
    type: String,
    enum: ['pending', 'sent', 'accepted', 'rejected', 'expired', 'converted'],
    default: 'pending'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  adminNotes: String,
  rejectionReason: String,
  convertedBookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    default: null
  },
  attachments: [{
    name: String,
    url: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  sentAt: Date,
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Pre-save middleware to generate quote number and expiry date
quoteSchema.pre('save', async function(next) {
  if (!this.quoteNumber) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    
    // Get the count of quotes this month
    const count = await mongoose.model('Quote').countDocuments({
      createdAt: {
        $gte: new Date(year, date.getMonth(), 1),
        $lt: new Date(year, date.getMonth() + 1, 1)
      }
    });
    
    this.quoteNumber = `QUOTE-${year}${month}-${String(count + 1).padStart(5, '0')}`;
  }
  
  if (!this.expiryDate) {
    this.expiryDate = new Date(this.createdAt.getTime() + this.validityPeriod * 24 * 60 * 60 * 1000);
  }
  
  next();
});

// Index for performance
quoteSchema.index({ quoteNumber: 1 });
quoteSchema.index({ customerEmail: 1 });
quoteSchema.index({ quoteStatus: 1 });
quoteSchema.index({ expiryDate: 1 });
quoteSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Quote', quoteSchema);
