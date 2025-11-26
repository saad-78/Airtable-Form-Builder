import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleLogin = () => {
    window.location.href = authService.getLoginUrl();
  };

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
        padding: '40px',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        textAlign: 'center',
        maxWidth: '400px'
      }}>
        <h1 style={{ marginBottom: '10px' }}>Airtable Form Builder</h1>
        <p style={{ color: '#666', marginBottom: '30px' }}>
          Create dynamic forms with conditional logic
        </p>
        
        <button
          onClick={handleLogin}
          style={{
            backgroundColor: '#18BFFF',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            fontSize: '16px',
            borderRadius: '4px',
            cursor: 'pointer',
            width: '100%'
          }}
        >
          Connect with Airtable
        </button>
        
        <p style={{ fontSize: '12px', color: '#999', marginTop: '20px' }}>
          You'll be redirected to Airtable to authorize access
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
