import React, { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';
import { Link } from 'react-router-dom';
import './Login.css'; // Reusing Login styles for consistency

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleReset = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');
        setLoading(true);
        try {
            await sendPasswordResetEmail(auth, email);
            setMessage('Password reset email has been sent!');
        } catch (err) {
            setError('Failed to send reset email. Check if the address is correct.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="glass-panel login-card">
                <h1 className="login-title">Reset Password</h1>
                <p className="login-subtitle">Enter your email to receive instructions</p>

                <form onSubmit={handleReset} className="login-form">
                    <div className="input-group">
                        <input
                            type="email"
                            placeholder="Email Address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="login-input"
                        />
                    </div>

                    {message && <p style={{ color: '#4caf50', fontSize: '0.9rem' }}>{message}</p>}
                    {error && <p className="error-msg">{error}</p>}

                    <button type="submit" className="login-button" disabled={loading}>
                        {loading ? 'Sending...' : 'Send Reset Link'}
                    </button>

                    <div style={{ marginTop: '1rem' }}>
                        <Link to="/login" style={{ color: 'var(--primary)', textDecoration: 'none', fontSize: '0.9rem' }}>Back to Login</Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
