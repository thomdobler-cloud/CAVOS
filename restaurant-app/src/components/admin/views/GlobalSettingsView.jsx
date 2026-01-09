import React from 'react';

const GlobalSettingsView = ({ themes, theme, setTheme }) => {
    return (
        <div style={{ padding: '20px' }}>
            <h2 style={{ marginBottom: '20px' }}>Design & Einstellungen</h2>
            <div className="glass-panel" style={{ padding: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <h3 style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '15px', fontWeight: '500' }}>Farbschema (Theme)</h3>
                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                    {themes.map(t => (
                        <div
                            key={t.id}
                            onClick={() => setTheme(t.id)}
                            title={t.name}
                            style={{
                                width: '50px',
                                height: '50px',
                                borderRadius: '12px',
                                background: t.color,
                                cursor: 'pointer',
                                border: theme === t.id ? '3px solid white' : '2px solid transparent',
                                boxShadow: theme === t.id ? '0 0 15px ' + t.color : 'none',
                                transition: 'all 0.2s'
                            }}
                        />
                    ))}
                </div>
                <p style={{ marginTop: '10px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    Aktuelles Theme: {themes.find(t => t.id === theme)?.name}
                </p>
            </div>
        </div>
    );
};

export default GlobalSettingsView;
