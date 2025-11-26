import React from 'react';
import { useParams } from 'react-router-dom';

const SuccessPage = () => {
  const { formId } = useParams();

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      backgroundColor: '#f5f5f5'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '48px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        textAlign: 'center',
        maxWidth: '500px'
      }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>✅</div>
        <h1 style={{ color: '#4CAF50', marginBottom: '16px' }}>Thank You!</h1>
        <p style={{ color: '#666', fontSize: '16px' }}>
          Your response has been submitted successfully.
        </p>
        <button
          onClick={() => window.location.href = `/form/${formId}`}
          style={{
            marginTop: '24px',
            padding: '12px 24px',
            backgroundColor: '#18BFFF',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Submit Another Response
        </button>
      </div>
    </div>
  );
};

export default SuccessPage;
