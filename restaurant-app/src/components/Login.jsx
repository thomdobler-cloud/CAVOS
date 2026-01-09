import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../firebase';
import { ref, get, set, update } from 'firebase/database';
import { Link, useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';
import './Login.css';

export default function Login() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Check if user exists in DB
            const userRef = ref(db, `users/${user.uid}`);
            const snapshot = await get(userRef);

            // Force Admin role for 'dobler@email.de' every time they login
            // This fixes issues where the role might have been set to 'user' previously
            const normalizedEmail = user.email.toLowerCase();
            const isAdminEmail = normalizedEmail === 'dobler@email.de';

            if (!snapshot.exists() || isAdminEmail) {
                const role = isAdminEmail ? 'admin' : (snapshot.exists() ? snapshot.val().role : 'user');

                // Only update if it's a new user OR if we need to enforce admin
                if (!snapshot.exists() || (isAdminEmail && snapshot.val().role !== 'admin')) {
                    await update(userRef, {
                        email: user.email,
                        role: role,
                        lastLogin: new Date().toISOString()
                    });
                } else {
                    // Just update last login for existing correct users
                    await update(userRef, {
                        lastLogin: new Date().toISOString()
                    });
                }
            } else {
                // Regular existing user, just update login time
                await update(userRef, {
                    lastLogin: new Date().toISOString()
                });
            }

            // Redirect handled by App router/navigate
            navigate('/dashboard');
        } catch (err) {
            setError('Invalid email or password.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="glass-panel login-card">
                <img src={logo} alt="CAVOS Taverna" className="login-logo" />
                <h2 className="login-welcome">Willkommen im CAVOS</h2>
                <p className="login-subtitle">Melde Dich an um fortzufahren</p>

                <form onSubmit={handleLogin} className="login-form">
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
                    <div className="input-group">
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="login-input"
                        />
                    </div>


                    {error && <p className="error-msg">{error}</p>}

                    <div style={{ textAlign: 'right', marginBottom: '1rem' }}>
                        <Link to="/forgot-password" style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textDecoration: 'none' }}>
                            Forgot Password?
                        </Link>
                    </div>

                    <button type="submit" className="login-button" disabled={loading}>
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>

                    <div style={{ marginTop: '20px', fontSize: '0.9rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Noch kein Konto? </span>
                        <Link to="/register" style={{ color: 'var(--primary)', fontWeight: '600', textDecoration: 'none' }}>
                            Registrieren
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
