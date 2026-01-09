import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { ref, update, onValue } from 'firebase/database';
import { signOut } from 'firebase/auth'; // Added signOut
import './Login.css';

export default function EmailVerification() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [verifying, setVerifying] = useState(false);
    const [verified, setVerified] = useState(false);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((u) => {
            if (u) {
                setUser(u);
                // Check if already verified
                const userRef = ref(db, `users/${u.uid}`);
                onValue(userRef, (snap) => {
                    const val = snap.val();
                    if (val?.onboardingStatus === 'verified' || val?.onboardingStatus === 'active') {
                        navigate('/waiting-approval');
                    }
                }, { onlyOnce: true });
            } else {
                navigate('/login');
            }
        });
        return () => unsubscribe();
    }, [navigate]);

    const handleBackToLogin = async () => {
        await signOut(auth);
        navigate('/login');
    };

    const handleSimulatedVerify = async () => {
        if (!user) return;
        setVerifying(true);
        // Simulate network delay
        setTimeout(async () => {
            try {
                // Update DB Status
                const userRef = ref(db, `users/${user.uid}`);
                await update(userRef, {
                    onboardingStatus: 'verified',
                    emailVerifiedAt: new Date().toISOString()
                });
                setVerified(true);
                setTimeout(() => navigate('/waiting-approval'), 1500);
            } catch (err) {
                console.error(err);
                alert("Fehler bei der Verifizierung.");
            } finally {
                setVerifying(false);
            }
        }, 1000);
    };

    return (
        <div className="login-container">
            {/* Back Button */}
            <div style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 10 }}>
                <button
                    onClick={handleBackToLogin}
                    style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                    ⬅ Zurück zur Anmeldung
                </button>
            </div>

            <div className="glass-panel login-card" style={{ maxWidth: '500px', textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '20px' }}>📧</div>
                <h2 className="login-welcome">E-Mail bestätigen</h2>
                <p className="login-subtitle">
                    Wir haben eine E-Mail an deine Adresse gesendet.
                    Bitte klicke auf den Link in der E-Mail, um deine Daten zu bestätigen.
                </p>

                {/* DEMO USE ONLY: Simulated Email Link */}
                <div style={{ marginTop: '30px', padding: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                        (Demo-Modus: Da dies eine lokale Umgebung ohne Mail-Server ist, simuliere bitte den Klick:)
                    </p>
                    {verified ? (
                        <div style={{ color: '#10b981', fontWeight: 'bold' }}>Verifizierung erfolgreich! Weiterleitung...</div>
                    ) : (
                        <button
                            onClick={handleSimulatedVerify}
                            className="login-button"
                            disabled={verifying}
                            style={{ background: '#3b82f6' }}
                        >
                            {verifying ? 'Verifiziere...' : '🔗 [SIMULATION] E-Mail-Link klicken'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
