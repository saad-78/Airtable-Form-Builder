import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import AuthCallback from './pages/AuthCallback';
import DashboardPage from './components/Dashboard/DashboardPage';
import FormBuilderPage from './components/FormBuilder/FormBuilderPage';
import FormViewerPage from './components/FormViewer/FormViewerPage';
import SuccessPage from './components/FormViewer/SuccessPage';
import ResponsesPage from './components/Responses/ResponsesPage';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          } />

          <Route path="/forms/new" element={
            <ProtectedRoute>
              <FormBuilderPage />
            </ProtectedRoute>
          } />

          <Route path="/forms/:formId/edit" element={
            <ProtectedRoute>
              <FormBuilderPage />
            </ProtectedRoute>
          } />

          <Route path="/forms/:formId/responses" element={
            <ProtectedRoute>
              <ResponsesPage />
            </ProtectedRoute>
          } />

          <Route path="/form/:formId" element={<FormViewerPage />} />
          <Route path="/form/:formId/success" element={<SuccessPage />} />
          
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<div>404 Not Found</div>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
