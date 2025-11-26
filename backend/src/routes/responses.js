const express = require('express');
const router = express.Router();
const Response = require('../models/Response');
const Form = require('../models/Form');
const authenticate = require('../middleware/authenticate');
const AirtableClient = require('../utils/airtableClient');
const { shouldShowQuestion } = require('../utils/conditionalLogic');
const User = require('../models/User');

router.post('/:formId/submit', async (req, res) => {
  const { formId } = req.params;
  const { answers } = req.body;
  
  console.log('Form submission received for form:', formId);
  console.log('Answers:', answers);
  
  if (!answers || typeof answers !== 'object') {
    return res.status(400).json({ success: false, message: 'Invalid answers format' });
  }
  
  try {
    const form = await Form.findById(formId).populate('ownerId');
    
    if (!form) {
      return res.status(404).json({ success: false, message: 'Form not found' });
    }
    
    if (!form.isActive) {
      return res.status(403).json({ success: false, message: 'Form is not accepting responses' });
    }
    
    console.log('Form found:', form.title);
    
    for (const question of form.questions) {
      const isVisible = shouldShowQuestion(question.conditionalRules, answers);
      
      if (!isVisible) continue;
      
      if (question.required && !answers[question.questionKey]) {
        return res.status(400).json({
          success: false,
          message: `Required field missing: ${question.label}`
        });
      }
      
      if (question.type === 'singleSelect' && answers[question.questionKey]) {
        if (!question.options.includes(answers[question.questionKey])) {
          return res.status(400).json({
            success: false,
            message: `Invalid option for ${question.label}`
          });
        }
      }
      
      if (question.type === 'multipleSelects' && answers[question.questionKey]) {
        const answerArray = Array.isArray(answers[question.questionKey]) 
          ? answers[question.questionKey] 
          : [answers[question.questionKey]];
          
        for (const ans of answerArray) {
          if (!question.options.includes(ans)) {
            return res.status(400).json({
              success: false,
              message: `Invalid option for ${question.label}`
            });
          }
        }
      }
    }
    
    const airtableFields = {};
    
    for (const question of form.questions) {
      const isVisible = shouldShowQuestion(question.conditionalRules, answers);
      
      if (isVisible && answers[question.questionKey] !== undefined) {
        airtableFields[question.airtableFieldName || question.airtableFieldId] = answers[question.questionKey];
      }
    }
    
    console.log('Creating Airtable record with fields:', airtableFields);
    
    const client = new AirtableClient(form.ownerId.accessToken);
    
    const airtableRecord = await client.createRecord(
      form.airtableBaseId,
      form.airtableTableId,
      airtableFields
    );
    
    console.log('Airtable record created:', airtableRecord.id);
    
    const response = await Response.create({
      formId,
      airtableRecordId: airtableRecord.id,
      answers,
      submitterIp: req.ip,
      userAgent: req.get('user-agent')
    });
    
    console.log('Response saved to database:', response._id);
    
    form.submissionCount += 1;
    await form.save();
    
    res.status(201).json({
      success: true,
      response: {
        id: response._id,
        submittedAt: response.createdAt
      }
    });
    
  } catch (error) {
    console.error('Form submission error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:formId/responses', authenticate, async (req, res) => {
  const { formId } = req.params;
  const { includeDeleted } = req.query;
  
  console.log('Fetching responses for form:', formId);
  console.log('Include deleted?', includeDeleted);
  
  try {
    const form = await Form.findOne({ _id: formId, ownerId: req.userId });
    
    if (!form) {
      return res.status(404).json({ success: false, message: 'Form not found or unauthorized' });
    }
    
    const query = { formId };
    
    if (includeDeleted !== 'true') {
      query.deletedInAirtable = false;
    }
    
    const responses = await Response.find(query)
      .sort({ createdAt: -1 })
      .lean();
    
    console.log('Found responses:', responses.length);
    
    res.json({
      success: true,
      responses: responses,
      total: responses.length
    });
  } catch (error) {
    console.error('Error fetching responses:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:formId/responses/:responseId', authenticate, async (req, res) => {
  const { formId, responseId } = req.params;
  
  try {
    const form = await Form.findOne({ _id: formId, ownerId: req.userId });
    
    if (!form) {
      return res.status(404).json({ success: false, message: 'Form not found or unauthorized' });
    }
    
    const response = await Response.findOne({ _id: responseId, formId });
    
    if (!response) {
      return res.status(404).json({ success: false, message: 'Response not found' });
    }
    
    res.json({
      success: true,
      response
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:formId/export/csv', authenticate, async (req, res) => {
  const { formId } = req.params;
  
  try {
    const form = await Form.findOne({ _id: formId, ownerId: req.userId });
    
    if (!form) {
      return res.status(404).json({ success: false, message: 'Form not found or unauthorized' });
    }
    
    const responses = await Response.find({ 
      formId, 
      deletedInAirtable: false 
    }).sort({ createdAt: -1 });
    
    if (responses.length === 0) {
      return res.status(404).json({ success: false, message: 'No responses found' });
    }
    
    const headers = ['Submission ID', 'Created At', ...form.questions.map(q => q.label)];
    const csvRows = [headers.join(',')];
    
    for (const response of responses) {
      const row = [
        response._id,
        response.createdAt.toISOString(),
        ...form.questions.map(q => {
          const answer = response.answers.get ? response.answers.get(q.questionKey) : response.answers[q.questionKey];
          if (Array.isArray(answer)) return `"${answer.join('; ')}"`;
          if (answer === null || answer === undefined) return '';
          return `"${String(answer).replace(/"/g, '""')}"`;
        })
      ];
      csvRows.push(row.join(','));
    }
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="form-${formId}-responses.csv"`);
    res.send(csvRows.join('\n'));
    
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:formId/export/json', authenticate, async (req, res) => {
  const { formId } = req.params;
  
  try {
    const form = await Form.findOne({ _id: formId, ownerId: req.userId });
    
    if (!form) {
      return res.status(404).json({ success: false, message: 'Form not found or unauthorized' });
    }
    
    const responses = await Response.find({ 
      formId, 
      deletedInAirtable: false 
    }).sort({ createdAt: -1 });
    
    const exportData = {
      form: {
        id: form._id,
        title: form.title,
        description: form.description
      },
      responses: responses.map(r => ({
        id: r._id,
        submittedAt: r.createdAt,
        answers: r.answers.get ? Object.fromEntries(r.answers) : r.answers
      })),
      exportedAt: new Date().toISOString()
    };
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="form-${formId}-responses.json"`);
    res.json(exportData);
    
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
