const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  bookingNumber: {
    type: String,
    unique: true,
    index: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
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
    zipCode: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  dropoffLocation: {
    address: { type: String, required: true },
    city: String,
    zipCode: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  bookingDate: {
    type: Date,
    required: true
  },
  estimatedDistance: {
    type: Number,
    default: null // in kilometers
  },
  estimatedDuration: {
    type: Number,
    default: null // in minutes
  },
  bookingStatus: {
    type: String,
    enum: ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'on_hold'],
    default: 'pending'
  },
  statusHistory: [{
    status: String,
    timestamp: { type: Date, default: Date.now },
    notes: String
  }],
  items: [{
    description: String,
    quantity: Number,
    weight: Number, // in kg
    dimensions: {
      length: Number,
      width: Number,
      height: Number
    },
    fragile: { type: Boolean, default: false },
    specialHandling: String
  }],
  pricing: {
    basePrice: { type: Number, required: true },
    distance: { type: Number, default: 0 },
    surcharge: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    totalPrice: { type: Number, required: true },
    currency: { type: String, default: 'ZAR' }
  },
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'partial', 'paid', 'refunded'],
    default: 'unpaid'
  },
  paymentMethod: {
    type: String,
    enum: ['stripe', 'payfast', 'bank_transfer', 'cash'],
    default: null
  },
  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment',
    default: null
  },
  additionalNotes: String,
  specialRequirements: String,
  contactPerson: {
    name: String,
    phone: String,
    email: String
  },
  rating: {
    score: { type: Number, min: 1, max: 5, default: null },
    review: String,
    ratedAt: Date
  },
  routeTracking: {
    isActive: { type: Boolean, default: false },
    currentLocation: {
      latitude: Number,
      longitude: Number
    },
    estimatedArrival: Date,
    actualArrival: Date
  },
  documents: [{
    name: String,
    url: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Pre-save middleware to generate booking number
bookingSchema.pre('save', async function(next) {
  if (!this.bookingNumber) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    
    // Get the count of bookings this month
    const count = await mongoose.model('Booking').countDocuments({
      createdAt: {
        $gte: new Date(year, date.getMonth(), 1),
        $lt: new Date(year, date.getMonth() + 1, 1)
      }
    });
    
    this.bookingNumber = `DMG-${year}${month}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

// Indexes for performance
bookingSchema.index({ bookingNumber: 1 });
bookingSchema.index({ customerId: 1 });
bookingSchema.index({ driverId: 1 });
bookingSchema.index({ bookingStatus: 1 });
bookingSchema.index({ bookingDate: 1 });
bookingSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Booking', bookingSchema);
