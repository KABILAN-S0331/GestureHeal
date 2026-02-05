import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import PatientDashboard from './pages/patient/Dashboard';
import DoctorDashboard from './pages/doctor/Dashboard';
import './index.css';

// Loading component
const LoadingScreen = () => (
  <div className="loading-screen">
    <div className="loading-content">
      <span className="logo-icon large">🤟</span>
      <h1>GestureHeal</h1>
      <div className="loading-spinner"></div>
      <p>Loading...</p>
    </div>
  </div>
);

// Main App content with auth routing
const AppContent = () => {
  const { isAuthenticated, profile, loading, user } = useAuth();
  const [authMode, setAuthMode] = useState('login'); // login or register

  // Show loading while checking auth
  if (loading) {
    return <LoadingScreen />;
  }

  // Not authenticated - show login/register
  if (!isAuthenticated) {
    if (authMode === 'register') {
      return <Register onSwitchToLogin={() => setAuthMode('login')} />;
    }
    return <Login onSwitchToRegister={() => setAuthMode('register')} />;
  }

  // Debug: log profile info
  console.log('User authenticated:', user?.id);
  console.log('Profile loaded:', profile);
  console.log('Profile role:', profile?.role);

  // Wait for profile to load if user is authenticated but profile not yet loaded
  if (!profile) {
    console.log('Waiting for profile to load...');
    return <LoadingScreen />;
  }

  // Authenticated - route based on role
  console.log('Routing to:', profile.role === 'doctor' ? 'Doctor Dashboard' : 'Patient Dashboard');

  if (profile.role === 'doctor') {
    return <DoctorDashboard />;
  }

  return <PatientDashboard />;
};

// Root App with providers
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
