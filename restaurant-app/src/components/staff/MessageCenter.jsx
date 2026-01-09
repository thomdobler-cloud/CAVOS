import React, { useState, useEffect } from 'react';
import { ref, push, onValue, update } from 'firebase/database';
import { db } from '../../firebase';

export default function MessageCenter({ currentUser }) {
    // view: 'inbox' | 'compose'
    const [view, setView] = useState('inbox');
    const [messages, setMessages] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    // Compose State
    const [selectedRecipients, setSelectedRecipients] = useState([]); // Array of UIDs
    const [messageSubject, setMessageSubject] = useState('');
    const [messageText, setMessageText] = useState('');
    const [sending, setSending] = useState(false);

    // Load Messages & Users
    useEffect(() => {
        // 1. Listen for Messages
        const broadcastRef = ref(db, 'messages/broadcasts');
        const unsubBroadcast = onValue(broadcastRef, (snap) => {
            const data = snap.val();
            const broadcasts = data ? Object.entries(data).map(([id, val]) => ({ id, type: 'broadcast', ...val })) : [];

            if (currentUser) {
                const directRef = ref(db, `messages/direct/${currentUser.uid}`);
                onValue(directRef, (directSnap) => {
                    const dData = directSnap.val();
                    const directMsgs = dData ? Object.entries(dData).map(([id, val]) => ({ id, type: 'direct', ...val })) : [];
                    const all = [...broadcasts, ...directMsgs].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                    setMessages(all);
                    setLoading(false);
                });
            } else {
                setMessages(broadcasts);
                setLoading(false);
            }
        });

        // 2. Load Users for Compose
        const usersRef = ref(db, 'users');
        const unsubUsers = onValue(usersRef, (snap) => {
            const data = snap.val();
            if (data) {
                setUsers(Object.entries(data).map(([uid, val]) => ({ uid, ...val })));
            }
        });

        return () => { unsubBroadcast(); unsubUsers(); };
    }, [currentUser]);

    // Role Grouping Logic (Mirrored from ShiftPlanner)
    const getDepartment = (role) => {
        const r = String(role || '').toLowerCase().trim();
        if (['service', 'waiter', 'kellner', 'bar_manager', 'barkeeper', 'reception', 'reservations', 'phone', 'theke'].includes(r)) return '🤵 Service';
        if (['head_chef', 'kitchen', 'commi', 'kitchen_help', 'dishwasher', 'spüler', 'koch', 'küchenhilfe'].includes(r)) return '👨‍🍳 Küche';
        if (['stock', 'lager', 'logistik', 'fahrer', 'driver'].includes(r)) return '📦 Lager';
        if (['cleaner', 'cleaning', 'reinigung', 'housekeeping'].includes(r)) return '🧹 Reinigung';
        if (['cloakroom', 'garderobe', 'restroom', 'wc', 'toilet'].includes(r)) return '🧥 Garderobe & WC';
        if (['admin', 'ceo', 'manager', 'office', 'accounting', 'buchhaltung', 'chef', 'inhaber', 'geschäftsführer', 'owner', 'boss'].some(k => r.includes(k))) return '👨‍💼 Management';
        return '📌 Sonstiges';
    };

    const DEPT_ORDER = ['🤵 Service', '👨‍🍳 Küche', '📦 Lager', '🧹 Reinigung', '🧥 Garderobe & WC', '👨‍💼 Management', '📌 Sonstiges'];

    const groupedUsers = users.reduce((acc, user) => {
        const dept = getDepartment(user.role);
        if (!acc[dept]) acc[dept] = [];
        acc[dept].push(user);
        return acc;
    }, {});

    // Selection Handlers
    const toggleRecipient = (uid) => {
        if (selectedRecipients.includes(uid)) {
            setSelectedRecipients(selectedRecipients.filter(id => id !== uid));
        } else {
            setSelectedRecipients([...selectedRecipients, uid]);
        }
    };

    const toggleGroup = (dept) => {
        const usersInGroup = groupedUsers[dept] || [];
        const allIds = usersInGroup.map(u => u.uid);
        const allSelected = allIds.every(id => selectedRecipients.includes(id));

        if (allSelected) {
            // Deselect all in group
            setSelectedRecipients(selectedRecipients.filter(id => !allIds.includes(id)));
        } else {
            // Select all in group (merge unique)
            const newSet = new Set([...selectedRecipients, ...allIds]);
            setSelectedRecipients(Array.from(newSet));
        }
    };

    const selectAll = () => {
        if (selectedRecipients.length === users.length) {
            setSelectedRecipients([]);
        } else {
            setSelectedRecipients(users.map(u => u.uid));
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        setSending(true);

        const newMsg = {
            subject: messageSubject,
            text: messageText,
            sender: currentUser.email,
            senderName: currentUser.displayName || currentUser.email,
            timestamp: new Date().toISOString(),
            read: false
        };

        try {
            // Smart Sending: If ALL users are selected => Broadcast
            if (selectedRecipients.length === users.length && users.length > 0) {
                await push(ref(db, 'messages/broadcasts'), newMsg);
            } else {
                // Multi Direct
                if (selectedRecipients.length === 0) throw new Error("Kein Empfänger gewählt");

                const promises = selectedRecipients.map(uid =>
                    push(ref(db, `messages/direct/${uid}`), newMsg)
                );
                await Promise.all(promises);
            }

            alert("Nachricht gesendet! 🚀");
            setView('inbox');
            setMessageSubject('');
            setMessageText('');
            setSelectedRecipients([]);
        } catch (err) {
            console.error(err);
            alert("Fehler: " + err.message);
        }
        setSending(false);
    };

    if (loading) return <div style={{ padding: '20px' }}>Lade Nachrichten...</div>;

    return (
        <div style={{ padding: '20px', color: 'var(--text-main, white)', maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ margin: 0 }}>💬 Nachrichten Zentrale</h2>
                {view === 'inbox' && (
                    <button
                        onClick={() => setView('compose')}
                        style={{
                            background: 'var(--primary)', color: 'white', border: 'none',
                            padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold'
                        }}
                    >
                        ✏️ Neue Nachricht
                    </button>
                )}
                {view === 'compose' && (
                    <button
                        onClick={() => setView('inbox')}
                        style={{
                            background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none',
                            padding: '10px 20px', borderRadius: '8px', cursor: 'pointer'
                        }}
                    >
                        ❌ Abbrechen
                    </button>
                )}
            </div>

            {/* INBOX VIEW */}
            {view === 'inbox' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {messages.length === 0 ? (
                        <div style={{ opacity: 0.5, textAlign: 'center', marginTop: '50px' }}>Keine Nachrichten vorhanden.</div>
                    ) : (
                        messages.map(msg => (
                            <div key={msg.id} className="glass-panel" style={{ padding: '20px', borderLeft: msg.type === 'broadcast' ? '4px solid #f59e0b' : '4px solid var(--primary)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                    <span style={{
                                        background: msg.type === 'broadcast' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                                        color: msg.type === 'broadcast' ? '#fbbf24' : '#60a5fa',
                                        padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold'
                                    }}>
                                        {msg.type === 'broadcast' ? '📢 AN ALLE' : `👤DIREKT`}
                                    </span>
                                    <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                                        {new Date(msg.timestamp).toLocaleString()}
                                    </span>
                                </div>
                                <h3 style={{ margin: '0 0 10px 0', fontSize: '1.1rem' }}>{msg.subject}</h3>
                                <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5', opacity: 0.9 }}>{msg.text}</p>
                                <div style={{ marginTop: '15px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '10px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                    Von: {msg.senderName}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* COMPOSE VIEW */}
            {view === 'compose' && (
                <form onSubmit={handleSendMessage} className="glass-panel" style={{ padding: '30px' }}>

                    {/* RECIPIENT SELECTION */}
                    <div style={{ marginBottom: '25px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <label style={{ fontWeight: 'bold' }}>Empfänger wählen:</label>
                            <button
                                type="button"
                                onClick={selectAll}
                                style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.3)', color: 'white', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                            >
                                {selectedRecipients.length === users.length ? 'Alle abwählen' : 'Alle auswählen'}
                            </button>
                        </div>

                        <div style={{ maxHeight: '300px', overflowY: 'auto', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                            {DEPT_ORDER.map(dept => {
                                const deptUsers = groupedUsers[dept] || [];
                                if (deptUsers.length === 0) return null;
                                const isGroupSelected = deptUsers.every(u => selectedRecipients.includes(u.uid));

                                return (
                                    <div key={dept} style={{ marginBottom: '15px' }}>
                                        <div
                                            onClick={() => toggleGroup(dept)}
                                            style={{
                                                cursor: 'pointer', fontWeight: 'bold', color: 'var(--primary)', fontSize: '0.9rem', marginBottom: '5px',
                                                display: 'flex', alignItems: 'center', gap: '8px'
                                            }}
                                        >
                                            <div style={{ width: '14px', height: '14px', border: '1px solid currentColor', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '3px' }}>
                                                {isGroupSelected && <div style={{ width: '8px', height: '8px', background: 'currentColor' }} />}
                                            </div>
                                            {dept}
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px', paddingLeft: '10px' }}>
                                            {deptUsers.map(u => {
                                                const isSelected = selectedRecipients.includes(u.uid);
                                                return (
                                                    <div
                                                        key={u.uid}
                                                        onClick={() => toggleRecipient(u.uid)}
                                                        style={{
                                                            display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', borderRadius: '6px', cursor: 'pointer',
                                                            background: isSelected ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                                                            border: isSelected ? '1px solid rgba(59, 130, 246, 0.5)' : '1px solid transparent'
                                                        }}
                                                    >
                                                        <div style={{
                                                            width: '18px', height: '18px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.4)',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            background: isSelected ? 'var(--primary)' : 'transparent'
                                                        }}>
                                                            {isSelected && <span style={{ fontSize: '0.7rem' }}>✓</span>}
                                                        </div>
                                                        <span style={{ fontSize: '0.85rem' }}>{u.name || u.email}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div style={{ fontSize: '0.8rem', marginTop: '5px', color: 'var(--text-muted)' }}>
                            {selectedRecipients.length} Empfänger ausgewählt
                        </div>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '5px' }}>Betreff:</label>
                        <input
                            required
                            type="text"
                            value={messageSubject}
                            onChange={e => setMessageSubject(e.target.value)}
                            style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.3)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px' }}
                            placeholder="Worum geht es?"
                        />
                    </div>

                    <div style={{ marginBottom: '30px' }}>
                        <label style={{ display: 'block', marginBottom: '5px' }}>Nachricht:</label>
                        <textarea
                            required
                            value={messageText}
                            onChange={e => setMessageText(e.target.value)}
                            style={{ width: '100%', minHeight: '150px', padding: '10px', background: 'rgba(0,0,0,0.3)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', resize: 'vertical' }}
                            placeholder="Deine Nachricht..."
                        />
                    </div>

                    <div style={{ textAlign: 'right' }}>
                        <button
                            type="submit"
                            disabled={sending || selectedRecipients.length === 0}
                            style={{
                                background: 'var(--primary)', color: 'white', border: 'none',
                                padding: '12px 30px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem',
                                opacity: (sending || selectedRecipients.length === 0) ? 0.5 : 1
                            }}
                        >
                            {sending ? 'Sende...' : '📩 Nachricht Absenden'}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}
