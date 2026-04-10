/**
 * PHARMASTOCK — models/User.js
 * User authentication model with role-based access
 */

const mongoose = require('mongoose');
const crypto   = require('crypto');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    lowercase: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
  },
  passwordHash: {
    type: String,
    required: true,
  },
  salt: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['admin', 'cashier', 'viewer'],
    default: 'cashier',
  },
  displayName: {
    type: String,
    trim: true,
  },
  active: {
    type: Boolean,
    default: true,
  },
  lastLogin: Date,
}, {
  timestamps: true,
});

/* ── Password hashing ── */
UserSchema.methods.setPassword = function (password) {
  this.salt = crypto.randomBytes(16).toString('hex');
  this.passwordHash = crypto
    .pbkdf2Sync(password, this.salt, 1000, 64, 'sha512')
    .toString('hex');
};

UserSchema.methods.validatePassword = function (password) {
  const hash = crypto
    .pbkdf2Sync(password, this.salt, 1000, 64, 'sha512')
    .toString('hex');
  return this.passwordHash === hash;
};

/* ── Never expose sensitive fields ── */
UserSchema.methods.toSafeObject = function () {
  return {
    id:          this._id,
    username:    this.username,
    email:       this.email,
    role:        this.role,
    displayName: this.displayName,
    active:      this.active,
    lastLogin:   this.lastLogin,
  };
};

module.exports = mongoose.model('User', UserSchema);
