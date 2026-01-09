import React, { useState } from 'react';

const GlobalUsersView = ({ users, currentUser, onOpenRoleModal, onChangeView }) => {

    const getDisplayName = (user) => {
        if (!user) return '';
        return user.name || user.Name || user.username || user.fullName || user.displayName || user.email;
    };

    return (
        <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ margin: 0 }}>Personal & Rechte ({users.length})</h2>
                <button
                    onClick={() => onChangeView('hr')}
                    style={{ background: 'var(--primary)', color: 'white', padding: '10px 20px', borderRadius: '8px' }}
                >
                    📂 Zur Digitalen Personalakte
                </button>
            </div>
            <div style={{ display: 'grid', gap: '15px', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                {users.map(user => (
                    <div key={user.uid} style={{
                        background: 'rgba(2, 6, 23, 0.8)',
                        padding: '20px',
                        borderRadius: '12px',
                        border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
                            <div style={{
                                width: '40px', height: '40px', borderRadius: '50%',
                                background: user.role === 'admin' ? 'var(--primary)' : 'rgba(255,255,255,0.15)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                {user.role === 'admin' ? '🛡️' : '👤'}
                            </div>
                            <div style={{ overflow: 'hidden' }}>
                                <div style={{ fontWeight: '600', color: '#fff', fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getDisplayName(user)}</div>
                                <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>
                                    Rolle: {user.role || 'user'}
                                </div>
                            </div>
                        </div>
                        {(currentUser?.email === 'dobler@email.de' || currentUser?.role === 'admin') && user.email !== 'dobler@email.de' && (
                            <button
                                onClick={() => onOpenRoleModal(user)}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                    color: 'white',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                    fontWeight: '600',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                            >
                                Rollen verwalten
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {/* User List Debugger */}
            <div style={{ marginTop: '30px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '10px' }}>
                <details>
                    <summary style={{ cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>🐞 Debug: Alle Benutzer anzeigen (Liste)</summary>
                    <pre style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '8px', overflowX: 'auto', fontSize: '0.75rem', color: '#ccc' }}>
                        {users.map(u => `${u.email} [${u.role}] (ID: ${u.uid})`).join('\n')}
                    </pre>
                </details>
            </div>
        </div>
    );
};

export default GlobalUsersView;
