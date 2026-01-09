import React from 'react';

export default function DashboardHomeGrid({ setView }) {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', padding: '20px' }}>
            <div
                onClick={() => setView('locations')}
                className="glass-panel"
                style={{
                    padding: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '20px',
                    transition: 'transform 0.2s', background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '24px', border: '1px solid rgba(255, 255, 255, 0.1)'
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
                <span style={{ fontSize: '3rem' }}>🏢</span>
                <div>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'white' }}>Standorte verwalten</h3>
                    <p style={{ margin: '5px 0 0 0', color: 'var(--text-muted)' }}>Restaurants bearbeiten & auswählen</p>
                </div>
            </div>

            <div
                onClick={() => setView('users')}
                className="glass-panel"
                style={{
                    padding: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '20px',
                    transition: 'transform 0.2s', background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '24px', border: '1px solid rgba(255, 255, 255, 0.1)'
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
                <span style={{ fontSize: '3rem' }}>👥</span>
                <div>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'white' }}>Personal & Rechte</h3>
                    <p style={{ margin: '5px 0 0 0', color: 'var(--text-muted)' }}>Mitarbeiter und Rollen (RBAC)</p>
                </div>
            </div>

            <div
                onClick={() => setView('global-menu')}
                className="glass-panel"
                style={{
                    padding: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '20px',
                    transition: 'transform 0.2s', background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '24px', border: '1px solid rgba(255, 255, 255, 0.1)'
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
                <span style={{ fontSize: '3rem' }}>🥘</span>
                <div>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'white' }}>Zentrale Speisekarte</h3>
                    <p style={{ margin: '5px 0 0 0', color: 'var(--text-muted)' }}>Produkte, Rezepte & Kategorien</p>
                </div>
            </div>

            <div
                onClick={() => setView('settings')}
                className="glass-panel"
                style={{
                    padding: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '20px',
                    transition: 'transform 0.2s', background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '24px', border: '1px solid rgba(255, 255, 255, 0.1)'
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
                <span style={{ fontSize: '3rem' }}>🎨</span>
                <div>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'white' }}>Design & System</h3>
                    <p style={{ margin: '5px 0 0 0', color: 'var(--text-muted)' }}>Themes und Einstellungen</p>
                </div>
            </div>
        </div>
    );
}
