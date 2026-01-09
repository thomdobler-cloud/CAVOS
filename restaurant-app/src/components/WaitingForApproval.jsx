import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';

export default function WaitingForApproval() {
    const navigate = useNavigate();

    return (
        <div className="login-container">
            <div className="glass-panel login-card" style={{ maxWidth: '500px', textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '20px' }}>⏳</div>
                <h2 className="login-welcome">Warte auf Freischaltung</h2>
                <p className="login-subtitle">
                    Deine Daten wurden verifiziert! 🎉
                    <br /><br />
                    Ein Administrator muss nun dein Konto und das Eintrittsdatum bestätigen.
                    Sobald dies geschehen ist, kannst du dich hier einloggen.
                </p>

                <div style={{ marginTop: '30px' }}>
                    <button onClick={() => window.location.reload()} className="login-button" style={{ background: 'rgba(255,255,255,0.1)', marginBottom: '10px' }}>
                        Status prüfen (Reload)
                    </button>
                    <button onClick={() => navigate('/login')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
                        Ausloggen
                    </button>
                </div>
            </div>
        </div>
    );
}
