const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  airtableUserId: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    sparse: true 
  },
  airtableName: String,
  
  accessToken: {
    type: String,
    required: true
  },
  refreshToken: String,
  tokenExpiry: Date,
  
  scopes: [String],
  
  loginTimestamp: {
    type: Date,
    default: Date.now
  },
  
  lastActive: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

userSchema.pre('findOneAndUpdate', function(next) {
  this.set({ lastActive: new Date() });
  next();
});

module.exports = mongoose.model('User', userSchema);
