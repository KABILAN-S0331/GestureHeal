import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChestPainIcon, BreathingIcon, HeadacheIcon, NauseaIcon, FeverIcon, SeverePainIcon, BleedingIcon, DizzinessIcon, HeartEmergencyIcon, EmergencyAlertIcon, CameraIcon, CloseIcon, BellIcon, UserIcon, LockIcon, CalendarIcon } from './icons';
import { normalizeLandmarks } from './utils/landmarkNormalizer';
import { loadModel, predict, isModelLoaded, GESTURE_LABELS } from './utils/gestureClassifier';
import { getPatientLocation, findNearbyDoctors, formatLocation, getMapLink, MOCK_DOCTORS } from './utils/locationUtils';

// ==================== CROSS-TAB SYNC VIA LOCALSTORAGE ====================
// This allows patient and doctor tabs to communicate in real-time

const CALL_STATE_KEY = 'gestureheal_call_state';

// Initialize or get call state from localStorage
const getCallState = () => {
  try {
    const stored = localStorage.getItem(CALL_STATE_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) { }
  return {
    active: false,
    patientLocation: null,
    patientGesture: null,
    gestureConfidence: 0,
    emergencyType: null,
    doctorResponse: null
  };
};

// Local listeners for this tab
let localListeners = [];

const subscribeToCall = (listener) => {
  localListeners.push(listener);
  // Immediately call with current state
  listener(getCallState());
  return () => { localListeners = localListeners.filter(l => l !== listener); };
};

// Update call state and sync to localStorage (broadcasts to all tabs)
const updateCallState = (updates) => {
  const currentState = getCallState();
  const newState = { ...currentState, ...updates };
  localStorage.setItem(CALL_STATE_KEY, JSON.stringify(newState));
  // Notify local listeners
  localListeners.forEach(l => l(newState));
  // Trigger storage event for other tabs (same-tab doesn't get storage event)
  window.dispatchEvent(new StorageEvent('storage', {
    key: CALL_STATE_KEY,
    newValue: JSON.stringify(newState)
  }));
};

// Global listener for storage events from other tabs
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === CALL_STATE_KEY && e.newValue) {
      try {
        const newState = JSON.parse(e.newValue);
        localListeners.forEach(l => l(newState));
      } catch (err) { }
    }
  });
}

// Get current state (for reading without subscribing)
const getCurrentCallState = () => getCallState();

// ==================== END CROSS-TAB SYNC ====================

// Login Component
const Login = ({ onLogin }) => {
  const [role, setRole] = useState('patient');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // Simulate login
    onLogin(role);
  };

  return (
    <div className="container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '2rem' }}>
        <h2 className="text-center" style={{ marginBottom: '2rem' }}>Welcome to GestureHeal</h2>

        <div style={{ display: 'flex', marginBottom: '2rem', background: '#eee', borderRadius: '8px', padding: '4px' }}>
          <button
            style={{ flex: 1, padding: '0.8rem', borderRadius: '6px', background: role === 'patient' ? 'white' : 'transparent', fontWeight: role === 'patient' ? 'bold' : 'normal', color: role === 'patient' ? 'var(--primary)' : '#666', boxShadow: role === 'patient' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none' }}
            onClick={() => setRole('patient')}
          >
            Patient
          </button>
          <button
            style={{ flex: 1, padding: '0.8rem', borderRadius: '6px', background: role === 'doctor' ? 'white' : 'transparent', fontWeight: role === 'doctor' ? 'bold' : 'normal', color: role === 'doctor' ? 'var(--primary)' : '#666', boxShadow: role === 'doctor' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none' }}
            onClick={() => setRole('doctor')}
          >
            Doctor
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
            <UserIcon style={{ position: 'absolute', top: '12px', left: '12px', width: '20px', color: '#888' }} />
            <input
              type="text"
              placeholder="Email / ID"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', padding: '1rem 1rem 1rem 3rem', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem' }}
              required
            />
          </div>
          <div style={{ marginBottom: '2rem', position: 'relative' }}>
            <LockIcon style={{ position: 'absolute', top: '12px', left: '12px', width: '20px', color: '#888' }} />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', padding: '1rem 1rem 1rem 3rem', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem' }}
              required
            />
          </div>
          <button className="btn-primary btn-lg" type="submit" style={{ width: '100%', borderRadius: '8px' }}>
            Login
          </button>
        </form>
      </div>
    </div>
  );
};

const NotificationPanel = ({ onClose }) => (
  <div className="card" style={{ position: 'fixed', top: '90px', right: '32px', width: '300px', backgroundColor: 'var(--surface)', zIndex: 1000, padding: '0', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
    <div style={{ padding: '1rem', borderBottom: '1px solid #eee', backgroundColor: 'var(--primary)', color: 'white' }}>
      <h3 style={{ margin: 0, color: 'white' }}>Messages</h3>
    </div>
    <div style={{ maxHeight: '300px', overflowY: 'auto', minHeight: '100px', padding: '1rem' }}>
      {/* MOCK DATA REMOVED - Backend Integration Ready */}
      <p style={{ color: '#888', fontStyle: 'italic', textAlign: 'center', marginTop: '1rem' }}>Waiting for updates...</p>
    </div>
    <button onClick={onClose} style={{ width: '100%', padding: '0.8rem', background: '#f5f5f5', border: 'none', color: '#666', fontWeight: 'bold' }}>Close</button>
  </div>
);

const PatientDashboard = ({ onStart, onAlert, onLogout }) => {
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <div className="container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: '2rem', position: 'relative', padding: '2rem' }}>

      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2rem', margin: 0 }}>Hello, Patient</h1>
          <p style={{ color: '#666' }}>How are you feeling today?</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button onClick={() => setShowNotifications(!showNotifications)} style={{ background: 'white', color: 'var(--primary)', padding: '1rem', borderRadius: '50%', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', cursor: 'pointer', position: 'relative' }}>
            <BellIcon />
          </button>
          <button onClick={onLogout} style={{ padding: '0.5rem 1rem', background: '#f5f5f5', border: 'none', borderRadius: '4px', cursor: 'pointer', color: '#666', fontWeight: 'bold' }}>Logout</button>
        </div>
      </header>

      {showNotifications && <NotificationPanel onClose={() => setShowNotifications(false)} />}

      <section onClick={onStart} style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-light))', borderRadius: '16px', padding: '3rem', color: 'white', textAlign: 'center', cursor: 'pointer', boxShadow: '0 8px 16px rgba(0, 60, 143, 0.2)', transition: 'transform 0.2s' }}>
        <h2 style={{ color: 'white', fontSize: '2.5rem', marginBottom: '1rem' }}>Start Emergency Communication</h2>
        <p style={{ fontSize: '1.2rem', opacity: 0.9 }}>AI-Powered Sign Language Detection</p>
      </section>

      <h2 style={{ marginTop: '1rem' }}>Your Care Team</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        {['Dr. Sarah Smith', 'Dr. James Rao', 'Dr. Emily Chen'].map((doc, i) => (
          <div key={i} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <UserIcon color="#999" />
              </div>
              <div>
                <h4 style={{ margin: 0 }}>{doc}</h4>
                <p style={{ fontSize: '0.9rem', color: '#666' }}>{['Cardiologist', 'General Physician', 'Neurologist'][i]}</p>
              </div>
            </div>
            <button
              className="btn-primary"
              style={{ width: '100%', fontSize: '1rem', padding: '0.8rem', backgroundColor: 'var(--accent)', border: 'none', boxShadow: 'none' }}
              onClick={() => alert(`Appointment request sent to ${doc}`)}
            >
              <CalendarIcon width={20} /> Book Appointment
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

// Doctor Dashboard with Video Call
const DoctorDashboard = ({ onLogout }) => {
  const [callState, setCallState] = useState(getCallState);
  const [responseText, setResponseText] = useState('');
  const [gestureHistory, setGestureHistory] = useState([]);
  const [displayedGesture, setDisplayedGesture] = useState(null); // For auto-hide
  const [callDuration, setCallDuration] = useState(0); // Call timer in seconds
  const lastGestureRef = useRef(null);
  const hideTimeoutRef = useRef(null);
  const timerRef = useRef(null);

  // Call timer effect
  useEffect(() => {
    if (callState.active) {
      timerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callState.active]);

  // Format duration as MM:SS
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Subscribe to call state changes + poll for reliability
  useEffect(() => {
    const handleStateUpdate = (newState) => {
      setCallState({ ...newState });

      // Handle gesture display with auto-hide
      if (newState.patientGesture && newState.patientGesture !== 'NONE') {
        // Clear any existing timeout
        if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);

        // Show the gesture
        setDisplayedGesture({
          gesture: newState.patientGesture,
          confidence: newState.gestureConfidence
        });

        // Add to history if new gesture
        if (newState.patientGesture !== lastGestureRef.current) {
          lastGestureRef.current = newState.patientGesture;
          setGestureHistory(prev => {
            const newHistory = [{ gesture: newState.patientGesture, confidence: newState.gestureConfidence, time: new Date() }, ...prev];
            return newHistory.slice(0, 10);
          });
        }

        // Auto-hide after 2 seconds of no updates
        hideTimeoutRef.current = setTimeout(() => {
          setDisplayedGesture(null);
        }, 2000);
      } else if (newState.patientGesture === 'NONE' || !newState.patientGesture) {
        // Hide gesture IMMEDIATELY when NONE detected
        if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
        setDisplayedGesture(null); // Instant hide, no timeout
      }
    };

    const unsubscribe = subscribeToCall(handleStateUpdate);

    // Poll localStorage every 300ms for reliable cross-tab sync
    const pollInterval = setInterval(() => {
      const current = getCallState();
      handleStateUpdate(current);
    }, 300);

    return () => {
      unsubscribe();
      clearInterval(pollInterval);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, []);

  const handleAcceptCall = () => {
    updateCallState({ active: true });
  };

  const handleEndCall = () => {
    updateCallState({ active: false, patientGesture: null, gestureConfidence: 0, doctorResponse: null });
    setGestureHistory([]);
  };

  const handleSendResponse = () => {
    if (responseText.trim()) {
      updateCallState({ doctorResponse: responseText });
      setResponseText('');
    }
  };

  // No active emergency
  if (!callState.patientLocation && !callState.active) {
    return (
      <div className="container" style={{ minHeight: '100vh', padding: '2rem' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', margin: 0 }}>👨‍⚕️ Doctor Dashboard</h1>
            <p style={{ color: '#666' }}>Waiting for emergency calls...</p>
          </div>
          <button onClick={onLogout} style={{ padding: '0.5rem 1.5rem', background: '#f5f5f5', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Logout</button>
        </header>

        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem', background: 'linear-gradient(135deg, #e8f5e9, #fff)' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔔</div>
          <h2 style={{ color: 'var(--primary)' }}>No Active Emergencies</h2>
          <p style={{ color: '#666' }}>You will be notified when a deaf patient needs assistance within 5km of your location.</p>
        </div>

        <h3 style={{ marginTop: '2rem' }}>Your Status</h3>
        <div className="card">
          <p><strong>Status:</strong> <span style={{ color: 'green' }}>🟢 Available</span></p>
          <p><strong>Specialty:</strong> General Physician</p>
          <p><strong>Coverage Radius:</strong> 5 km</p>
        </div>
      </div>
    );
  }

  // Incoming call alert (not yet accepted)
  if (callState.patientLocation && !callState.active) {
    return (
      <div className="container" style={{ minHeight: '100vh', padding: '2rem' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', margin: 0 }}>👨‍⚕️ Doctor Dashboard</h1>
          <button onClick={onLogout} style={{ padding: '0.5rem 1.5rem', background: '#f5f5f5', border: 'none', borderRadius: '4px' }}>Logout</button>
        </header>

        <div className="card" style={{ background: 'linear-gradient(135deg, #ffebee, #fff)', border: '3px solid var(--secondary)', animation: 'pulse 1s infinite' }}>
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🚨</div>
            <h2 style={{ color: 'var(--secondary)' }}>INCOMING EMERGENCY</h2>
            <p style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>A deaf patient needs your assistance!</p>

            {callState.emergencyType && (
              <div style={{ background: 'var(--secondary)', color: 'white', padding: '0.5rem 1rem', borderRadius: '20px', display: 'inline-block', marginBottom: '1rem' }}>
                {callState.emergencyType}
              </div>
            )}

            <div style={{ background: '#f5f5f5', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
              <p style={{ margin: 0 }}><strong>📍 Patient Location:</strong></p>
              <p style={{ margin: '0.5rem 0', color: '#666' }}>{formatLocation(callState.patientLocation)}</p>
              <a href={getMapLink(callState.patientLocation)} target="_blank" rel="noopener noreferrer"
                style={{ color: 'var(--primary)', textDecoration: 'underline' }}>
                Open in Google Maps →
              </a>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button onClick={handleAcceptCall} className="btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.2rem' }}>
                ✅ Accept Call
              </button>
              <button onClick={() => updateCallState({ patientLocation: null })} style={{ padding: '1rem 2rem', background: '#ccc', border: 'none', borderRadius: '8px', fontSize: '1.2rem' }}>
                ❌ Decline
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active video call
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-color)' }}>
      {/* Header */}
      <header style={{ padding: '1rem', background: 'var(--primary)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h2 style={{ margin: 0, color: 'white' }}>🎥 Video Call Active</h2>
          <span className="call-timer" style={{ background: 'rgba(38, 166, 154, 0.9)', color: 'white' }}>⏱ {formatDuration(callDuration)}</span>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <span style={{ background: 'rgba(255,255,255,0.2)', padding: '0.5rem 1rem', borderRadius: '20px' }}>
            📍 {formatLocation(callState.patientLocation)}
          </span>
          <button onClick={handleEndCall} style={{ background: 'var(--secondary)', color: 'white', padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', minHeight: '44px' }}>
            End Call
          </button>
        </div>
      </header>

      <div style={{ flex: 1, display: 'flex', gap: '1rem', padding: '1rem', overflow: 'hidden' }}>
        {/* Patient Video Feed */}
        <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card" style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ color: 'white', textAlign: 'center' }}>
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>👤</div>
              <p>Patient Video Feed</p>
              <p style={{ fontSize: '0.9rem', color: '#888' }}>(In real app: WebRTC video stream)</p>
            </div>

            {/* Gesture Overlay - Auto-hides when no gesture */}
            {displayedGesture && (
              <div style={{ position: 'absolute', bottom: '1rem', left: '1rem', right: '1rem', background: 'rgba(0,60,143,0.9)', color: 'white', padding: '1rem', borderRadius: '12px', textAlign: 'center', transition: 'opacity 0.3s' }}>
                <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.8 }}>DETECTED GESTURE</p>
                <h1 style={{ margin: '0.5rem 0', fontSize: '3rem', color: 'white' }}>{displayedGesture.gesture}</h1>
                <p style={{ margin: 0, color: 'var(--accent)' }}>Confidence: {displayedGesture.confidence}%</p>
              </div>
            )}
          </div>

          {/* Quick Response Buttons */}
          <div className="card" style={{ background: 'linear-gradient(135deg, #e8f5e9, #fff)', padding: '1rem' }}>
            <p style={{ color: '#666', fontSize: '0.8rem', marginBottom: '0.75rem', fontWeight: 'bold' }}>⚡ QUICK RESPONSES:</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
              {[
                'Help is coming',
                'Stay calm',
                'Show me where',
                'Yes, I understand',
                'One moment',
                'Ambulance on way'
              ].map((text, i) => (
                <button
                  key={i}
                  onClick={() => updateCallState({ doctorResponse: text })}
                  style={{
                    padding: '0.6rem',
                    fontSize: '0.85rem',
                    fontWeight: 'bold',
                    background: 'white',
                    border: '2px solid var(--accent)',
                    borderRadius: '8px',
                    color: 'var(--accent)',
                    cursor: 'pointer',
                    minHeight: '44px'
                  }}
                >
                  {text}
                </button>
              ))}
            </div>
          </div>

          {/* Response Input */}
          <div className="card" style={{ display: 'flex', gap: '1rem' }}>
            <input
              type="text"
              placeholder="Type your response to patient..."
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendResponse()}
              style={{ flex: 1, padding: '1rem', border: '1px solid #ddd', borderRadius: '8px', fontSize: '1rem' }}
            />
            <button onClick={handleSendResponse} className="btn-primary" style={{ padding: '1rem 2rem' }}>
              Send
            </button>
          </div>
        </div>

        {/* Side Panel - Gesture History */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card" style={{ background: 'linear-gradient(135deg, #e3f2fd, #fff)' }}>
            <h3 style={{ margin: '0 0 1rem 0' }}>📍 Patient Location</h3>
            <p style={{ margin: 0, color: '#666' }}>{formatLocation(callState.patientLocation)}</p>
            <a href={getMapLink(callState.patientLocation)} target="_blank" rel="noopener noreferrer"
              style={{ color: 'var(--primary)', fontSize: '0.9rem' }}>
              Open in Maps →
            </a>
          </div>

          <div className="card" style={{ flex: 1, overflow: 'auto' }}>
            <h3 style={{ margin: '0 0 1rem 0' }}>📋 Gesture History</h3>
            {gestureHistory.length === 0 ? (
              <p style={{ color: '#888', fontStyle: 'italic' }}>Waiting for gestures...</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {gestureHistory.map((item, i) => (
                  <div key={i} style={{ padding: '0.5rem', background: i === 0 ? '#e3f2fd' : '#f5f5f5', borderRadius: '4px', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: i === 0 ? 'bold' : 'normal' }}>{item.gesture}</span>
                    <span style={{ color: '#888', fontSize: '0.8rem' }}>{item.confidence}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {callState.doctorResponse && (
            <div className="card" style={{ background: 'linear-gradient(135deg, #e8f5e9, #fff)', border: '2px solid var(--accent)' }}>
              <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--accent)' }}>✅ Sent to Patient</h3>
              <p style={{ margin: 0 }}>{callState.doctorResponse}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const EMERGENCY_OPTIONS = [
  "HELP", "EMERGENCY", "PAIN", "SEVERE PAIN", "HEADACHE",
  "CHEST PAIN", "STOMACH PAIN", "BREATHING PROBLEM", "CAN’T BREATHE", "DIZZINESS",
  "FAINT", "FEVER", "VOMITING", "BLEEDING", "INJURY",
  "FRACTURE", "ALLERGY", "ASTHMA", "DIABETES", "HEART PROBLEM"
];

const PatientCamera = ({ onBack, onAlert, onGestureDetected }) => {
  const [detecting, setDetecting] = useState(true);
  const [detected, setDetected] = useState(null);
  const [confidence, setConfidence] = useState(0);
  const [showEmergencyGrid, setShowEmergencyGrid] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [callState, setCallState] = useState(getCallState);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const handsRef = useRef(null);
  const historyRef = useRef([]); // For smoothing predictions
  const manualLockRef = useRef(null); // Lock ML updates when user manually selects a phrase

  const SMOOTH_WINDOW = 5;
  const CONF_THRESHOLD = 0.85;

  // Subscribe to call state for doctor responses + poll for reliability
  useEffect(() => {
    const unsubscribe = subscribeToCall((newState) => {
      setCallState({ ...newState });
    });

    // Poll localStorage every 300ms for reliable cross-tab sync
    const pollInterval = setInterval(() => {
      const current = getCallState();
      setCallState(current);
    }, 300);

    return () => {
      unsubscribe();
      clearInterval(pollInterval);
    };
  }, []);

  // Initialize everything on mount
  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      // Load ML model first
      try {
        // Cache bust to ensure new model is loaded
        const modelLoaded = await loadModel(`/model.json?v=${new Date().getTime()}`);
        if (isMounted) {
          setModelReady(modelLoaded);
          console.log('✅ ML Model loaded:', modelLoaded);
        }
      } catch (e) {
        console.error('Model load error:', e);
      }

      // Start camera
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 480 }, height: { ideal: 360 }, facingMode: 'user' }
        });

        if (isMounted && videoRef.current) {
          streamRef.current = stream;
          videoRef.current.srcObject = stream;

          videoRef.current.onloadedmetadata = async () => {
            try {
              await videoRef.current.play();
              setCameraReady(true);
              console.log('✅ Camera started');

              // Initialize MediaPipe after camera is ready
              initMediaPipe();
            } catch (playErr) {
              console.error('Video play error:', playErr);
              setCameraError('Failed to start video');
            }
          };
        }
      } catch (err) {
        console.error('Camera access error:', err);
        if (isMounted) {
          setCameraError('Camera access denied. Please allow camera permissions.');
        }
      }
    };

    init();

    return () => {
      isMounted = false;
      // Cleanup
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (handsRef.current) {
        handsRef.current.close();
      }
    };
  }, []);

  // Initialize MediaPipe Hands
  const initMediaPipe = async () => {
    try {
      const { Hands } = await import('@mediapipe/hands');

      handsRef.current = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
      });

      handsRef.current.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.7
      });

      handsRef.current.onResults(handleHandResults);

      await handsRef.current.initialize();
      console.log('✅ MediaPipe Hands initialized');

      // Start detection loop
      detectLoop();
    } catch (err) {
      console.error('MediaPipe init error:', err);
    }
  };

  // Detection loop using requestAnimationFrame
  const detectLoop = async () => {
    if (handsRef.current && videoRef.current && videoRef.current.readyState >= 2) {
      try {
        await handsRef.current.send({ image: videoRef.current });
      } catch (e) {
        // Ignore send errors
      }
    }
    requestAnimationFrame(detectLoop);
  };

  // Smooth prediction using history (like working code)
  const smoothPrediction = (label) => {
    historyRef.current.push(label);
    if (historyRef.current.length > SMOOTH_WINDOW) historyRef.current.shift();

    const counts = {};
    historyRef.current.forEach(x => counts[x] = (counts[x] || 0) + 1);

    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  };

  // Handle MediaPipe hand detection results
  const handleHandResults = async (results) => {
    // Skip ML updates if user manually selected a phrase recently (lock active)
    if (manualLockRef.current) return;

    if (!canvasRef.current) return;

    const ctx = canvasRef.current.getContext('2d');
    const w = canvasRef.current.width;
    const h = canvasRef.current.height;

    ctx.clearRect(0, 0, w, h);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];

      if (!landmarks || landmarks.length !== 21) {
        setDetecting(true);
        return;
      }

      // Draw hand skeleton
      drawHand(ctx, landmarks, w, h);

      // Run ML prediction
      const features = normalizeLandmarks(landmarks);
      if (features && isModelLoaded()) {
        try {
          const prediction = await predict(features);

          if (prediction) {
            console.log('📊 Prediction:', prediction.gesture, prediction.confidence.toFixed(2));

            // Apply confidence threshold
            if (prediction.confidence < CONF_THRESHOLD) {
              setDetected('NONE');
              setConfidence(Math.round(prediction.confidence * 100));
              setDetecting(false);
              setModelReady(true);
              return;
            }

            // Smooth the prediction
            const stableGesture = smoothPrediction(prediction.gesture);

            setDetected(stableGesture);
            setConfidence(Math.round(prediction.confidence * 100));
            setDetecting(false);
            setModelReady(true);

            // Update call state so doctor can see the gesture
            const currentCall = getCurrentCallState();
            if (currentCall.active) {
              updateCallState({
                patientGesture: stableGesture,
                gestureConfidence: Math.round(prediction.confidence * 100)
              });
            }

            // Trigger action for Help gesture
            if (stableGesture === 'Help') {
              console.log('🎯 HELP gesture detected!');
              if (onGestureDetected) onGestureDetected(stableGesture);
            }
          }
        } catch (err) {
          console.error('Prediction error:', err);
        }
      }
    } else {
      // No hand detected - clear gesture immediately
      setDetecting(true);
      setDetected(null);
      historyRef.current = []; // Clear history when no hand

      // Send NONE to doctor to clear display immediately
      const currentCall = getCurrentCallState();
      if (currentCall.active && currentCall.patientGesture !== 'NONE') {
        updateCallState({
          patientGesture: 'NONE',
          gestureConfidence: 0
        });
      }
    }
  };

  // Draw hand landmarks
  const drawHand = (ctx, landmarks, w, h) => {
    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4],
      [0, 5], [5, 6], [6, 7], [7, 8],
      [0, 9], [9, 10], [10, 11], [11, 12],
      [0, 13], [13, 14], [14, 15], [15, 16],
      [0, 17], [17, 18], [18, 19], [19, 20],
      [5, 9], [9, 13], [13, 17]
    ];

    // Draw lines
    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 3;
    connections.forEach(([i, j]) => {
      ctx.beginPath();
      ctx.moveTo(landmarks[i].x * w, landmarks[i].y * h);
      ctx.lineTo(landmarks[j].x * w, landmarks[j].y * h);
      ctx.stroke();
    });

    // Draw points
    ctx.fillStyle = '#FF0000';
    landmarks.forEach(lm => {
      ctx.beginPath();
      ctx.arc(lm.x * w, lm.y * h, 6, 0, 2 * Math.PI);
      ctx.fill();
    });
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-color)' }}>

      {/* Header */}
      <header style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--primary)', color: 'white' }}>
        <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.2)', color: 'white', padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CloseIcon width={20} /> Back
        </button>
        <h2 style={{ margin: 0, color: 'white' }}>Gesture Detection</h2>
        <button onClick={() => setShowNotifications(!showNotifications)} style={{ background: 'rgba(255,255,255,0.2)', color: 'white', padding: '0.5rem', borderRadius: '50%', border: 'none', cursor: 'pointer', position: 'relative' }}>
          <BellIcon />
          <span style={{ position: 'absolute', top: '-2px', right: '-2px', backgroundColor: 'var(--secondary)', width: '10px', height: '10px', borderRadius: '50%' }}></span>
        </button>
      </header>

      {showNotifications && <NotificationPanel onClose={() => setShowNotifications(false)} />}

      {/* Camera Section - Compact */}
      <div style={{ flex: '0 0 auto', padding: '1rem', display: 'flex', justifyContent: 'center' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '400px', aspectRatio: '4/3', backgroundColor: '#000', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
          />
          <canvas
            ref={canvasRef}
            width={640}
            height={480}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', transform: 'scaleX(-1)', pointerEvents: 'none' }}
          />

          {/* Sign Language Video Player Overlay */}
          {callState.doctorResponse && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 10, background: 'black', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                <img
                  src="/media__1770294612108.jpg"
                  alt="Sign Language Interpreter"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }}
                />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ background: 'rgba(0,0,0,0.6)', padding: '1rem', borderRadius: '12px', textAlign: 'center', marginBottom: '1rem' }}>
                    <p style={{ color: 'var(--accent)', margin: 0, fontWeight: 'bold' }}>SIGN LANGUAGE RESPONSE:</p>
                    <h2 style={{ color: 'white', margin: '0.5rem 0', fontSize: '1.5rem' }}>"{callState.doctorResponse}"</h2>
                  </div>
                  <div style={{ width: '60px', height: '60px', background: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'pulse 2s infinite' }}>
                    <div style={{ width: 0, height: 0, borderTop: '10px solid transparent', borderBottom: '10px solid transparent', borderLeft: '20px solid var(--primary)', marginLeft: '5px' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Camera Status */}
          {!cameraReady && !cameraError && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', background: 'rgba(0,0,0,0.7)' }}>
              <p>📷 Starting camera...</p>
            </div>
          )}
          {cameraError && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', background: 'rgba(200,0,0,0.8)', textAlign: 'center', padding: '1rem' }}>
              <p>⚠️ {cameraError}</p>
            </div>
          )}
        </div>
      </div>

      {/* Gesture Detection Status */}
      <div style={{ padding: '1rem' }}>
        <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
          <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
            {modelReady ? '🤖 ML Model Active' : '⏳ Loading model...'}
          </p>
          {detecting ? (
            <h2 style={{ color: 'var(--text-light)', margin: 0 }}>👋 Show your hand gesture...</h2>
          ) : (
            <>
              <p style={{ color: '#888', fontSize: '0.8rem', marginBottom: '0.25rem' }}>GESTURE DETECTED:</p>
              <h1 style={{ color: 'var(--primary)', fontSize: '2.5rem', margin: '0.5rem 0' }}>{detected}</h1>
              <p style={{ color: 'var(--accent)', fontWeight: 'bold' }}>Confidence: {confidence}%</p>
            </>
          )}
        </div>
      </div>

      {/* Quick Phrase Buttons - For deaf users to tap common phrases */}
      <div style={{ padding: '0 1rem' }}>
        <div className="card" style={{ background: 'linear-gradient(135deg, #fff3e0, #fff)', padding: '1rem' }}>
          <p style={{ color: '#666', fontSize: '0.8rem', marginBottom: '0.75rem', fontWeight: 'bold' }}>⚡ QUICK MEDICAL PHRASES (Tap to send):</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
            {[
              { text: '🆘 HELP', gesture: 'Help' },
              { text: '✅ YES', gesture: 'YES' },
              { text: '❌ NO', gesture: 'NO' },
              { text: '😣 PAIN', gesture: 'Pain' },
              { text: '🔥 FEVER', gesture: 'Fever' },
              { text: '🫁 BREATHING', gesture: 'breathe problem' },
              { text: '🩸 BLOOD', gesture: 'Blood' },
              { text: '😷 COUGH', gesture: 'Cough' },
              { text: '💧 WATER', gesture: 'I need water' },
              { text: '🏥 HOSPITAL', gesture: 'Hospital' },
              { text: '💊 MEDICINE', gesture: 'Medicine' },
              { text: '❤️ HEART', gesture: 'Heart' }
            ].map((phrase, i) => (
              <button
                key={i}
                onClick={() => {
                  const current = getCurrentCallState();
                  if (current.active) {
                    // Lock ML updates for 3 seconds to prevent overwrite
                    if (manualLockRef.current) clearTimeout(manualLockRef.current);
                    manualLockRef.current = setTimeout(() => {
                      manualLockRef.current = null;
                      setDetecting(true); // Resume detection UI
                    }, 3000);

                    // Update local UI immediately
                    setDetecting(false);
                    setDetected(phrase.gesture);
                    setConfidence(100);

                    // Send to doctor
                    updateCallState({ patientGesture: phrase.gesture, gestureConfidence: 100 });
                  }
                }}
                style={{
                  padding: '0.8rem 0.25rem',
                  fontSize: '0.85rem',
                  fontWeight: 'bold',
                  background: 'white',
                  border: '2px solid var(--primary)',
                  borderRadius: '12px',
                  color: 'var(--primary)',
                  cursor: 'pointer',
                  minHeight: '48px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {phrase.text}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Call Status Bar */}
      <div style={{ padding: '0.5rem 1rem' }}>
        <div style={{
          padding: '0.75rem 1rem',
          borderRadius: '50px',
          background: callState.active ? 'var(--accent)' : callState.patientLocation ? '#ff9800' : '#ccc',
          color: 'white',
          textAlign: 'center',
          fontWeight: 'bold',
          fontSize: '0.9rem'
        }}>
          {callState.active ? '🟢 CONNECTED TO DOCTOR' : callState.patientLocation ? '🟡 WAITING FOR DOCTOR...' : '⚪ NOT CONNECTED'}
        </div>
      </div>

      {/* Doctor Response Area */}
      <div style={{ flex: 1, padding: '0 1rem 1rem', overflowY: 'auto' }}>
        <div className="card" style={{ background: 'linear-gradient(135deg, #e3f2fd, #fff)', border: '2px solid var(--primary-light)', minHeight: '100px' }}>
          <h3 style={{ color: 'var(--primary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
            👨‍⚕️ Doctor Response
          </h3>
          {callState.doctorResponse ? (
            <div>
              <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '0.5rem' }}>{callState.doctorResponse}</p>
              <p style={{ color: 'var(--accent)' }}>✔ Help is on the way</p>
            </div>
          ) : callState.active ? (
            <p style={{ color: 'var(--accent)', fontSize: '1.1rem' }}>🔗 Connected! Show gestures or tap quick phrases above.</p>
          ) : callState.patientLocation ? (
            <p style={{ color: '#ff9800', fontSize: '1.1rem' }}>📞 Calling nearby doctors...</p>
          ) : (
            <p style={{ color: '#888', fontStyle: 'italic' }}>Doctor will respond here when connected</p>
          )}
        </div>
      </div>

    </div>
  );
};

function App() {
  const [view, setView] = useState('LOGIN'); // LOGIN, DASHBOARD, PATIENT, DOCTOR_LANDING
  const [alertActive, setAlertActive] = useState(false);
  const [alertReason, setAlertReason] = useState(null);
  const [userRole, setUserRole] = useState(null);

  const handleLogin = (role) => {
    setUserRole(role);
    if (role === 'patient') {
      setView('DASHBOARD');
    } else {
      setView('DOCTOR_LANDING');
    }
  };

  const handleLogout = () => {
    setUserRole(null);
    setView('LOGIN');
  };

  const handleStart = async () => {
    // Automatically contact doctors within 5km when starting emergency communication
    const location = await getPatientLocation();
    const nearbyDoctors = findNearbyDoctors(location);

    console.log('🚨 Auto-contacting', nearbyDoctors.length, 'doctors within 5km');
    console.log('Nearby doctors:', nearbyDoctors.map(d => d.name));

    // Update call state to notify doctors immediately
    updateCallState({
      patientLocation: location,
      emergencyType: 'EMERGENCY',
      active: false,
      doctorResponse: null,
      patientGesture: null
    });

    setView('PATIENT');
  };

  const handleAlert = (reason = null) => {
    setAlertReason(reason);
    setAlertActive(true);
  };

  const handleGestureDetected = (symptom) => {
    // Placeholder for future logic
    console.log("Gesture Detected:", symptom);
  };

  return (
    <div>
      {alertActive && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(211, 47, 47, 0.95)', zIndex: 2000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
          <EmergencyAlertIcon width={100} height={100} color="white" style={{ animation: 'pulse 1s infinite' }} />
          <h1 style={{ fontSize: '3rem', marginTop: '1rem' }}>EMERGENCY ALERT SENT</h1>
          {alertReason && <h2 style={{ fontSize: '2rem', marginTop: '0.5rem', fontWeight: 'bold' }}>{alertReason}</h2>}
          <p style={{ fontSize: '1.5rem' }}>Doctor has been notified.</p>
          <div style={{ marginTop: '2rem' }}>
            <button onClick={() => setAlertActive(false)} style={{ padding: '1rem 3rem', background: 'white', color: 'var(--secondary)', border: 'none', borderRadius: '50px', fontSize: '1.2rem', fontWeight: 'bold' }}>
              {alertReason ? "Close & View Status" : "Dismiss"}
            </button>
          </div>
        </div>
      )}

      {view === 'LOGIN' && <Login onLogin={handleLogin} />}

      {view === 'DASHBOARD' && <PatientDashboard onStart={handleStart} onAlert={() => handleAlert(null)} onLogout={handleLogout} />}

      {view === 'DOCTOR_LANDING' && <DoctorDashboard onLogout={handleLogout} />}

      {view === 'PATIENT' && (
        <PatientCamera
          onBack={() => setView('DASHBOARD')}
          onAlert={handleAlert}
          onGestureDetected={handleGestureDetected}
        />
      )}
    </div>
  );
}

export default App;
