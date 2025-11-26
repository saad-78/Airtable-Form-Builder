import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';

const ResponsesPage = () => {
  const { formId } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [includeDeleted, setIncludeDeleted] = useState(false);

  useEffect(() => {
    loadData();
  }, [formId, includeDeleted]);

const loadData = async () => {
  try {
    setLoading(true);
    const formRes = await api.get(`/forms/${formId}`);
    setForm(formRes.data.form);
    
    const responsesRes = await api.get(`/forms/${formId}/responses?includeDeleted=${includeDeleted}`);
    setResponses(responsesRes.data.responses || []);
    
    console.log('Loaded responses:', responsesRes.data.responses);
  } catch (error) {
    console.error('Failed to load data:', error);
    setResponses([]);
  } finally {
    setLoading(false);
  }
};



  const handleExport = async (format) => {
    try {
      const response = await api.get(`/forms/${formId}/export/${format}`, {
        responseType: format === 'csv' ? 'blob' : 'json'
      });

      if (format === 'csv') {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `responses-${formId}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      } else {
        const dataStr = JSON.stringify(response.data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = window.URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `responses-${formId}.json`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
    } catch (error) {
      alert('Failed to export responses');
      console.error(error);
    }
  };

  const copyFormLink = () => {
    const url = `${window.location.origin}/form/${formId}`;
    navigator.clipboard.writeText(url);
    alert('Form link copied to clipboard!');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        Loading...
      </div>
    );
  }

  if (!form) {
    return <div>Form not found</div>;
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <nav style={{
        backgroundColor: 'white',
        padding: '16px 32px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        marginBottom: '32px'
      }}>
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
      </nav>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 32px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '24px'
        }}>
          <div>
            <h1 style={{ margin: 0, marginBottom: '8px' }}>{form.title}</h1>
            <p style={{ color: '#666', margin: 0 }}>
              {responses.length} total responses
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={copyFormLink}
              style={{
                padding: '10px 16px',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              📋 Copy Form Link
            </button>
            <button
              onClick={() => handleExport('csv')}
              style={{
                padding: '10px 16px',
                backgroundColor: '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              ⬇ Export CSV
            </button>
            <button
              onClick={() => handleExport('json')}
              style={{
                padding: '10px 16px',
                backgroundColor: '#FF9800',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              ⬇ Export JSON
            </button>
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={includeDeleted}
              onChange={(e) => setIncludeDeleted(e.target.checked)}
              style={{ marginRight: '8px' }}
            />
            Show deleted responses from Airtable
          </label>
        </div>

        {responses.length === 0 ? (
          <div style={{
            backgroundColor: 'white',
            padding: '48px',
            borderRadius: '8px',
            textAlign: 'center',
            color: '#666'
          }}>
            <p style={{ fontSize: '18px' }}>No responses yet</p>
            <button
              onClick={copyFormLink}
              style={{
                marginTop: '16px',
                padding: '12px 24px',
                backgroundColor: '#18BFFF',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Share Form Link
            </button>
          </div>
        ) : (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f5f5' }}>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>
                    Submitted
                  </th>
                  {form.questions.map(q => (
                    <th key={q.questionKey} style={{
                      padding: '12px',
                      textAlign: 'left',
                      borderBottom: '2px solid #ddd'
                    }}>
                      {q.label}
                    </th>
                  ))}
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {responses.map((response, idx) => (
                  <tr
                    key={response._id}
                    style={{
                      backgroundColor: response.deletedInAirtable ? '#ffebee' : (idx % 2 === 0 ? 'white' : '#fafafa')
                    }}
                  >
                    <td style={{ padding: '12px', borderBottom: '1px solid #eee' }}>
                      {new Date(response.createdAt).toLocaleString()}
                    </td>
                    {form.questions.map(q => {
                      const answer = response.answers[q.questionKey];
                      let displayValue = answer;
                      
                      if (Array.isArray(answer)) {
                        displayValue = answer.join(', ');
                      } else if (answer === null || answer === undefined) {
                        displayValue = '-';
                      }

                      return (
                        <td key={q.questionKey} style={{
                          padding: '12px',
                          borderBottom: '1px solid #eee',
                          maxWidth: '200px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {displayValue}
                        </td>
                      );
                    })}
                    <td style={{ padding: '12px', borderBottom: '1px solid #eee' }}>
                      {response.deletedInAirtable ? (
                        <span style={{ color: 'red', fontSize: '12px' }}>❌ Deleted</span>
                      ) : (
                        <span style={{ color: 'green', fontSize: '12px' }}>✅ Active</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResponsesPage;
