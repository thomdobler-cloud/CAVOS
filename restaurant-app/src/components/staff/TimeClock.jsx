import React, { useState, useEffect } from 'react';
import { ref, push, update, onValue } from 'firebase/database';
import { db } from '../../firebase';

export default function TimeClock({ currentUser, location }) {
    const [status, setStatus] = useState('loading'); // loading, out, active
    const [currentSession, setCurrentSession] = useState(null);
    const [distance, setDistance] = useState(null);
    const [locationError, setLocationError] = useState(null);
    const [isOverride, setIsOverride] = useState(false);
    const [elapsedTime, setElapsedTime] = useState('00:00:00');

    // --- 1. Load User Status & Override ---
    useEffect(() => {
        if (!currentUser) return;

        // Check for active session
        // In a real app we might query by 'active' status index, but here we scan today's entries or user state
        // Simplification: We'll store "currentSessionId" in the user profile for quick access?
        // Or just scan the last entry. Let's scan last entry mechanism later. 
        // For now, let's just assume we want to Clock IN. 
        // Better: Listen to a user-specific node `status/timeclock/{uid}`
        const statusRef = ref(db, `users/${currentUser.uid}/timeclock_status`);
        const sub = onValue(statusRef, (snap) => {
            const data = snap.val();
            if (data && data.status === 'active') {
                setStatus('active');
                setCurrentSession(data);
            } else {
                setStatus('out');
                setCurrentSession(null);
            }
        });

        // Check Override
        const userSettingsRef = ref(db, `users/${currentUser.uid}/settings`);
        const sub2 = onValue(userSettingsRef, (snap) => {
            const settings = snap.val();
            if (settings && settings.geoOverrideUntil) {
                const end = new Date(settings.geoOverrideUntil);
                if (end > new Date()) {
                    setIsOverride(true);
                } else {
                    setIsOverride(false);
                }
            } else {
                setIsOverride(false);
            }
        });

        return () => { sub(); sub2(); };
    }, [currentUser]);

    // --- 2. Step Tracking (Mock/Simulator) ---
    // In a real Native App, this would connect to Pedometer API
    useEffect(() => {
        let interval;
        if (status === 'active') {
            interval = setInterval(() => {
                logActivity();
            }, 1000 * 60 * 15); // Every 15 mins
        }
        return () => clearInterval(interval);
    }, [status]);

    // --- 2b. Live Timer ---
    useEffect(() => {
        let timer;
        if (status === 'active' && currentSession?.clockIn) {
            timer = setInterval(() => {
                const start = new Date(currentSession.clockIn);
                const now = new Date();
                const diff = now - start;

                const h = Math.floor(diff / (1000 * 60 * 60));
                const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const s = Math.floor((diff % (1000 * 60)) / 1000);

                setElapsedTime(
                    `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
                );
            }, 1000);
        } else {
            setElapsedTime('00:00:00');
        }
        return () => clearInterval(timer);
    }, [status, currentSession]);

    const logActivity = async () => {
        if (!currentUser || !currentSession) return;
        // Mock Step Count
        const steps = Math.floor(Math.random() * 200) + 50;
        const logId = Date.now();
        const dateStr = new Date().toISOString().split('T')[0];

        await update(ref(db, `activity_logs/${currentUser.uid}/${dateStr}/${currentSession.sessionId}/${logId}`), {
            timestamp: logId,
            steps: steps, // Mocked
            mock: true
        });
        console.log("Logged activity step mock:", steps);
    };

    // --- 3. Geofencing Logic ---
    const getDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371e3; // metres
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c; // in metres
    };

    const verifyLocation = async () => {
        if (isOverride) return true; // Bypass
        if (!location || !location.lat || !location.lng) {
            setLocationError("Standort hat keine GPS-Koordinaten hinterlegt. Bitte Admin kontaktieren.");
            return false;
        }

        return new Promise((resolve) => {
            if (!navigator.geolocation) {
                setLocationError("Geolocatiion nicht unterstützt.");
                resolve(false);
                return;
            }
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const d = getDistance(pos.coords.latitude, pos.coords.longitude, location.lat, location.lng);
                    setDistance(Math.round(d));
                    if (d <= 75) {
                        resolve(true);
                    } else {
                        setLocationError(`Zu weit entfernt! (${Math.round(d)}m). Erlaubt: 75m.`);
                        resolve(false);
                    }
                },
                (err) => {
                    setLocationError("GPS Fehler: " + err.message);
                    resolve(false);
                },
                { enableHighAccuracy: true }
            );
        });
    };

    // --- 4. Actions ---
    const handleClockIn = async () => {
        setLocationError(null);
        const valid = await verifyLocation();
        if (!valid) return;

        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const sessionId = push(ref(db, `time_tracking/${currentUser.uid}/${year}/${month}`)).key;

        const entry = {
            locationId: location.id,
            locationName: location.name || location.firmenname,
            clockIn: now.toISOString(),
            status: 'active',
            verification: isOverride ? 'admin_override' : 'geo'
        };

        // Write Log
        await update(ref(db, `time_tracking/${currentUser.uid}/${year}/${month}/${sessionId}`), entry);

        // Update User Status
        await update(ref(db, `users/${currentUser.uid}/timeclock_status`), {
            status: 'active',
            sessionId: sessionId,
            clockIn: now.toISOString(),
            locationId: location.id
        });
    };

    const handleClockOut = async () => {
        if (!currentSession) return;

        // Validate Location on Clock Out? Usually yes, but let's be lenient or require it too.
        // Let's require it to prevent "Stempeln von Zuhause".
        const valid = await verifyLocation();
        if (!valid && !window.confirm("Du bist nicht am Standort. Trotzdem ausstempeln? (Wird markiert)")) {
            return;
        }

        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;

        await update(ref(db, `time_tracking/${currentUser.uid}/${year}/${month}/${currentSession.sessionId}`), {
            clockOut: now.toISOString(),
            status: 'completed',
            verificationOut: isOverride ? 'admin_override' : (valid ? 'geo' : 'remote_warning')
        });

        // Clear Status
        await update(ref(db, `users/${currentUser.uid}/timeclock_status`), {
            status: 'out',
            lastSessionId: currentSession.sessionId,
            lastClockOut: now.toISOString()
        });

        setDistance(null);
    };

    if (!location) return <div>Bitte Standort auswählen für Zeiterfassung.</div>;

    // --- HISTORY LOGIC ---
    const [history, setHistory] = useState([]);
    const [hourlyRate, setHourlyRate] = useState(12.50); // Default or fetch from user profile

    useEffect(() => {
        if (!currentUser) return;
        // Fetch User Rate if available (Mock check)
        if (currentUser.hourlyRate) setHourlyRate(currentUser.hourlyRate);

        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;

        const historyRef = ref(db, `time_tracking/${currentUser.uid}/${year}/${month}`);
        return onValue(historyRef, (snap) => {
            const data = snap.val();
            if (data) {
                const list = Object.entries(data)
                    .map(([id, session]) => ({ id, ...session }))
                    .filter(s => s.status === 'completed')
                    .sort((a, b) => new Date(b.clockIn) - new Date(a.clockIn)); // Newest first
                setHistory(list);
            } else {
                setHistory([]);
            }
        });
    }, [currentUser]);

    const calculateDuration = (start, end) => {
        const s = new Date(start);
        const e = new Date(end);
        const diffMs = e - s;
        const hours = diffMs / (1000 * 60 * 60);
        return { hours, ms: diffMs };
    };

    const formatDuration = (ms) => {
        const h = Math.floor(ms / (1000 * 60 * 60));
        const m = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
        return `${h}h ${m}m`;
    };

    // Format Start Time
    const getStartTime = () => {
        try {
            if (!currentSession || !currentSession.clockIn) return '--:--';
            const d = new Date(currentSession.clockIn);
            if (isNaN(d.getTime())) return '--:--';
            return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', hour12: false });
        } catch (e) {
            console.error("Time Error:", e);
            return '--:--';
        }
    };

    return (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '40px', maxWidth: '500px', margin: '0 auto' }}>
            <h2 style={{ marginBottom: '10px' }}>⏱️ Stempeluhr</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>
                Standort: {location.name || location.firmenname}
            </p>

            {isOverride && (
                <div style={{ background: '#eab308', color: 'black', padding: '10px', borderRadius: '8px', marginBottom: '20px', fontWeight: 'bold' }}>
                    🔓 GPS-Sperre deaktiviert (Admin)
                </div>
            )}

            {locationError && (
                <div style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '15px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #ef4444' }}>
                    ⚠️ {locationError}
                    {distance && <div>Aktuelle Distanz: {distance}m</div>}
                </div>
            )}

            <div style={{
                width: '250px', height: '250px', borderRadius: '50%', margin: '0 auto 30px',
                border: `8px solid ${status === 'active' ? '#10b981' : 'rgba(255,255,255,0.1)'}`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                background: status === 'active' ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                transition: 'all 0.5s',
                boxShadow: status === 'active' ? '0 0 50px rgba(16, 185, 129, 0.3)' : 'none'
            }}>
                {status === 'active' ? (
                    <>
                        <div style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.6)', marginBottom: '5px' }}>Laufzeit</div>
                        <div style={{ fontSize: '2.5rem', fontWeight: 'bold', fontFamily: 'monospace' }}>{elapsedTime}</div>
                        <div style={{ fontSize: '0.9rem', color: '#10b981', marginTop: '10px', fontWeight: '600' }}>
                            Gestartet: {getStartTime()} Uhr
                        </div>
                    </>
                ) : (
                    <>
                        <div style={{ fontSize: '3rem' }}>🛑</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', marginTop: '10px' }}>Inaktiv</div>
                    </>
                )}
            </div>

            {status === 'out' ? (
                <button
                    onClick={handleClockIn}
                    style={{
                        width: '100%', padding: '20px', fontSize: '1.2rem', fontWeight: 'bold',
                        background: 'var(--primary)', color: 'white', borderRadius: '16px', border: 'none', cursor: 'pointer',
                        boxShadow: '0 10px 30px -5px var(--primary)'
                    }}
                >
                    Einstempeln (Schicht Start)
                </button>
            ) : (
                <button
                    onClick={handleClockOut}
                    style={{
                        width: '100%', padding: '20px', fontSize: '1.2rem', fontWeight: 'bold',
                        background: '#ef4444', color: 'white', borderRadius: '16px', border: 'none', cursor: 'pointer',
                        boxShadow: '0 10px 30px -5px #ef4444'
                    }}
                >
                    Ausstempeln (Schicht Ende)
                </button>
            )}

            <p style={{ marginTop: '20px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>
                Die Zeit wird automatisch erfasst. <br />
                Dein Standort wird beim Stempeln geprüft (Max. 75m).
                {status === 'active' && <br />}
                {status === 'active' && "Aktivitäts-Check: Alle 15 min."}
            </p>

            {/* --- HISTORY SECTION --- */}
            {status === 'out' && history.length > 0 && (
                <div style={{ marginTop: '40px', textAlign: 'left', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px' }}>
                    <h3 style={{ marginBottom: '15px', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Verlauf (Dieser Monat)</span>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Ø {hourlyRate.toFixed(2)}€/h</span>
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto' }}>
                        {history.map(session => {
                            const { hours, ms } = calculateDuration(session.clockIn, session.clockOut);
                            const earnings = (hours * hourlyRate).toFixed(2);
                            const date = new Date(session.clockIn).toLocaleDateString();

                            return (
                                <div key={session.id} style={{
                                    background: 'rgba(255,255,255,0.03)',
                                    padding: '12px',
                                    borderRadius: '10px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    fontSize: '0.9rem'
                                }}>
                                    <div>
                                        <div style={{ fontWeight: 'bold' }}>{date}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
                                            {formatDuration(ms)} Stunden
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ color: '#10b981', fontWeight: 'bold' }}>+ {earnings} €</div>
                                        <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>
                                            (geschätzt)
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
