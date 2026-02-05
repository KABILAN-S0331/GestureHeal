import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

const Login = ({ onSwitchToRegister }) => {
    const { signIn, loading, error } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [localError, setLocalError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLocalError('');

        if (!email || !password) {
            setLocalError('Please fill in all fields');
            return;
        }

        const { error } = await signIn(email, password);
        if (error) {
            setLocalError(error.message);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <div className="auth-logo">
                        <span className="logo-icon">🤟</span>
                        <h1>GestureHeal</h1>
                    </div>
                    <p className="auth-subtitle">Sign in to your account</p>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                    {(localError || error) && (
                        <div className="auth-error">
                            <span>⚠️</span> {localError || error}
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="email">Email Address</label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter your email"
                            disabled={loading}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password"
                            disabled={loading}
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary btn-full"
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <span className="spinner"></span>
                                Signing in...
                            </>
                        ) : (
                            'Sign In'
                        )}
                    </button>
                </form>

                <div className="auth-footer">
                    <p>
                        Don't have an account?{' '}
                        <button
                            type="button"
                            className="link-btn"
                            onClick={onSwitchToRegister}
                        >
                            Create Account
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
