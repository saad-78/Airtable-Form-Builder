const express = require('express');
const router = express.Router();
const Form = require('../models/Form');
const authenticate = require('../middleware/authenticate');
const AirtableClient = require('../utils/airtableClient');
const { getVisibleQuestions } = require('../utils/conditionalLogic');

router.post('/', authenticate, async (req, res) => {
  const { title, description, airtableBaseId, airtableTableId, airtableTableName, questions } = req.body;
  
  if (!title || !airtableBaseId || !airtableTableId || !questions || questions.length === 0) {
    return res.status(400).json({ 
      success: false, 
      message: 'Missing required fields' 
    });
  }
  
  const supportedTypes = ['singleLineText', 'multilineText', 'singleSelect', 'multipleSelects', 'attachment'];
  
  for (const q of questions) {
    if (!supportedTypes.includes(q.type)) {
      return res.status(400).json({
        success: false,
        message: `Unsupported field type: ${q.type}`
      });
    }
  }
  
  try {
    const form = await Form.create({
      title,
      description,
      ownerId: req.userId,
      airtableBaseId,
      airtableTableId,
      airtableTableName,
      questions
    });
    
    const client = new AirtableClient(req.airtableToken);
    
    try {
      const webhookUrl = `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/webhooks/airtable`;
      
      const webhook = await client.createWebhook(airtableBaseId, airtableTableId, webhookUrl);
      
      form.airtableWebhookId = webhook.id;
      form.webhookActive = true;
      await form.save();
    } catch (webhookError) {
      console.error('Webhook creation failed:', webhookError.message);
    }
    
    res.status(201).json({
      success: true,
      form
    });
  } catch (error) {
    console.error('Form creation error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/', authenticate, async (req, res) => {
  try {
    const forms = await Form.find({ ownerId: req.userId })
      .sort({ createdAt: -1 })
      .select('-questions');
    
    res.json({
      success: true,
      forms
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:formId', async (req, res) => {
  const { formId } = req.params;
  
  try {
    const form = await Form.findById(formId);
    
    if (!form) {
      return res.status(404).json({ success: false, message: 'Form not found' });
    }
    
    if (!form.isActive) {
      return res.status(403).json({ success: false, message: 'Form is not active' });
    }
    
    res.json({
      success: true,
      form
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/:formId', authenticate, async (req, res) => {
  const { formId } = req.params;
  const { title, description, questions, isActive } = req.body;
  
  try {
    const form = await Form.findOne({ _id: formId, ownerId: req.userId });
    
    if (!form) {
      return res.status(404).json({ success: false, message: 'Form not found' });
    }
    
    if (title) form.title = title;
    if (description !== undefined) form.description = description;
    if (questions) form.questions = questions;
    if (isActive !== undefined) form.isActive = isActive;
    
    await form.save();
    
    res.json({
      success: true,
      form
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/:formId', authenticate, async (req, res) => {
  const { formId } = req.params;
  
  try {
    const form = await Form.findOne({ _id: formId, ownerId: req.userId });
    
    if (!form) {
      return res.status(404).json({ success: false, message: 'Form not found' });
    }
    
    if (form.airtableWebhookId && form.webhookActive) {
      try {
        const client = new AirtableClient(req.airtableToken);
        await client.deleteWebhook(form.airtableBaseId, form.airtableWebhookId);
      } catch (webhookError) {
        console.error('Webhook deletion failed:', webhookError.message);
      }
    }
    
    await form.deleteOne();
    
    res.json({
      success: true,
      message: 'Form deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:formId/preview', async (req, res) => {
  const { formId } = req.params;
  const answers = req.query.answers ? JSON.parse(req.query.answers) : {};
  
  try {
    const form = await Form.findById(formId);
    
    if (!form) {
      return res.status(404).json({ success: false, message: 'Form not found' });
    }
    
    const visibleQuestions = getVisibleQuestions(form.questions, answers);
    
    res.json({
      success: true,
      visibleQuestions
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
