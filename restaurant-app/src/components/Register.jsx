import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../firebase';
import { ref, set } from 'firebase/database';
import { Link, useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';
import './Login.css'; // Reuse Login styles

export default function Register() {
    const navigate = useNavigate();
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Validation State
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Validators
    const validateField = (name, value) => {
        let msg = null;
        switch (name) {
            case 'firstName':
                if (value.trim().length < 2) msg = "Vorname zu kurz.";
                break;
            case 'lastName':
                if (value.trim().length < 2) msg = "Nachname zu kurz.";
                break;
            case 'phone':
                // Allow some formatting chars, then check regex
                const cleanPhone = value.replace(/[\s\-\/]/g, '');
                // DE: 015-017, CH: 075-079, or +49/+41 prefixes
                if (!/^(\+491|01[567]|\+417|07[56789])\d+$/.test(cleanPhone)) {
                    msg = "Nummer ungültig (DE: 015-017 / CH: 075-079).";
                }
                break;
            case 'email':
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                    msg = "Ungültige E-Mail-Adresse.";
                }
                break;
            case 'password':
                if (value.length < 6) msg = "Passwort muss mind. 6 Zeichen haben.";
                break;
            case 'confirmPassword':
                if (value !== password) msg = "Passwörter stimmen nicht überein.";
                break;
            default: break;
        }
        return msg;
    };

    const handleBlur = (e) => {
        const { name, value } = e.target;
        setTouched({ ...touched, [name]: true });
        const msg = validateField(name, value);
        setErrors(prev => ({ ...prev, [name]: msg }));
    };

    // Also Validate Confirm Password on Password Change
    const handlePasswordChange = (e) => {
        setPassword(e.target.value);
        if (touched.confirmPassword) {
            const msg = e.target.value !== confirmPassword ? "Passwörter stimmen nicht überein." : null;
            setErrors(prev => ({ ...prev, confirmPassword: msg }));
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        console.log("handleRegister called");
        setError('');

        // 1. Validate All Fields Strictly
        const newErrors = {};
        newErrors.firstName = validateField('firstName', firstName);
        newErrors.lastName = validateField('lastName', lastName);
        newErrors.phone = validateField('phone', phone);
        newErrors.email = validateField('email', email);
        newErrors.password = validateField('password', password);
        newErrors.confirmPassword = validateField('confirmPassword', confirmPassword); // Check strictly again

        // Cleanup nulls
        Object.keys(newErrors).forEach(key => newErrors[key] === null && delete newErrors[key]);

        console.log("Validation errors:", newErrors);

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            setTouched({ firstName: true, lastName: true, phone: true, email: true, password: true, confirmPassword: true });
            console.log("Blocking submission due to errors.");
            return;
        }

        // NO creation here. Pass data to Step 2 (Onboarding).
        setLoading(true);
        console.log("Validation passed. Navigating in 500ms...");

        // Simulate short delay for UX
        setTimeout(() => {
            console.log("Navigating to /onboarding now...");
            navigate('/onboarding', {
                state: {
                    registerData: {
                        firstName,
                        lastName,
                        name: `${firstName} ${lastName}`,
                        phone,
                        email,
                        password // Pass password to create account in next step
                    }
                }
            });
            setLoading(false);
        }, 500);
    };

    return (
        <div className="login-container">
            <div className="glass-panel login-card">
                <img src={logo} alt="CAVOS Taverna" className="login-logo" />
                <h2 className="login-welcome">Konto erstellen (1/2)</h2>
                <p className="login-subtitle">Schritt 1: Basis-Daten</p>

                <form onSubmit={handleRegister} className="login-form">
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <div className="input-group" style={{ flex: 1 }}>
                            <input
                                type="text"
                                name="firstName"
                                placeholder="Vorname"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                onBlur={handleBlur}
                                required
                                className="login-input"
                            />
                            {errors.firstName && <small style={{ color: '#ef4444' }}>{errors.firstName}</small>}
                        </div>
                        <div className="input-group" style={{ flex: 1 }}>
                            <input
                                type="text"
                                name="lastName"
                                placeholder="Nachname"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                onBlur={handleBlur}
                                required
                                className="login-input"
                            />
                            {errors.lastName && <small style={{ color: '#ef4444' }}>{errors.lastName}</small>}
                        </div>
                    </div>

                    <div className="input-group">
                        <input
                            type="tel"
                            name="phone"
                            placeholder="Telefonnummer"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            onBlur={handleBlur}
                            required
                            className="login-input"
                        />
                        {errors.phone && <small style={{ color: '#ef4444' }}>{errors.phone}</small>}
                    </div>

                    <div className="input-group">
                        <input
                            type="email"
                            name="email"
                            placeholder="E-Mail Adresse"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            onBlur={handleBlur}
                            required
                            className="login-input"
                        />
                        {errors.email && <small style={{ color: '#ef4444' }}>{errors.email}</small>}
                    </div>

                    {/* Password Field with Eye Icon */}
                    <div className="input-group" style={{ position: 'relative' }}>
                        <input
                            type={showPassword ? "text" : "password"}
                            name="password"
                            placeholder="Passwort"
                            value={password}
                            onChange={handlePasswordChange}
                            onBlur={handleBlur}
                            required
                            className="login-input"
                            style={{ paddingRight: '40px' }} // Make space for icon
                        />
                        <span
                            onClick={() => setShowPassword(!showPassword)}
                            style={{
                                position: 'absolute',
                                right: '12px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                cursor: 'pointer',
                                opacity: 0.7,
                                fontSize: '1.2rem',
                                userSelect: 'none'
                            }}
                            title={showPassword ? "Verbergen" : "Anzeigen"}
                        >
                            {showPassword ? '👁️' : '🔒'}
                        </span>
                        {errors.password && <small style={{ color: '#ef4444' }}>{errors.password}</small>}
                    </div>

                    <div className="input-group">
                        <input
                            type="password"
                            name="confirmPassword"
                            placeholder="Passwort bestätigen"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            onBlur={handleBlur}
                            required
                            className="login-input"
                        />
                        {errors.confirmPassword && <small style={{ color: '#ef4444' }}>{errors.confirmPassword}</small>}
                    </div>

                    {error && <p className="error-msg">{error}</p>}

                    <button type="submit" className="login-button" disabled={loading}>
                        {loading ? 'Prüfe...' : 'Weiter ➔'}
                    </button>

                    <div style={{ marginTop: '20px', fontSize: '0.9rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Bereits ein Konto? </span>
                        <Link to="/login" style={{ color: 'var(--primary)', fontWeight: '600', textDecoration: 'none' }}>
                            Anmelden
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
