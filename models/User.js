const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    // Basic Information
    fullName: {
      type: String,
      required: [true, 'Please provide a full name'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address']
    },
    phone: {
      type: String,
      required: [true, 'Please provide a phone number'],
      match: [/^[0-9\s\-\+\(\)]{10,}$/, 'Please provide a valid phone number']
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false // Don't return password by default
    },
    
    // Role & Permissions
    role: {
      type: String,
      enum: ['customer', 'driver', 'admin'],
      default: 'customer'
    },
    
    // Address
    address: {
      street: String,
      city: String,
      province: String,
      postalCode: String,
      country: { type: String, default: 'South Africa' }
    },
    
    // Profile
    profileImage: String,
    idNumber: String,
    dateOfBirth: Date,
    
    // Driver-specific Fields
    driverLicense: {
      number: String,
      expiryDate: Date,
      category: String // Professional, Commercial, etc.
    },
    vehicle: {
      registration: String,
      make: String,
      model: String,
      color: String,
      capacity: String // Passenger or cargo capacity
    },
    driverRating: {
      type: Number,
      default: 5,
      min: 1,
      max: 5
    },
    totalTrips: {
      type: Number,
      default: 0
    },
    
    // Account Status
    isVerified: {
      type: Boolean,
      default: false
    },
    isActive: {
      type: Boolean,
      default: true
    },
    isBlocked: {
      type: Boolean,
      default: false
    },
    
    // Preferences
    preferences: {
      notifyByEmail: { type: Boolean, default: true },
      notifyByWhatsApp: { type: Boolean, default: true },
      notifyBySMS: { type: Boolean, default: false },
      newsletter: { type: Boolean, default: true }
    },
    
    // Verification & Recovery
    emailVerificationToken: String,
    emailVerificationTokenExpiry: Date,
    passwordResetToken: String,
    passwordResetTokenExpiry: Date,
    
    // Metadata
    lastLogin: Date,
    loginAttempts: { type: Number, default: 0 },
    lockUntil: Date
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Prevent password from being returned
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.passwordResetToken;
  delete obj.emailVerificationToken;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
