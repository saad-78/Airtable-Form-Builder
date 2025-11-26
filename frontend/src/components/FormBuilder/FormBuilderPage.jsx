import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { authService } from '../../services/auth';
import api from '../../services/api';

const FormBuilderPage = () => {
  const navigate = useNavigate();
  const { formId } = useParams();
  const isEditMode = !!formId;

  const [step, setStep] = useState(1);
  const [bases, setBases] = useState([]);
  const [tables, setTables] = useState([]);
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    airtableBaseId: '',
    airtableTableId: '',
    airtableTableName: '',
    questions: []
  });

  const [selectedFields, setSelectedFields] = useState([]);

  useEffect(() => {
    loadBases();
    if (isEditMode) {
      loadForm();
    }
  }, []);

  const loadBases = async () => {
    try {
      setLoading(true);
      const basesData = await authService.getBases();
      setBases(basesData);
    } catch (error) {
      alert('Failed to load bases');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadForm = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/forms/${formId}`);
      const form = response.data.form;
      setFormData(form);
      setStep(4);
    } catch (error) {
      alert('Failed to load form');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleBaseSelect = async (baseId) => {
    setFormData({ ...formData, airtableBaseId: baseId });
    
    try {
      setLoading(true);
      const tablesData = await authService.getTables(baseId);
      setTables(tablesData);
      setStep(2);
    } catch (error) {
      alert('Failed to load tables');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleTableSelect = async (table) => {
    setFormData({
      ...formData,
      airtableTableId: table.id,
      airtableTableName: table.name
    });

    try {
      setLoading(true);
      const tableSchema = await authService.getTableSchema(formData.airtableBaseId, table.id);
      setFields(tableSchema.fields);
      setStep(3);
    } catch (error) {
      alert('Failed to load fields');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFieldToggle = (field) => {
    const exists = selectedFields.find(f => f.airtableFieldId === field.id);
    if (exists) {
      setSelectedFields(selectedFields.filter(f => f.airtableFieldId !== field.id));
    } else {
      const newField = {
        questionKey: field.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
        airtableFieldId: field.id,
        airtableFieldName: field.name,
        label: field.name,
        type: field.type,
        required: false,
        options: field.options?.choices ? field.options.choices.map(c => c.name) : [],
        order: selectedFields.length,
        conditionalRules: null
      };
      setSelectedFields([...selectedFields, newField]);
    }
  };

  const proceedToBuilder = () => {
    setFormData({ ...formData, questions: selectedFields });
    setStep(4);
  };

  const validateFormData = () => {
    if (!formData.title || formData.title.trim() === '') {
      alert('Form title is required');
      return false;
    }

    if (formData.questions.length === 0) {
      alert('Please add at least one question');
      return false;
    }

    for (let i = 0; i < formData.questions.length; i++) {
      const q = formData.questions[i];
      
      if (!q.label || q.label.trim() === '') {
        alert(`Question ${i + 1}: Label is required`);
        return false;
      }

      if (q.conditionalRules && q.conditionalRules.conditions.length > 0) {
        for (let j = 0; j < q.conditionalRules.conditions.length; j++) {
          const cond = q.conditionalRules.conditions[j];
          
          if (!cond.questionKey) {
            alert(`Question ${i + 1}, Condition ${j + 1}: Please select a field`);
            return false;
          }
          
          if (!cond.value || cond.value.trim() === '') {
            alert(`Question ${i + 1}, Condition ${j + 1}: Please enter a value`);
            return false;
          }
        }
      }
    }

    return true;
  };

  const handleSaveForm = async () => {
    if (!validateFormData()) {
      return;
    }

    try {
      setLoading(true);
      if (isEditMode) {
        await api.put(`/forms/${formId}`, formData);
        alert('Form updated successfully!');
      } else {
        const response = await api.post('/forms', formData);
        alert('Form created successfully!');
        navigate(`/forms/${response.data.form._id}/responses`);
      }
    } catch (error) {
      if (error.response?.data?.message) {
        alert(`Error: ${error.response.data.message}`);
      } else {
        alert('Failed to save form');
      }
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', padding: '32px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px'
        }}>
          <h1>{isEditMode ? 'Edit Form' : 'Create New Form'}</h1>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              padding: '8px 16px',
              backgroundColor: '#fff',
              border: '1px solid #ddd',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            ← Back to Dashboard
          </button>
        </div>

        <div style={{
          backgroundColor: 'white',
          padding: '32px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          {step === 1 && (
            <div>
              <h2>Step 1: Select Airtable Base</h2>
              <p style={{ color: '#666', marginBottom: '24px' }}>
                Choose the base where your form data will be stored
              </p>
              <div style={{ display: 'grid', gap: '12px' }}>
                {bases.map(base => (
                  <div
                    key={base.id}
                    onClick={() => handleBaseSelect(base.id)}
                    style={{
                      padding: '16px',
                      border: '2px solid #ddd',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      transition: 'border-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = '#18BFFF'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = '#ddd'}
                  >
                    <strong>{base.name}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2>Step 2: Select Table</h2>
              <p style={{ color: '#666', marginBottom: '24px' }}>
                Choose the table for form submissions
              </p>
              <button
                onClick={() => setStep(1)}
                style={{
                  marginBottom: '16px',
                  padding: '8px 16px',
                  backgroundColor: '#fff',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                ← Change Base
              </button>
              <div style={{ display: 'grid', gap: '12px' }}>
                {tables.map(table => (
                  <div
                    key={table.id}
                    onClick={() => handleTableSelect(table)}
                    style={{
                      padding: '16px',
                      border: '2px solid #ddd',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = '#18BFFF'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = '#ddd'}
                  >
                    <strong>{table.name}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2>Step 3: Select Fields</h2>
              <p style={{ color: '#666', marginBottom: '24px' }}>
                Choose which fields to include in your form
              </p>
              <button
                onClick={() => setStep(2)}
                style={{
                  marginBottom: '16px',
                  padding: '8px 16px',
                  backgroundColor: '#fff',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                ← Change Table
              </button>
              <div style={{ marginBottom: '24px' }}>
                {fields.map(field => {
                  const isSelected = selectedFields.find(f => f.airtableFieldId === field.id);
                  
                  return (
                    <label
                      key={field.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '12px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        marginBottom: '8px',
                        cursor: 'pointer',
                        backgroundColor: isSelected ? '#e3f2fd' : 'white',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = '#f5f5f5';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = 'white';
                        }
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={!!isSelected}
                        onChange={() => handleFieldToggle(field)}
                        style={{ 
                          marginRight: '12px',
                          width: '18px',
                          height: '18px',
                          cursor: 'pointer'
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <strong>{field.name}</strong>
                        <span style={{ marginLeft: '12px', color: '#666', fontSize: '14px' }}>
                          ({field.type})
                        </span>
                      </div>
                      {isSelected && (
                        <span style={{ 
                          color: '#4CAF50', 
                          fontSize: '20px',
                          marginLeft: '8px'
                        }}>
                          ✓
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
              
              {selectedFields.length > 0 && (
                <div style={{
                  padding: '12px',
                  backgroundColor: '#e8f5e9',
                  borderRadius: '4px',
                  marginBottom: '16px',
                  color: '#2e7d32'
                }}>
                  ✓ {selectedFields.length} field{selectedFields.length !== 1 ? 's' : ''} selected
                </div>
              )}
              
              <button
                onClick={proceedToBuilder}
                disabled={selectedFields.length === 0}
                style={{
                  padding: '12px 24px',
                  backgroundColor: selectedFields.length > 0 ? '#18BFFF' : '#ccc',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: selectedFields.length > 0 ? 'pointer' : 'not-allowed',
                  fontSize: '16px',
                  width: '100%',
                  fontWeight: 'bold',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (selectedFields.length > 0) {
                    e.target.style.backgroundColor = '#1599d4';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedFields.length > 0) {
                    e.target.style.backgroundColor = '#18BFFF';
                  }
                }}
              >
                Continue to Form Builder → ({selectedFields.length} fields)
              </button>
            </div>
          )}

          {step === 4 && (
            <FormBuilderEditor
              formData={formData}
              setFormData={setFormData}
              onSave={handleSaveForm}
              onBack={() => setStep(3)}
              loading={loading}
            />
          )}
        </div>
      </div>
    </div>
  );
};

const FormBuilderEditor = ({ formData, setFormData, onSave, onBack, loading }) => {
  const handleQuestionUpdate = (index, updates) => {
    const updated = [...formData.questions];
    updated[index] = { ...updated[index], ...updates };
    setFormData({ ...formData, questions: updated });
  };

  const handleAddCondition = (questionIndex) => {
    const updated = [...formData.questions];
    if (!updated[questionIndex].conditionalRules) {
      updated[questionIndex].conditionalRules = {
        logic: 'AND',
        conditions: []
      };
    }
    updated[questionIndex].conditionalRules.conditions.push({
      questionKey: '',
      operator: 'equals',
      value: ''
    });
    setFormData({ ...formData, questions: updated });
  };

  const handleConditionUpdate = (questionIndex, conditionIndex, updates) => {
    const updated = [...formData.questions];
    updated[questionIndex].conditionalRules.conditions[conditionIndex] = {
      ...updated[questionIndex].conditionalRules.conditions[conditionIndex],
      ...updates
    };
    setFormData({ ...formData, questions: updated });
  };

  const handleRemoveCondition = (questionIndex, conditionIndex) => {
    const updated = [...formData.questions];
    updated[questionIndex].conditionalRules.conditions.splice(conditionIndex, 1);
    if (updated[questionIndex].conditionalRules.conditions.length === 0) {
      updated[questionIndex].conditionalRules = null;
    }
    setFormData({ ...formData, questions: updated });
  };

  return (
    <div>
      <h2>Step 4: Configure Form</h2>
      
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
          Form Title *
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Enter form title"
          style={{
            width: '100%',
            padding: '12px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '16px'
          }}
        />
      </div>

      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Optional description"
          rows={3}
          style={{
            width: '100%',
            padding: '12px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px',
            resize: 'vertical'
          }}
        />
      </div>

      <h3>Questions</h3>
      {formData.questions.map((question, qIndex) => (
        <div
          key={qIndex}
          style={{
            border: '1px solid #ddd',
            borderRadius: '4px',
            padding: '16px',
            marginBottom: '16px',
            backgroundColor: '#fafafa'
          }}
        >
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', fontSize: '14px' }}>
              Question Label
            </label>
            <input
              type="text"
              value={question.label}
              onChange={(e) => handleQuestionUpdate(qIndex, { label: e.target.value })}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>
                Field Type
              </label>
              <input
                type="text"
                value={question.type}
                disabled
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: '#eee'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', marginTop: '24px' }}>
                <input
                  type="checkbox"
                  checked={question.required}
                  onChange={(e) => handleQuestionUpdate(qIndex, { required: e.target.checked })}
                  style={{ marginRight: '8px' }}
                />
                Required
              </label>
            </div>
          </div>

          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #ddd' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <strong style={{ fontSize: '14px' }}>Conditional Logic</strong>
              <button
                onClick={() => handleAddCondition(qIndex)}
                style={{
                  padding: '4px 12px',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                + Add Condition
              </button>
            </div>

            {question.conditionalRules && (
              <div>
                <div style={{ marginBottom: '8px' }}>
                  <label style={{ fontSize: '12px', marginRight: '8px' }}>Show if</label>
                  <select
                    value={question.conditionalRules.logic}
                    onChange={(e) => {
                      const updated = [...formData.questions];
                      updated[qIndex].conditionalRules.logic = e.target.value;
                      setFormData({ ...formData, questions: updated });
                    }}
                    style={{
                      padding: '4px 8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}
                  >
                    <option value="AND">ALL</option>
                    <option value="OR">ANY</option>
                  </select>
                  <label style={{ fontSize: '12px', marginLeft: '8px' }}>conditions match:</label>
                </div>

                {question.conditionalRules.conditions.map((condition, cIndex) => (
                  <div key={cIndex} style={{
                    display: 'flex',
                    gap: '8px',
                    marginBottom: '8px',
                    alignItems: 'center'
                  }}>
                    <select
                      value={condition.questionKey}
                      onChange={(e) => handleConditionUpdate(qIndex, cIndex, { questionKey: e.target.value })}
                      style={{
                        flex: 1,
                        padding: '6px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}
                    >
                      <option value="">Select field...</option>
                      {formData.questions
                        .filter((_, idx) => idx < qIndex)
                        .map(q => (
                          <option key={q.questionKey} value={q.questionKey}>
                            {q.label}
                          </option>
                        ))}
                    </select>

                    <select
                      value={condition.operator}
                      onChange={(e) => handleConditionUpdate(qIndex, cIndex, { operator: e.target.value })}
                      style={{
                        padding: '6px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}
                    >
                      <option value="equals">equals</option>
                      <option value="notEquals">not equals</option>
                      <option value="contains">contains</option>
                    </select>

                    <input
                      type="text"
                      value={condition.value}
                      onChange={(e) => handleConditionUpdate(qIndex, cIndex, { value: e.target.value })}
                      placeholder="Value"
                      style={{
                        flex: 1,
                        padding: '6px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}
                    />

                    <button
                      onClick={() => handleRemoveCondition(qIndex, cIndex)}
                      style={{
                        padding: '6px 10px',
                        backgroundColor: '#f44336',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}

      <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
        <button
          onClick={onBack}
          style={{
            flex: 1,
            padding: '12px',
            backgroundColor: '#fff',
            border: '1px solid #ddd',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          ← Back
        </button>
        <button
          onClick={onSave}
          disabled={loading}
          style={{
            flex: 2,
            padding: '12px',
            backgroundColor: loading ? '#ccc' : '#18BFFF',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '16px'
          }}
        >
          {loading ? 'Saving...' : 'Save Form'}
        </button>
      </div>
    </div>
  );
};

export default FormBuilderPage;
