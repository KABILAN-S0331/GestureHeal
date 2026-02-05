import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

const Register = ({ onSwitchToLogin }) => {
    const { signUp, loading, error } = useAuth();
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        fullName: '',
        role: 'patient',
        licenseNumber: '',
        specialization: ''
    });
    const [localError, setLocalError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLocalError('');

        // Validation
        if (!formData.email || !formData.password || !formData.fullName) {
            setLocalError('Please fill in all required fields');
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setLocalError('Passwords do not match');
            return;
        }

        if (formData.password.length < 6) {
            setLocalError('Password must be at least 6 characters');
            return;
        }

        if (formData.role === 'doctor' && !formData.licenseNumber) {
            setLocalError('License number is required for doctors');
            return;
        }

        const { error } = await signUp(
            formData.email,
            formData.password,
            formData.fullName,
            formData.role,
            formData.licenseNumber || null
        );

        if (error) {
            setLocalError(error.message);
        } else {
            setSuccess(true);
        }
    };

    if (success) {
        return (
            <div className="auth-container">
                <div className="auth-card">
                    <div className="auth-success">
                        <span className="success-icon">✅</span>
                        <h2>Registration Successful!</h2>
                        <p>Please check your email to verify your account.</p>
                        <button
                            className="btn btn-primary"
                            onClick={onSwitchToLogin}
                        >
                            Go to Login
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-container">
            <div className="auth-card auth-card-register">
                <div className="auth-header">
                    <div className="auth-logo">
                        <span className="logo-icon">🤟</span>
                        <h1>GestureHeal</h1>
                    </div>
                    <p className="auth-subtitle">Create your account</p>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                    {(localError || error) && (
                        <div className="auth-error">
                            <span>⚠️</span> {localError || error}
                        </div>
                    )}

                    {/* Role Selection */}
                    <div className="role-selector">
                        <button
                            type="button"
                            className={`role-btn ${formData.role === 'patient' ? 'active' : ''}`}
                            onClick={() => setFormData(prev => ({ ...prev, role: 'patient' }))}
                        >
                            <span className="role-icon">👤</span>
                            <span>Patient</span>
                        </button>
                        <button
                            type="button"
                            className={`role-btn ${formData.role === 'doctor' ? 'active' : ''}`}
                            onClick={() => setFormData(prev => ({ ...prev, role: 'doctor' }))}
                        >
                            <span className="role-icon">👨‍⚕️</span>
                            <span>Doctor</span>
                        </button>
                    </div>

                    <div className="form-group">
                        <label htmlFor="fullName">Full Name *</label>
                        <input
                            type="text"
                            id="fullName"
                            name="fullName"
                            value={formData.fullName}
                            onChange={handleChange}
                            placeholder="Enter your full name"
                            disabled={loading}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="email">Email Address *</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="Enter your email"
                            disabled={loading}
                        />
                    </div>

                    {formData.role === 'doctor' && (
                        <>
                            <div className="form-group">
                                <label htmlFor="licenseNumber">Medical License Number *</label>
                                <input
                                    type="text"
                                    id="licenseNumber"
                                    name="licenseNumber"
                                    value={formData.licenseNumber}
                                    onChange={handleChange}
                                    placeholder="Enter your license number"
                                    disabled={loading}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="specialization">Specialization</label>
                                <select
                                    id="specialization"
                                    name="specialization"
                                    value={formData.specialization}
                                    onChange={handleChange}
                                    disabled={loading}
                                >
                                    <option value="">Select specialization</option>
                                    <option value="General Physician">General Physician</option>
                                    <option value="Emergency Medicine">Emergency Medicine</option>
                                    <option value="Cardiology">Cardiology</option>
                                    <option value="Neurology">Neurology</option>
                                    <option value="Orthopedics">Orthopedics</option>
                                    <option value="Pediatrics">Pediatrics</option>
                                    <option value="Psychiatry">Psychiatry</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </>
                    )}

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="password">Password *</label>
                            <input
                                type="password"
                                id="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="Create password"
                                disabled={loading}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="confirmPassword">Confirm *</label>
                            <input
                                type="password"
                                id="confirmPassword"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                placeholder="Confirm password"
                                disabled={loading}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary btn-full"
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <span className="spinner"></span>
                                Creating Account...
                            </>
                        ) : (
                            'Create Account'
                        )}
                    </button>
                </form>

                <div className="auth-footer">
                    <p>
                        Already have an account?{' '}
                        <button
                            type="button"
                            className="link-btn"
                            onClick={onSwitchToLogin}
                        >
                            Sign In
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Register;
