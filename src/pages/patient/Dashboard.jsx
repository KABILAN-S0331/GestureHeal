import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getOnlineDoctors, createAppointment, getAppointments } from '../../lib/supabase';
import SignSpeak from './SignSpeak';
import VideoCall from './VideoCall';

const PatientDashboard = () => {
    const { profile, signOut, updateUserProfile } = useAuth();
    const [mode, setMode] = useState('dashboard'); // dashboard, signspeak, connect, videocall
    const [doctors, setDoctors] = useState([]);
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [bookingDoctor, setBookingDoctor] = useState(null);
    const [bookingDate, setBookingDate] = useState('');
    const [bookingTime, setBookingTime] = useState('');
    const [bookingNotes, setBookingNotes] = useState('');
    const [activeCall, setActiveCall] = useState(null);

    // Fetch data on mount
    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [doctorsRes, appointmentsRes] = await Promise.all([
                getOnlineDoctors(),
                getAppointments(profile?.id, 'patient')
            ]);

            if (doctorsRes.data) setDoctors(doctorsRes.data);
            if (appointmentsRes.data) setAppointments(appointmentsRes.data);
        } catch (err) {
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleBookAppointment = async (e) => {
        e.preventDefault();
        if (!bookingDoctor || !bookingDate || !bookingTime) return;

        const scheduledAt = new Date(`${bookingDate}T${bookingTime}`).toISOString();

        const { data, error } = await createAppointment(
            profile.id,
            bookingDoctor.id,
            scheduledAt,
            bookingNotes
        );

        if (!error) {
            setBookingDoctor(null);
            setBookingDate('');
            setBookingTime('');
            setBookingNotes('');
            fetchData();
        }
    };

    const isStartingEmergency = useRef(false);

    const startEmergencyCall = async () => {
        if (isStartingEmergency.current) return;
        isStartingEmergency.current = true;

        // Helper to proceed with a location
        const proceedWithLocation = async (location) => {
            // Update profile location if valid
            if (location.lat !== 0) {
                await updateUserProfile({
                    location: `POINT(${location.lng} ${location.lat})`
                });
            }

            setActiveCall({ location, status: 'connecting' });
            setMode('videocall');

            // Reset flag after a delay in case call fails or ends
            setTimeout(() => { isStartingEmergency.current = false; }, 5000);
        };

        // Get user location (with fallback for HTTP/mobile)
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const location = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    proceedWithLocation(location);
                },
                (error) => {
                    console.warn('Location error (using fallback):', error);
                    // Use fallback location for testing (0,0 means "unknown")
                    proceedWithLocation({ lat: 0, lng: 0 });
                }
            );
        } else {
            // No geolocation support, use fallback
            proceedWithLocation({ lat: 0, lng: 0 });
        }
    };

    // SignSpeak Mode
    if (mode === 'signspeak') {
        return <SignSpeak onBack={() => setMode('dashboard')} />;
    }

    // Video Call Mode
    if (mode === 'videocall') {
        return (
            <VideoCall
                callData={activeCall}
                onEnd={() => {
                    setActiveCall(null);
                    setMode('dashboard');
                }}
            />
        );
    }

    return (
        <div className="dashboard patient-dashboard">
            {/* Header */}
            <header className="dashboard-header">
                <div className="header-left">
                    <span className="logo-icon">🤟</span>
                    <h1>GestureHeal</h1>
                </div>
                <div className="header-right">
                    <span className="user-greeting">Hello, {profile?.full_name}</span>
                    <button className="btn btn-ghost" onClick={signOut}>
                        Sign Out
                    </button>
                </div>
            </header>

            {/* Mode Selector */}
            <div className="mode-selector-container">
                <h2>Choose Mode</h2>
                <div className="mode-cards">
                    <button
                        className="mode-card offline-mode"
                        onClick={() => setMode('signspeak')}
                    >
                        <div className="mode-icon">📴</div>
                        <h3>SignSpeak</h3>
                        <p>Offline Mode</p>
                        <span className="mode-desc">
                            Translate your signs to text phrases without internet
                        </span>
                    </button>

                    <button
                        className="mode-card online-mode"
                        onClick={() => setMode('connect')}
                    >
                        <div className="mode-icon">🌐</div>
                        <h3>Connect</h3>
                        <p>Online Mode</p>
                        <span className="mode-desc">
                            Video call with available doctors
                        </span>
                    </button>
                </div>
            </div>

            {mode === 'connect' && (
                <>
                    {/* Emergency Button */}
                    <div className="emergency-section">
                        <button
                            className="btn btn-emergency btn-full"
                            onClick={startEmergencyCall}
                        >
                            <span className="emergency-icon">🚨</span>
                            Emergency Call
                            <span className="emergency-subtitle">Connect with nearest doctor</span>
                        </button>
                    </div>

                    {/* Available Doctors */}
                    <section className="dashboard-section">
                        <div className="section-header">
                            <h2>🟢 Available Doctors</h2>
                            <button className="btn btn-ghost btn-sm" onClick={fetchData}>
                                Refresh
                            </button>
                        </div>

                        {loading ? (
                            <div className="loading-state">
                                <span className="spinner"></span>
                                Loading doctors...
                            </div>
                        ) : doctors.length === 0 ? (
                            <div className="empty-state">
                                <span className="empty-icon">👨‍⚕️</span>
                                <p>No doctors available right now</p>
                                <span>Please try again later</span>
                            </div>
                        ) : (
                            <div className="doctors-grid">
                                {doctors.map(doctor => (
                                    <div key={doctor.id} className="doctor-card">
                                        <div className="doctor-avatar">
                                            {doctor.avatar_url ? (
                                                <img src={doctor.avatar_url} alt={doctor.full_name} />
                                            ) : (
                                                <span className="avatar-placeholder">👨‍⚕️</span>
                                            )}
                                            <span className="online-badge"></span>
                                        </div>
                                        <div className="doctor-info">
                                            <h3>{doctor.full_name}</h3>
                                            <p className="specialization">{doctor.specialization || 'General Physician'}</p>
                                        </div>
                                        <button
                                            className="btn btn-primary btn-sm"
                                            onClick={() => setBookingDoctor(doctor)}
                                        >
                                            Book Appointment
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* My Appointments */}
                    <section className="dashboard-section">
                        <h2>📅 My Appointments</h2>

                        {appointments.length === 0 ? (
                            <div className="empty-state">
                                <span className="empty-icon">📋</span>
                                <p>No appointments yet</p>
                            </div>
                        ) : (
                            <div className="appointments-list">
                                {appointments.map(apt => (
                                    <div key={apt.id} className={`appointment-card status-${apt.status}`}>
                                        <div className="apt-time">
                                            <span className="apt-date">
                                                {new Date(apt.scheduled_at).toLocaleDateString()}
                                            </span>
                                            <span className="apt-hour">
                                                {new Date(apt.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <div className="apt-info">
                                            <h4>Dr. {apt.doctor?.full_name}</h4>
                                            <p>{apt.doctor?.specialization}</p>
                                            {apt.notes && <p className="apt-notes">{apt.notes}</p>}
                                        </div>
                                        <div className={`apt-status status-${apt.status}`}>
                                            {apt.status === 'pending' && '⏳ Pending'}
                                            {apt.status === 'approved' && '✅ Approved'}
                                            {apt.status === 'rejected' && '❌ Rejected'}
                                            {apt.status === 'completed' && '✓ Completed'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </>
            )}

            {/* Booking Modal */}
            {bookingDoctor && (
                <div className="modal-overlay" onClick={() => setBookingDoctor(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Book Appointment</h2>
                            <button className="close-btn" onClick={() => setBookingDoctor(null)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div className="booking-doctor-info">
                                <span className="avatar-placeholder">👨‍⚕️</span>
                                <div>
                                    <h3>Dr. {bookingDoctor.full_name}</h3>
                                    <p>{bookingDoctor.specialization || 'General Physician'}</p>
                                </div>
                            </div>

                            <form onSubmit={handleBookAppointment}>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Date</label>
                                        <input
                                            type="date"
                                            value={bookingDate}
                                            onChange={(e) => setBookingDate(e.target.value)}
                                            min={new Date().toISOString().split('T')[0]}
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Time</label>
                                        <input
                                            type="time"
                                            value={bookingTime}
                                            onChange={(e) => setBookingTime(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>Notes (Optional)</label>
                                    <textarea
                                        value={bookingNotes}
                                        onChange={(e) => setBookingNotes(e.target.value)}
                                        placeholder="Describe your symptoms or reason for visit..."
                                        rows={3}
                                    />
                                </div>

                                <button type="submit" className="btn btn-primary btn-full">
                                    Confirm Booking
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PatientDashboard;
