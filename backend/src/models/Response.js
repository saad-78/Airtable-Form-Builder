const mongoose = require('mongoose');

const responseSchema = new mongoose.Schema({
  formId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Form',
    required: true
  },
  
  airtableRecordId: {
    type: String,
    required: true
  },
  
  answers: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    required: true
  },
  
  submitterIp: String,
  userAgent: String,
  
  deletedInAirtable: {
    type: Boolean,
    default: false
  },
  deletedAt: Date,
  
  lastSyncedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

responseSchema.index({ formId: 1, createdAt: -1 });
responseSchema.index({ airtableRecordId: 1 });
responseSchema.index({ deletedInAirtable: 1 });

module.exports = mongoose.model('Response', responseSchema);
