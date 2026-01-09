import React, { useState } from 'react';
import { ref, update } from 'firebase/database';
import { db } from '../../firebase';

export default function RoleManagementModal({ user, onClose, availableRoles }) {
    const [editingUser, setEditingUser] = useState({
        ...user,
        roles: user.roles || (user.role === 'admin' ? ['admin'] : [])
    });

    const getDisplayName = (u) => {
        if (!u) return '';
        return u.name || u.Name || u.username || u.fullName || u.displayName || u.email;
    };

    const handleToggleRole = (roleId) => {
        const currentRoles = editingUser.roles || [];
        let newRoles;

        if (currentRoles.includes(roleId)) {
            newRoles = currentRoles.filter(r => r !== roleId);
        } else {
            newRoles = [...currentRoles, roleId];
        }

        setEditingUser({ ...editingUser, roles: newRoles });
    };

    const handleSaveRoles = async () => {
        try {
            // Save as 'roles' array AND keep 'role' for legacy compatibility (set to 'admin' if admin role is present, else 'user')
            const primaryRole = editingUser.roles.includes('admin') ? 'admin' : 'user';

            await update(ref(db, `users/${user.uid}`), {
                roles: editingUser.roles,
                role: primaryRole
            });
            onClose();
        } catch (error) {
            console.error('Error updating roles:', error);
            alert('Fehler beim Speichern der Rollen');
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(5px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100
        }}>
            <div style={{
                background: 'var(--bg-card)', border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '24px', padding: '30px', width: '95%', maxWidth: '800px',
                maxHeight: '90vh', display: 'flex', flexDirection: 'column',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexShrink: 0 }}>
                    <h2 style={{ margin: 0, color: 'white', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span>🛠️</span> Jobs für {getDisplayName(user)}
                    </h2>
                    <button
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer' }}
                    >
                        ✕
                    </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px', marginBottom: '30px', overflowY: 'auto', paddingRight: '5px', flex: 1 }}>
                    {availableRoles.map(role => {
                        const isSelected = editingUser.roles && editingUser.roles.includes(role.id);
                        return (
                            <div
                                key={role.id}
                                onClick={() => handleToggleRole(role.id)}
                                style={{
                                    padding: '16px', borderRadius: '12px',
                                    border: isSelected ? '2px solid var(--primary)' : '1px solid rgba(255, 255, 255, 0.1)',
                                    background: isSelected ? 'rgba(37, 99, 235, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '15px', transition: 'all 0.2s'
                                }}
                            >
                                <span style={{ fontSize: '1.5rem' }}>{role.icon}</span>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: '600', color: isSelected ? 'var(--primary-light)' : 'white' }}>{role.label}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.6)' }}>{role.desc}</div>
                                </div>
                                {isSelected && <span style={{ color: 'var(--primary)' }}>✅</span>}
                            </div>
                        );
                    })}
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <button onClick={handleSaveRoles} style={{ flex: 1, padding: '14px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '1rem', fontWeight: '600', cursor: 'pointer' }}>
                        Speichern
                    </button>
                    <button onClick={onClose} style={{ flex: 1, padding: '14px', background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '1rem', fontWeight: '600', cursor: 'pointer' }}>
                        Abbrechen
                    </button>
                </div>
            </div>
        </div>
    );
}
