import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
    getAppointments,
    updateAppointmentStatus,
    getNearbyEmergencyCalls,
    acceptEmergencyCall,
    subscribeToEmergencyCalls,
    subscribeToAppointments,
    getActiveDoctorCall
} from '../../lib/supabase';
import DoctorVideoCall from './VideoCall';

const DoctorDashboard = () => {
    const { profile, user, signOut, updateUserProfile } = useAuth();
    const [isOnline, setIsOnline] = useState(profile?.is_online || false);
    const [appointments, setAppointments] = useState([]);
    const [emergencyCalls, setEmergencyCalls] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('appointments'); // appointments, emergency
    const [activeCall, setActiveCall] = useState(null);
    const [doctorLocation, setDoctorLocation] = useState(null);

    // Get doctor's location on mount
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setDoctorLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                },
                (error) => console.error('Location error:', error)
            );
        }
    }, []);

    // Fetch data on mount (only depends on user)
    useEffect(() => {
        if (!user?.id) return;

        // Fetch both appointments and emergency calls immediately
        fetchAppointments();
        fetchEmergencyCalls();
        checkActiveCall(); // Check if we already have an active call (e.g. after refresh)

        // Subscribe to realtime updates
        const emergencySubscription = subscribeToEmergencyCalls((payload) => {
            console.log('Emergency call realtime update:', payload);
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                fetchEmergencyCalls();
            }
        });

        const appointmentSubscription = subscribeToAppointments(user.id, 'doctor', (payload) => {
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                fetchAppointments();
            }
        });

        return () => {
            emergencySubscription?.unsubscribe();
            appointmentSubscription?.unsubscribe();
        };
    }, [user?.id]); // Only depend on user ID

    // Also refetch emergency calls when location becomes available (for distance calc)
    useEffect(() => {
        if (doctorLocation) {
            console.log('Doctor location available, refreshing emergency calls');
            fetchEmergencyCalls();
        }
    }, [doctorLocation]);

    // Poll for emergency calls as fallback (Supabase realtime can be unreliable)
    useEffect(() => {
        if (!user?.id) return;

        const pollInterval = setInterval(() => {
            console.log('Polling emergency calls...');
            fetchEmergencyCalls();
        }, 5000); // Poll every 5 seconds

        return () => clearInterval(pollInterval);
    }, [user?.id, doctorLocation]);

    const fetchData = async () => {
        setLoading(true);
        await Promise.all([fetchAppointments(), fetchEmergencyCalls()]);
        setLoading(false);
    };

    const fetchAppointments = async () => {
        if (!user?.id) return;
        const { data } = await getAppointments(user.id, 'doctor');
        if (data) setAppointments(data);
    };

    const fetchEmergencyCalls = async () => {
        console.log('Fetching emergency calls, doctorLocation:', doctorLocation);
        // Pass location if available, otherwise pass default (will show all calls)
        const location = doctorLocation || { lat: 0, lng: 0 };
        const { data, error } = await getNearbyEmergencyCalls(location, 50);
        console.log('Emergency calls result:', data, error);
        if (data) setEmergencyCalls(data);
    };

    const checkActiveCall = async () => {
        if (!user?.id) return;
        const { data } = await getActiveDoctorCall(user.id);
        if (data) {
            console.log('Restoring active call:', data);
            setActiveCall(data);
        }
    };

    // Toggle online status
    const toggleOnlineStatus = async () => {
        const newStatus = !isOnline;
        console.log('Toggling online status to:', newStatus);

        const updates = {
            is_online: newStatus
        };

        // Add location if available
        if (doctorLocation) {
            updates.latitude = doctorLocation.lat;
            updates.longitude = doctorLocation.lng;
        }

        const { error } = await updateUserProfile(updates);

        if (error) {
            console.error('Failed to update online status:', error);
        } else {
            console.log('Online status updated successfully');
            setIsOnline(newStatus);
        }
    };

    // Handle appointment status change
    const handleAppointmentAction = async (appointmentId, status) => {
        await updateAppointmentStatus(appointmentId, status);
        fetchAppointments();
    };

    // Accept emergency call
    const handleAcceptEmergency = async (call) => {
        // Generate a room URL (in production, this would be from Daily.co API)
        const roomUrl = `https://gestureheal.daily.co/room-${call.id.slice(0, 8)}`;

        const { data, error } = await acceptEmergencyCall(call.id, user.id, roomUrl);

        if (!error && data) {
            setActiveCall({
                ...data,
                patient_name: call.patient_name
            });
        }
    };

    // Start scheduled appointment call
    const handleStartCall = async (appointment) => {
        // Create a call-like object for the video call component
        setActiveCall({
            id: appointment.id,
            patient_id: appointment.patient_id,
            patient_name: appointment.patient?.full_name || 'Patient',
            doctor_id: user.id,
            status: 'connected',
            room_url: `https://gestureheal.daily.co/apt-${appointment.id.slice(0, 8)}`
        });
    };

    // If in active call, show video call component
    if (activeCall) {
        return (
            <DoctorVideoCall
                callData={activeCall}
                onEnd={() => {
                    setActiveCall(null);
                    fetchEmergencyCalls();
                }}
            />
        );
    }

    // Filter appointments
    const pendingAppointments = appointments.filter(a => a.status === 'pending');
    const upcomingAppointments = appointments.filter(a =>
        a.status === 'approved' && new Date(a.scheduled_at) > new Date()
    );
    const pastAppointments = appointments.filter(a =>
        a.status === 'completed' ||
        (a.status === 'approved' && new Date(a.scheduled_at) < new Date())
    );

    return (
        <div className="dashboard doctor-dashboard">
            {/* Header */}
            <header className="dashboard-header">
                <div className="header-left">
                    <span className="logo-icon">👨‍⚕️</span>
                    <h1>Doctor Dashboard</h1>
                </div>
                <div className="header-right">
                    <button
                        className={`status-toggle ${isOnline ? 'online' : 'offline'}`}
                        onClick={toggleOnlineStatus}
                    >
                        <span className="status-dot"></span>
                        {isOnline ? 'Online' : 'Offline'}
                    </button>
                    <span className="user-greeting">Dr. {profile?.full_name}</span>
                    <button className="btn btn-ghost" onClick={signOut}>
                        Sign Out
                    </button>
                </div>
            </header>

            {/* Tab Navigation */}
            <div className="tab-nav">
                <button
                    className={`tab-btn ${activeTab === 'appointments' ? 'active' : ''}`}
                    onClick={() => setActiveTab('appointments')}
                >
                    📅 Appointments
                    {pendingAppointments.length > 0 && (
                        <span className="badge">{pendingAppointments.length}</span>
                    )}
                </button>
                <button
                    className={`tab-btn ${activeTab === 'emergency' ? 'active' : ''}`}
                    onClick={() => setActiveTab('emergency')}
                >
                    🚨 Emergency Panel
                    {emergencyCalls.length > 0 && (
                        <span className="badge emergency">{emergencyCalls.length}</span>
                    )}
                </button>
            </div>

            {/* Content */}
            <div className="dashboard-content">
                {activeTab === 'appointments' && (
                    <div className="appointments-tab">
                        {/* Pending Requests */}
                        <section className="dashboard-section">
                            <h2>⏳ Pending Requests</h2>
                            {pendingAppointments.length === 0 ? (
                                <div className="empty-state">
                                    <p>No pending requests</p>
                                </div>
                            ) : (
                                <div className="appointments-list">
                                    {pendingAppointments.map(apt => (
                                        <div key={apt.id} className="appointment-card pending">
                                            <div className="apt-patient">
                                                <span className="avatar">👤</span>
                                                <div>
                                                    <h4>{apt.patient?.full_name}</h4>
                                                    <p className="apt-notes">{apt.notes || 'No notes provided'}</p>
                                                </div>
                                            </div>
                                            <div className="apt-time">
                                                <span className="date">
                                                    {new Date(apt.scheduled_at).toLocaleDateString()}
                                                </span>
                                                <span className="time">
                                                    {new Date(apt.scheduled_at).toLocaleTimeString([], {
                                                        hour: '2-digit', minute: '2-digit'
                                                    })}
                                                </span>
                                            </div>
                                            <div className="apt-actions">
                                                <button
                                                    className="btn btn-success btn-sm"
                                                    onClick={() => handleAppointmentAction(apt.id, 'approved')}
                                                >
                                                    ✓ Approve
                                                </button>
                                                <button
                                                    className="btn btn-danger btn-sm"
                                                    onClick={() => handleAppointmentAction(apt.id, 'rejected')}
                                                >
                                                    ✕ Reject
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>

                        {/* Upcoming */}
                        <section className="dashboard-section">
                            <h2>📅 Upcoming Appointments</h2>
                            {upcomingAppointments.length === 0 ? (
                                <div className="empty-state">
                                    <p>No upcoming appointments</p>
                                </div>
                            ) : (
                                <div className="appointments-list">
                                    {upcomingAppointments.map(apt => (
                                        <div key={apt.id} className="appointment-card approved">
                                            <div className="apt-patient">
                                                <span className="avatar">👤</span>
                                                <div>
                                                    <h4>{apt.patient?.full_name}</h4>
                                                    <p className="apt-notes">{apt.notes || 'No notes'}</p>
                                                </div>
                                            </div>
                                            <div className="apt-time">
                                                <span className="date">
                                                    {new Date(apt.scheduled_at).toLocaleDateString()}
                                                </span>
                                                <span className="time">
                                                    {new Date(apt.scheduled_at).toLocaleTimeString([], {
                                                        hour: '2-digit', minute: '2-digit'
                                                    })}
                                                </span>
                                            </div>
                                            <button
                                                className="btn btn-primary btn-sm"
                                                onClick={() => handleStartCall(apt)}
                                            >
                                                Start Call
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>

                        {/* History */}
                        <section className="dashboard-section">
                            <h2>📋 History</h2>
                            {pastAppointments.length === 0 ? (
                                <div className="empty-state">
                                    <p>No past appointments</p>
                                </div>
                            ) : (
                                <div className="appointments-list history">
                                    {pastAppointments.slice(0, 5).map(apt => (
                                        <div key={apt.id} className="appointment-card completed">
                                            <div className="apt-patient">
                                                <span className="avatar">👤</span>
                                                <h4>{apt.patient?.full_name}</h4>
                                            </div>
                                            <div className="apt-time">
                                                {new Date(apt.scheduled_at).toLocaleDateString()}
                                            </div>
                                            <span className="status-badge completed">Completed</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    </div>
                )}

                {activeTab === 'emergency' && (
                    <div className="emergency-tab">
                        <div className="emergency-header">
                            <h2>🚨 Emergency Calls Nearby (5km)</h2>
                            <button className="btn btn-ghost btn-sm" onClick={fetchEmergencyCalls}>
                                🔄 Refresh
                            </button>
                        </div>

                        {!isOnline && (
                            <div className="warning-banner">
                                <span>⚠️</span>
                                <p>You are currently offline. Go online to receive emergency calls.</p>
                                <button className="btn btn-primary btn-sm" onClick={toggleOnlineStatus}>
                                    Go Online
                                </button>
                            </div>
                        )}

                        {emergencyCalls.length === 0 ? (
                            <div className="empty-state large">
                                <span className="empty-icon">🩺</span>
                                <h3>No Emergency Calls</h3>
                                <p>Stay online to receive emergency calls from patients nearby</p>
                            </div>
                        ) : (
                            <div className="emergency-list">
                                {emergencyCalls.map(call => (
                                    <div key={call.id} className="emergency-card">
                                        <div className="emergency-pulse"></div>
                                        <div className="emergency-info">
                                            <h3>🆘 Emergency Request</h3>
                                            <p className="patient-name">Patient: {call.patient_name}</p>
                                            <p className="distance">
                                                📍 {call.distance_km?.toFixed(1)} km away
                                            </p>
                                            <p className="time">
                                                ⏱️ {new Date(call.created_at).toLocaleTimeString()}
                                            </p>
                                        </div>
                                        <button
                                            className="btn btn-emergency"
                                            onClick={() => handleAcceptEmergency(call)}
                                        >
                                            Accept Call
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DoctorDashboard;
