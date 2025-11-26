const mongoose = require('mongoose');

const conditionSchema = new mongoose.Schema({
  questionKey: {
    type: String,
    required: true
  },
  operator: {
    type: String,
    enum: ['equals', 'notEquals', 'contains'],
    required: true
  },
  value: mongoose.Schema.Types.Mixed
}, { _id: false });

const conditionalRulesSchema = new mongoose.Schema({
  logic: {
    type: String,
    enum: ['AND', 'OR'],
    default: 'AND'
  },
  conditions: [conditionSchema]
}, { _id: false });

const questionSchema = new mongoose.Schema({
  questionKey: {
    type: String,
    required: true
  },
  airtableFieldId: {
    type: String,
    required: true
  },
  airtableFieldName: String, 
  label: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['singleLineText', 'multilineText', 'singleSelect', 'multipleSelects', 'attachment'],
    required: true
  },
  required: {
    type: Boolean,
    default: false
  },
  options: [String],
  
  conditionalRules: {
    type: conditionalRulesSchema,
    default: null
  },
  
  order: {
    type: Number,
    default: 0
  }
}, { _id: false });

const formSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: String,
  
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  airtableBaseId: {
    type: String,
    required: true
  },
  airtableTableId: {
    type: String,
    required: true
  },
  airtableTableName: String,
  
  questions: [questionSchema],
  
  isActive: {
    type: Boolean,
    default: true
  },
  allowMultipleSubmissions: {
    type: Boolean,
    default: true
  },
  
  airtableWebhookId: String,
  webhookActive: {
    type: Boolean,
    default: false
  },
  
  submissionCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

formSchema.index({ ownerId: 1, createdAt: -1 });

module.exports = mongoose.model('Form', formSchema);
