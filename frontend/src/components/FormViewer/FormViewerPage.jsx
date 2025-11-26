import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { shouldShowQuestion } from '../../services/conditionalLogic';

const FormViewerPage = () => {
  const { formId } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [answers, setAnswers] = useState({});
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadForm();
  }, [formId]);

  const loadForm = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/forms/${formId}`);
      setForm(response.data.form);
    } catch (err) {
      setError('Form not found or inactive');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const validateField = (question, value) => {
    if (!shouldShowQuestion(question.conditionalRules, answers)) {
      return null;
    }

    if (question.required) {
      if (!value || value === '' || (Array.isArray(value) && value.length === 0)) {
        return `${question.label} is required`;
      }
    }

    if (question.type === 'singleLineText' && value) {
      if (question.label.toLowerCase().includes('email')) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          return 'Please enter a valid email address';
        }
      }
      if (value.length > 500) {
        return 'Maximum 500 characters allowed';
      }
    }

    if (question.type === 'multilineText' && value) {
      if (value.length > 5000) {
        return 'Maximum 5000 characters allowed';
      }
    }

    if (question.type === 'singleSelect' && value) {
      if (!question.options.includes(value)) {
        return 'Please select a valid option';
      }
    }

    if (question.type === 'multipleSelects' && value) {
      const valueArray = Array.isArray(value) ? value : [value];
      for (const val of valueArray) {
        if (!question.options.includes(val)) {
          return 'Please select valid options only';
        }
      }
    }

    return null;
  };

  const handleAnswerChange = (questionKey, value, question) => {
    const newAnswers = { ...answers, [questionKey]: value };
    setAnswers(newAnswers);

    const error = validateField(question, value);
    setErrors({ ...errors, [questionKey]: error });
  };

  const handleBlur = (questionKey) => {
    setTouched({ ...touched, [questionKey]: true });
  };

  const handleFileChange = async (questionKey, files) => {
    setAnswers({ ...answers, [questionKey]: Array.from(files).map(f => f.name) });
    setTouched({ ...touched, [questionKey]: true });
  };

  const validateForm = () => {
    const visibleQuestions = form.questions.filter(q => 
      shouldShowQuestion(q.conditionalRules, answers)
    );

    const newErrors = {};
    let isValid = true;

    for (const question of visibleQuestions) {
      const error = validateField(question, answers[question.questionKey]);
      if (error) {
        newErrors[question.questionKey] = error;
        isValid = false;
      }
    }

    setErrors(newErrors);
    
    const newTouched = {};
    visibleQuestions.forEach(q => {
      newTouched[q.questionKey] = true;
    });
    setTouched(newTouched);

    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      const firstErrorElement = document.querySelector('.error-message');
      if (firstErrorElement) {
        firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    try {
      setSubmitting(true);
      await api.post(`/forms/${formId}/submit`, { answers });
      navigate(`/form/${formId}/success`);
    } catch (err) {
      if (err.response?.data?.message) {
        alert(err.response.data.message);
      } else {
        alert('Failed to submit form. Please try again.');
      }
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
          <div>Loading form...</div>
        </div>
      </div>
    );
  }

  if (error || !form) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        padding: '20px'
      }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>⚠️</div>
        <h2>{error || 'Form not found'}</h2>
        <p style={{ color: '#666' }}>This form may have been deleted or is no longer active.</p>
      </div>
    );
  }

  const visibleQuestions = form.questions.filter(q => 
    shouldShowQuestion(q.conditionalRules, answers)
  );

  const progress = visibleQuestions.length > 0 
    ? (Object.keys(answers).filter(key => 
        visibleQuestions.find(q => q.questionKey === key) && answers[key]
      ).length / visibleQuestions.length) * 100 
    : 0;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', padding: '32px' }}>
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        <div style={{
          backgroundColor: 'white',
          padding: '40px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            height: '4px',
            backgroundColor: '#e0e0e0',
            borderRadius: '2px',
            marginBottom: '24px',
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              width: `${progress}%`,
              backgroundColor: '#4CAF50',
              transition: 'width 0.3s ease'
            }} />
          </div>

          <h1 style={{ marginTop: 0 }}>{form.title}</h1>
          {form.description && (
            <p style={{ color: '#666', marginBottom: '32px' }}>{form.description}</p>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {visibleQuestions.map((question, index) => {
              const hasError = touched[question.questionKey] && errors[question.questionKey];
              
              return (
                <div key={question.questionKey} style={{ marginBottom: '24px' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: 'bold',
                    color: hasError ? '#f44336' : '#333'
                  }}>
                    {question.label}
                    {question.required && <span style={{ color: '#f44336' }}> *</span>}
                  </label>

                  {question.type === 'singleLineText' && (
                    <input
                      type="text"
                      value={answers[question.questionKey] || ''}
                      onChange={(e) => handleAnswerChange(question.questionKey, e.target.value, question)}
                      onBlur={() => handleBlur(question.questionKey)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: hasError ? '2px solid #f44336' : '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px',
                        outline: 'none',
                        transition: 'border-color 0.2s'
                      }}
                      onFocus={(e) => {
                        if (!hasError) {
                          e.target.style.borderColor = '#18BFFF';
                        }
                      }}
                      onBlurCapture={(e) => {
                        if (!hasError) {
                          e.target.style.borderColor = '#ddd';
                        }
                      }}
                    />
                  )}

                  {question.type === 'multilineText' && (
                    <textarea
                      value={answers[question.questionKey] || ''}
                      onChange={(e) => handleAnswerChange(question.questionKey, e.target.value, question)}
                      onBlur={() => handleBlur(question.questionKey)}
                      rows={4}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: hasError ? '2px solid #f44336' : '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px',
                        resize: 'vertical',
                        outline: 'none',
                        transition: 'border-color 0.2s'
                      }}
                      onFocus={(e) => {
                        if (!hasError) {
                          e.target.style.borderColor = '#18BFFF';
                        }
                      }}
                      onBlurCapture={(e) => {
                        if (!hasError) {
                          e.target.style.borderColor = '#ddd';
                        }
                      }}
                    />
                  )}

                  {question.type === 'singleSelect' && (
                    <select
                      value={answers[question.questionKey] || ''}
                      onChange={(e) => handleAnswerChange(question.questionKey, e.target.value, question)}
                      onBlur={() => handleBlur(question.questionKey)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: hasError ? '2px solid #f44336' : '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px',
                        outline: 'none',
                        backgroundColor: 'white'
                      }}
                    >
                      <option value="">Select an option...</option>
                      {question.options.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  )}

                  {question.type === 'multipleSelects' && (
                    <div style={{
                      border: hasError ? '2px solid #f44336' : '1px solid #ddd',
                      borderRadius: '4px',
                      padding: '12px'
                    }}>
                      {question.options.map(option => (
                        <label
                          key={option}
                          style={{
                            display: 'block',
                            marginBottom: '8px',
                            cursor: 'pointer',
                            padding: '8px',
                            borderRadius: '4px',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <input
                            type="checkbox"
                            checked={(answers[question.questionKey] || []).includes(option)}
                            onChange={(e) => {
                              const current = answers[question.questionKey] || [];
                              const updated = e.target.checked
                                ? [...current, option]
                                : current.filter(v => v !== option);
                              handleAnswerChange(question.questionKey, updated, question);
                              setTouched({ ...touched, [question.questionKey]: true });
                            }}
                            style={{ marginRight: '8px' }}
                          />
                          {option}
                        </label>
                      ))}
                    </div>
                  )}

                  {question.type === 'attachment' && (
                    <input
                      type="file"
                      multiple
                      onChange={(e) => handleFileChange(question.questionKey, e.target.files)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: hasError ? '2px solid #f44336' : '1px solid #ddd',
                        borderRadius: '4px'
                      }}
                    />
                  )}

                  {hasError && (
                    <div className="error-message" style={{
                      color: '#f44336',
                      fontSize: '13px',
                      marginTop: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <span>⚠️</span>
                      <span>{errors[question.questionKey]}</span>
                    </div>
                  )}

                  {!hasError && touched[question.questionKey] && answers[question.questionKey] && (
                    <div style={{
                      color: '#4CAF50',
                      fontSize: '13px',
                      marginTop: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <span>✓</span>
                      <span>Looks good!</span>
                    </div>
                  )}
                </div>
              );
            })}

            <button
              type="submit"
              disabled={submitting}
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: submitting ? '#ccc' : '#18BFFF',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: submitting ? 'not-allowed' : 'pointer',
                marginTop: '16px',
                transition: 'background-color 0.2s',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                if (!submitting) {
                  e.target.style.backgroundColor = '#1599d4';
                }
              }}
              onMouseLeave={(e) => {
                if (!submitting) {
                  e.target.style.backgroundColor = '#18BFFF';
                }
              }}
            >
              {submitting ? (
                <span>
                  <span style={{
                    display: 'inline-block',
                    width: '16px',
                    height: '16px',
                    border: '2px solid white',
                    borderTop: '2px solid transparent',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                    marginRight: '8px',
                    verticalAlign: 'middle'
                  }} />
                  Submitting...
                </span>
              ) : 'Submit'}
            </button>

            {Object.keys(errors).length > 0 && Object.keys(touched).length > 0 && (
              <div style={{
                marginTop: '16px',
                padding: '12px',
                backgroundColor: '#fff3e0',
                border: '1px solid #ff9800',
                borderRadius: '4px',
                color: '#e65100',
                fontSize: '14px'
              }}>
                ⚠️ Please fix the errors above before submitting
              </div>
            )}
          </form>
        </div>

        <div style={{
          textAlign: 'center',
          marginTop: '24px',
          color: '#999',
          fontSize: '12px'
        }}>
          Powered by Airtable Form Builder
        </div>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default FormViewerPage;
