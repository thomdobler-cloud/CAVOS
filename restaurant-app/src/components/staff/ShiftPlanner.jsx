import React, { useState, useEffect } from 'react';
import { ref, update, onValue, remove, get } from 'firebase/database';
import { db } from '../../firebase';

export default function ShiftPlanner({ location }) {
    const [weekOffset, setWeekOffset] = useState(0);
    const [employees, setEmployees] = useState([]);
    const [roster, setRoster] = useState({}); // { shifts: {}, revenue: {}, fixedCosts: {} }
    const [loading, setLoading] = useState(true);
    const [draggedUser, setDraggedUser] = useState(null);
    const [compliance, setCompliance] = useState({ maxDailyHours: 10, minRestPeriod: 11 }); // Defaults

    // Modals
    const [showShiftModal, setShowShiftModal] = useState(false);
    const [modalData, setModalData] = useState(null); // { uid, date, shiftId, start, end, activity, customActivity }

    // Constants
    const DEPARTMENTS = [
        '🤵 Service', '👨‍🍳 Küche', '🍹 Theke', '📦 Lager & Facility', '🛡️ Einlass & Garderobe', '👨‍💼 Management'
    ];

    const ACTIVITIES = {
        '🤵 Service': ['Kellner', 'Runner', 'Serviceleitung', 'Spezifiziert'],
        '👨‍🍳 Küche': ['Koch', 'Küchenhilfe', 'Spüler', 'Spezifiziert'],
        '🍹 Theke': ['Barkeeper', 'Barback', 'Spezifiziert'],
        '📦 Lager & Facility': ['Lagerist', 'Reinigung', 'Spezifiziert'],
        '🛡️ Einlass & Garderobe': ['Security', 'Garderobe', 'Spezifiziert'],
        '👨‍💼 Management': ['Büro', 'Planung', 'Spezifiziert']
    };

    // --- Helper for Dates ---
    const getWeekNumber = (d) => {
        d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    };

    const getWeekDays = (offset) => {
        const curr = new Date();
        const first = curr.getDate() - curr.getDay() + 1 + (offset * 7); // Monday
        const days = [];
        for (let i = 0; i < 7; i++) {
            const next = new Date(curr.setDate(first + i));
            days.push(next.toISOString().split('T')[0]);
        }
        return days;
    };

    const weekDates = getWeekDays(weekOffset);
    const currentYearWeek = `${new Date().getFullYear()}-W${getWeekNumber(new Date()) + weekOffset}`;
    const weekDaysNames = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

    // --- Load Data ---
    useEffect(() => {
        setLoading(true);
        if (!location) return;

        // Load Employees
        const usersRef = ref(db, 'users');
        const sub1 = onValue(usersRef, (snap) => {
            const data = snap.val();
            if (data) {
                setEmployees(Object.entries(data).map(([uid, val]) => ({ uid, ...val })));
            } else {
                setEmployees([]);
            }
        });

        // Load Roster & Financials
        const rosterRef = ref(db, `roster/${location.id}/${currentYearWeek}`);
        const sub2 = onValue(rosterRef, (snap) => {
            const data = snap.val() || {};
            setRoster(data); // Contains shifts, revenue, fixedCosts
            setLoading(false);
        });

        // Load Compliance Rules
        const settingsRef = ref(db, 'settings/compliance');
        const sub3 = onValue(settingsRef, (snap) => {
            if (snap.exists()) setCompliance(snap.val());
        });

        return () => { sub1(); sub2(); sub3(); };
    }, [location, weekOffset, currentYearWeek]);

    // --- Helper for Activities ---
    // Moved up to be accessible
    const activitiesForDept = (dept) => {
        return ACTIVITIES[dept] || ['Allgemein'];
    };

    // --- CALCS ---
    const calculateDailyStats = (date) => {
        const shifts = roster.shifts || {};
        let dailyCost = 0;
        let staffCount = 0;

        Object.keys(shifts).forEach(uid => {
            const userShifts = shifts[uid]?.[date] || {};
            const emp = employees.find(e => e.uid === uid);
            const rate = emp?.hourlyRate || 13.0;

            Object.values(userShifts).forEach(s => {
                const start = new Date(`1970-01-01T${s.start}`);
                const end = new Date(`1970-01-01T${s.end}`);
                let hours = (end - start) / (1000 * 60 * 60);
                if (hours < 0) hours += 24;
                dailyCost += hours * rate;
                staffCount++;
            });
        });

        const revenue = parseFloat(roster.revenue?.[date] || 0);
        const ratio = revenue > 0 ? (dailyCost / revenue) * 100 : 0;

        return { dailyCost, revenue, ratio, staffCount };
    };

    // --- ACTIONS ---
    const updateRevenue = (date, val) => {
        update(ref(db, `roster/${location.id}/${currentYearWeek}/revenue`), { [date]: val });
    };

    // --- DRAG & DROP ---
    const handleDragStart = (e, employee) => {
        setDraggedUser(employee);
        e.dataTransfer.effectAllowed = 'copy';
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    };

    const handleDrop = (e, date, dept) => {
        e.preventDefault();
        if (draggedUser) {
            // Check availability (Mockup logic or real if added)
            // Open Modal Pre-filled
            openShiftModal(draggedUser.uid, date, null, null, dept);
        }
        setDraggedUser(null);
    };

    // --- MODAL ---
    const openShiftModal = (uid, date, shiftId, currentShift = null, preDept = null) => {
        const emp = employees.find(e => e.uid === uid);

        // Determine Department/Activity
        let dept = preDept || '🤵 Service';
        let activity = currentShift?.activity || ACTIVITIES[dept][0];

        // Reverse lookup dept if editing existing shift
        if (currentShift && !preDept) {
            // Find which dept contains this activity
            for (const [d, acts] of Object.entries(ACTIVITIES)) {
                if (acts.includes(currentShift.activity)) dept = d;
            }
        }

        setModalData({
            uid, date, shiftId,
            start: currentShift?.start || "17:00",
            end: currentShift?.end || "23:00",
            dept,
            activity: activity,
            customActivity: currentShift?.activity === 'Spezifiziert' ? currentShift?.customDetails : '',
            empName: emp?.name || 'Mitarbeiter'
        });
        setShowShiftModal(true);
    };

    const handleSaveShift = async () => {
        if (!modalData) return;
        const { uid, date, shiftId, start, end, activity, customActivity } = modalData;
        const finalActivity = activity === 'Spezifiziert' ? (customActivity || 'Spezifiziert') : activity;

        // --- COMPLIANCE CHECK ---
        const s = new Date(`1970-01-01T${start}`);
        const e = new Date(`1970-01-01T${end}`);
        let duration = (e - s) / (1000 * 60 * 60);
        if (duration < 0) duration += 24;

        if (compliance.maxDailyHours && duration > compliance.maxDailyHours) {
            if (compliance.enforceStrictCompliance) {
                alert(
                    `⛔ FEHLER: ARBEITSZEITGESETZ!\n\n` +
                    `Die Schichtdauer (${duration.toFixed(1)}h) überschreitet das Maximum von ${compliance.maxDailyHours} Stunden.\n\n` +
                    `Der Strict-Mode ist aktiv. Speichern NICHT möglich.`
                );
                return;
            } else {
                const confirm = window.confirm(
                    `⚠️ ACHTUNG: ARBEITSZEITGESETZ!\n\n` +
                    `Diese Schicht geht über ${duration.toFixed(1)} Stunden.\n` +
                    `Erlaubt sind maximal ${compliance.maxDailyHours} Stunden.\n\n` +
                    `Trotzdem speichern?`
                );
                if (!confirm) return;
            }
        }


        const sid = shiftId || Date.now();
        const path = `roster/${location.id}/${currentYearWeek}/shifts/${uid}/${date}/${sid}`;

        await update(ref(db), {
            [path]: { start, end, activity: finalActivity, confirmed: false }
        });
        setShowShiftModal(false);
    };

    const handleDeleteShift = async () => {
        if (!modalData?.shiftId) return;
        if (!window.confirm("Schicht löschen?")) return;
        const { uid, date, shiftId } = modalData;
        const path = `roster/${location.id}/${currentYearWeek}/shifts/${uid}/${date}/${shiftId}`;
        await remove(ref(db, path));
        setShowShiftModal(false);
    };

    // --- RENDER ---
    if (!location) return <div>Kein Standort.</div>;

    const cellStyle = {
        padding: '10px',
        borderRight: '1px solid rgba(255,255,255,0.05)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        verticalAlign: 'top',
        minHeight: '100px',
        position: 'relative'
    };

    return (
        <div className="glass-panel" style={{ padding: '0', height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text-main, #fff)', overflow: 'hidden' }}>

            {/* TOOLBAR */}
            <div style={{ padding: '15px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)' }}>
                <div>
                    <h2 style={{ margin: 0 }}>📅 Dienstplan: {location.name}</h2>
                    <div style={{ opacity: 0.6, fontSize: '0.9rem' }}>KW {getWeekNumber(new Date()) + weekOffset} • Matrix Ansicht (Gastromatic Style)</div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => setWeekOffset(weekOffset - 1)} className="login-button" style={{ padding: '8px 16px' }}>◀</button>
                    <button onClick={() => setWeekOffset(weekOffset + 1)} className="login-button" style={{ padding: '8px 16px' }}>▶</button>
                </div>
            </div>

            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

                {/* 1. SIDEBAR (Employees) */}
                <div style={{ width: '220px', borderRight: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.1)' }}>
                    <div style={{ padding: '15px', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Mitarbeiter ({employees.length})</div>
                    <div style={{ flex: 1, overflowY: 'auto', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {employees.map(emp => (
                            <div
                                key={emp.uid}
                                draggable
                                onDragStart={(e) => handleDragStart(e, emp)}
                                style={{
                                    padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', cursor: 'grab',
                                    display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid transparent',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                    {emp.name?.[0]}
                                </div>
                                <div style={{ overflow: 'hidden' }}>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{emp.name}</div>
                                    <div style={{ fontSize: '0.7rem', opacity: 0.5 }}>{emp.role || 'Service'}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 2. MATRIX GRID */}
                <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ minWidth: '1000px', display: 'grid', gridTemplateColumns: '150px repeat(7, 1fr)' }}>

                        {/* HEADER: DAYS & KPIs */}
                        <div style={{ padding: '15px', background: 'rgba(255,255,255,0.05)', borderBottom: '2px solid rgba(255,255,255,0.1)', fontWeight: 'bold' }}>Bereich</div>
                        {weekDates.map((date, i) => {
                            const stats = calculateDailyStats(date);
                            const isHighRatio = stats.ratio > 30; // 30% rule
                            return (
                                <div key={date} style={{ padding: '10px', background: 'rgba(255,255,255,0.05)', borderBottom: '2px solid rgba(255,255,255,0.1)', borderLeft: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                                    <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>{weekDaysNames[i]}</div>
                                    <div style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: '5px' }}>{date.split('-').slice(1).join('.')}</div>

                                    {/* Quick Stats */}
                                    <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '4px', padding: '4px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '5px' }}>
                                            <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>Umsatz:</span>
                                            <input
                                                type="text"
                                                value={stats.revenue || ''}
                                                onChange={e => updateRevenue(date, e.target.value)}
                                                placeholder="0€"
                                                style={{ width: '50px', background: 'transparent', border: 'none', color: '#fff', fontSize: '0.75rem', textAlign: 'right', fontWeight: 'bold' }}
                                            />
                                        </div>
                                        <div style={{ fontSize: '0.7rem', marginTop: '2px' }}>
                                            Kosten: {stats.dailyCost.toFixed(0)}€
                                            <span style={{ marginLeft: '5px', fontWeight: 'bold', color: isHighRatio ? '#ef4444' : '#10b981' }}>
                                                ({stats.ratio.toFixed(1)}%)
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {/* MATRIX ROWS */}
                        {DEPARTMENTS.map(dept => (
                            <React.Fragment key={dept}>
                                {/* Row Header */}
                                <div style={{ padding: '15px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.1)', borderRight: '1px solid rgba(255,255,255,0.1)', fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--primary)' }}>
                                    {dept}
                                </div>

                                {/* Row Cells (Days) */}
                                {weekDates.map(date => {
                                    // Filter shifts for this Day AND this Dept
                                    const shiftsRaw = roster.shifts || {};
                                    const cellShifts = [];

                                    // Search ALL users for shifts on this date matching this dept/activity
                                    Object.keys(shiftsRaw).forEach(uid => {
                                        const userDayShifts = shiftsRaw[uid]?.[date];
                                        if (userDayShifts) {
                                            Object.entries(userDayShifts).forEach(([sid, s]) => {
                                                // Check if activity belongs to Dept
                                                const acts = ACTIVITIES[dept] || [];
                                                // If exact match or if custom (Spezifiziert) was created under this dept? 
                                                // Simplification: We check if Activity string is in the list, OR we need stored Dept. 
                                                // For now, let's just check if Activity is in the list.
                                                if (acts.includes(s.activity) || (s.activity === 'Spezifiziert' /* logic needed */)) {
                                                    // Simplified: We assume drag-drop sets the correct activity context. 
                                                    // Real-world: Might need 'department' field in DB. 
                                                    // For this demo: Check if activity matches expected list for this dept.
                                                    cellShifts.push({ ...s, sid, uid, empName: employees.find(e => e.uid === uid)?.name });
                                                }
                                            });
                                        }
                                    });

                                    // SORTING: Chronological by start time
                                    cellShifts.sort((a, b) => a.start.localeCompare(b.start));

                                    return (
                                        <div
                                            key={`${dept}-${date}`}
                                            onDragOver={handleDragOver}
                                            onDrop={(e) => handleDrop(e, date, dept)}
                                            style={cellStyle}
                                        >
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                                {cellShifts.map(shift => (
                                                    <div
                                                        key={shift.sid}
                                                        onClick={() => openShiftModal(shift.uid, date, shift.sid, shift, dept)}
                                                        style={{
                                                            background: 'var(--primary)', color: '#000', padding: '6px', borderRadius: '4px', fontSize: '0.75rem',
                                                            cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                                        }}
                                                    >
                                                        <div style={{ fontWeight: 'bold' }}>{shift.start}-{shift.end}</div>
                                                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{shift.empName}</div>
                                                    </div>
                                                ))}
                                                {/* Drop Target Hint */}
                                                {draggedUser && (
                                                    <div style={{ height: '100%', border: '1px dashed rgba(255,255,255,0.2)', borderRadius: '4px', minHeight: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
                                                        +
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            </div>

            {/* EDIT MODAL */}
            {showShiftModal && modalData && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
                    <div style={{ background: 'var(--bg-card)', padding: '25px', borderRadius: '16px', width: '90%', maxWidth: '400px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <h3 style={{ marginTop: 0 }}>Schichtplan: {modalData.dept}</h3>
                        <p style={{ opacity: 0.7 }}>{modalData.empName} am {modalData.date}</p>

                        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '0.8rem', display: 'block' }}>Start</label>
                                <input type="time" value={modalData.start} onChange={e => setModalData({ ...modalData, start: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #555', background: '#333', color: '#fff' }} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '0.8rem', display: 'block' }}>Ende</label>
                                <input type="time" value={modalData.end} onChange={e => setModalData({ ...modalData, end: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #555', background: '#333', color: '#fff' }} />
                            </div>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ fontSize: '0.8rem', display: 'block' }}>Tätigkeit</label>
                            <select value={modalData.activity} onChange={e => setModalData({ ...modalData, activity: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #555', background: '#333', color: '#fff' }}>
                                {activitiesForDept(modalData.dept).map(a => <option key={a} value={a}>{a}</option>)}
                            </select>
                        </div>

                        <div style={{ display: 'flex', gap: '10px' }}>
                            {modalData.shiftId && (
                                <button onClick={handleDeleteShift} style={{ padding: '10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Löschen</button>
                            )}
                            <button onClick={handleSaveShift} style={{ flex: 1, padding: '10px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Speichern</button>
                            <button onClick={() => setShowShiftModal(false)} style={{ padding: '10px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Abbrechen</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

}
