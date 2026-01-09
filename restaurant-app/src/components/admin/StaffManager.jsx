import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { ref, onValue, update } from 'firebase/database';

import StaffDetailModal from './StaffDetailModal';

export default function StaffManager() {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    // Removed legacy entryDate state as it's handled in detail modal now

    useEffect(() => {
        const usersRef = ref(db, 'users');
        const unsubscribe = onValue(usersRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                // Convert to array
                const userList = Object.entries(data).map(([uid, val]) => ({
                    uid,
                    ...val
                })).filter(u => u.role !== 'admin'); // Filter out admins or handle differently? Maybe keep them visible.

                setEmployees(userList);
            } else {
                setEmployees([]);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // Legacy handleActivate removed, moved to DetailModal internal logic or handled via generic save


    // Filter Groups
    const pending = employees.filter(e => e.onboardingStatus === 'verified' || e.onboardingStatus === 'pending_verification'); // pending_verification might show here too if admin wants to peek
    const active = employees.filter(e => e.onboardingStatus === 'active' || (!e.onboardingStatus && e.isProfileComplete)); // Legacy support
    const incomplete = employees.filter(e => !e.onboardingStatus && !e.isProfileComplete);

    if (loading) return <div style={{ color: 'white' }}>Laden...</div>;

    return (
        <div style={{ padding: '20px', color: 'white' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                👥 Mitarbeiter Verwaltung
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

                {/* Pending List */}
                <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '16px', padding: '20px', border: '1px solid rgba(255,165,0,0.3)' }}>
                    <h3 style={{ color: '#fbbf24', marginBottom: '15px' }}>⏳ Wartet auf Freigabe ({pending.length})</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {pending.map(emp => (
                            <div key={emp.uid} style={{ background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '10px' }}>
                                <div style={{ fontWeight: 'bold' }}>{emp.firstName} {emp.lastName}</div>
                                <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>{emp.email} | {emp.phone}</div>
                                <div style={{ fontSize: '0.8rem', marginTop: '5px', color: emp.onboardingStatus === 'verified' ? '#10b981' : '#fbbf24' }}>
                                    Status: {emp.onboardingStatus === 'verified' ? 'E-Mail Bestätigt ✅' : 'Wartet auf E-Mail ✉️'}
                                </div>
                                <button
                                    onClick={() => setSelectedEmployee(emp)}
                                    style={{ marginTop: '10px', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer', width: '100%' }}
                                >
                                    Bearbeiten / Aktivieren
                                </button>
                            </div>
                        ))}
                        {pending.length === 0 && <p style={{ opacity: 0.5 }}>Keine offenen Anfragen.</p>}
                    </div>
                </div>

                {/* Active List */}
                <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '16px', padding: '20px', border: '1px solid rgba(16,185,129,0.3)' }}>
                    <h3 style={{ color: '#10b981', marginBottom: '15px' }}>✅ Aktiv ({active.length})</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {active.map(emp => (
                            <div key={emp.uid} style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between' }}>
                                <div>
                                    <div style={{ fontWeight: 'bold' }}>{emp.firstName} {emp.lastName}</div>
                                    <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>Start: {emp.entryDate || '-'}</div>
                                    <button
                                        onClick={() => setSelectedEmployee(emp)}
                                        style={{ marginTop: '5px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer', fontSize: '0.8rem' }}
                                    >
                                        📂 Akte öffnen
                                    </button>
                                </div>
                                <div style={{ fontSize: '1.2rem', opacity: 0.5, cursor: 'pointer' }} onClick={() => setSelectedEmployee(emp)}>👤</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Detail Modal (Personalakte) */}
            {selectedEmployee && (
                <StaffDetailModal
                    user={selectedEmployee}
                    onClose={() => setSelectedEmployee(null)}
                />
            )}
        </div>
    );
}
