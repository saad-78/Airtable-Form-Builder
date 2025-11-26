const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Response = require('../models/Response');
const Form = require('../models/Form');

router.post('/airtable', async (req, res) => {
  const signature = req.headers['x-airtable-content-mac'];
  
  const hmac = crypto.createHmac('sha256', process.env.AIRTABLE_WEBHOOK_SECRET || 'default_secret');
  hmac.update(JSON.stringify(req.body));
  const expectedSignature = hmac.digest('base64');
  
  if (signature !== expectedSignature) {
    console.warn('Invalid webhook signature');
  }
  
  const { base, webhook, timestamp } = req.body;
  
  if (!base || !webhook) {
    return res.status(400).json({ error: 'Invalid webhook payload' });
  }
  
  try {
    const form = await Form.findOne({
      airtableBaseId: base.id,
      airtableWebhookId: webhook.id
    });
    
    if (!form) {
      console.log('No matching form found for webhook');
      return res.status(200).json({ message: 'Webhook received but no matching form' });
    }
    
    if (webhook.specification?.filters?.dataTypes?.includes('tableData')) {
      for (const payload of (req.body.payloads || [])) {
        if (payload.actionMetadata) {
          const { source, sourceMetadata } = payload.actionMetadata;
          
          if (source === 'publicApi' && sourceMetadata?.recordId) {
            const recordId = sourceMetadata.recordId;
            
            const response = await Response.findOne({
              formId: form._id,
              airtableRecordId: recordId
            });
            
            if (response) {
              if (payload.changedTablesById && payload.changedTablesById[form.airtableTableId]) {
                const tableChanges = payload.changedTablesById[form.airtableTableId];
                
                if (tableChanges.changedRecordsById && tableChanges.changedRecordsById[recordId]) {
                  const recordChanges = tableChanges.changedRecordsById[recordId];
                  
                  if (recordChanges.current && recordChanges.current.cellValuesByFieldId) {
                    const updatedAnswers = new Map(response.answers);
                    
                    for (const question of form.questions) {
                      if (recordChanges.current.cellValuesByFieldId[question.airtableFieldId] !== undefined) {
                        updatedAnswers.set(
                          question.questionKey,
                          recordChanges.current.cellValuesByFieldId[question.airtableFieldId]
                        );
                      }
                    }
                    
                    response.answers = updatedAnswers;
                    response.lastSyncedAt = new Date();
                    await response.save();
                    
                    console.log(`Updated response ${response._id} from Airtable webhook`);
                  }
                }
                
                if (tableChanges.destroyedRecordIds && tableChanges.destroyedRecordIds.includes(recordId)) {
                  response.deletedInAirtable = true;
                  response.deletedAt = new Date();
                  response.lastSyncedAt = new Date();
                  await response.save();
                  
                  console.log(`Marked response ${response._id} as deleted from Airtable`);
                }
              }
            }
          }
        }
      }
    }
    
    res.status(200).json({ message: 'Webhook processed' });
    
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

module.exports = router;
