import React from 'react';

const HomeBanner = ({ unreadCount, onClick }) => {
    if (!unreadCount || unreadCount === 0) return null;

    return (
        <div
            onClick={onClick}
            style={{
                margin: '20px',
                background: 'linear-gradient(90deg, #3b82f6, #2563eb)',
                color: 'white',
                padding: '15px 20px',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 4px 15px rgba(37, 99, 235, 0.3)',
                cursor: 'pointer',
                border: '1px solid rgba(255,255,255,0.2)'
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{
                    background: 'rgba(255,255,255,0.2)',
                    width: '40px', height: '40px', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.2rem'
                }}>
                    💬
                </div>
                <div>
                    <h3 style={{ margin: '0 0 2px 0', fontSize: '1.1rem' }}>Neue Nachrichten</h3>
                    <span style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                        Du hast {unreadCount} ungelesene Nachricht{unreadCount !== 1 ? 'en' : ''}.
                    </span>
                </div>
            </div>
            <div style={{
                background: 'white', color: '#2563eb', padding: '8px 16px',
                borderRadius: '10px', fontWeight: 'bold', fontSize: '0.9rem'
            }}>
                Ansehen →
            </div>
        </div>
    );
};

export default HomeBanner;
