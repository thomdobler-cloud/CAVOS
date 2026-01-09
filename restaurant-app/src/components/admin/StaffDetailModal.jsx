import React, { useState } from 'react';
import { ref, update } from 'firebase/database';
import { db, storage } from '../../firebase';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';


export default function StaffDetailModal({ user, onClose }) {
    const [formData, setFormData] = useState({
        ...user,
        // Ensure defaults for critical fields
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        street: user.street || '',
        zip: user.zip || '',
        city: user.city || '',
        phone: user.phone || '',
        iban: user.iban || '',
        taxId: user.taxId || '',
        svNumber: user.svNumber || '',
        healthInsurance: user.healthInsurance || '',
        hourlyRate: user.hourlyRate || '',
        targetHours: user.targetHours || '',
        role: user.role || 'employee'
    });

    const [activeTab, setActiveTab] = useState('master'); // master, payroll, contract, documents

    const handleChange = (field, val) => {
        setFormData(prev => ({ ...prev, [field]: val }));
    };

    const handleSave = async () => {
        try {
            await update(ref(db, `users/${user.uid}`), formData);
            alert("Daten gespeichert! ✅");
        } catch (error) {
            console.error(error);
            alert("Fehler beim Speichern.");
        }
    };

    const handleFileUpload = async (e, isCamera) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const fileName = isCamera ? `scan_${Date.now()}.jpg` : file.name;
            const fileRef = storageRef(storage, `documents/${user.uid}/${fileName}`);

            // Upload
            alert("Upload läuft... bitte warten ⏳");
            const snapshot = await uploadBytes(fileRef, file);
            const url = await getDownloadURL(snapshot.ref);

            // Update Local & DB
            const newDocKey = fileName.replace(/[.#$/[\]]/g, '_'); // Sanitize key for Realtime DB
            const updatedDocs = { ...(formData.documents || {}), [fileName]: url }; // Use fileName for display, url for link

            // We use fileName as key for simplicity in display, though keys should technically be sanitized
            // Let's store object { "SanitizedName": URL }

            setFormData(prev => ({ ...prev, documents: updatedDocs }));

            // Immediate partial save to ensure link isn't lost
            await update(ref(db, `users/${user.uid}/documents`), updatedDocs);

            alert("Upload erfolgreich! ✅");
        } catch (error) {
            console.error("Upload Error:", error);
            alert("Fehler beim Upload: " + error.message);
        }
    };


    const ROLES = [
        { id: 'employee', label: 'Mitarbeiter (Standard)' },
        { id: 'manager', label: 'Betriebsleiter' },
        { id: 'admin', label: 'Globaler Admin' }
    ];

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
            <div style={{ background: 'var(--bg-card)', width: '90%', maxWidth: '800px', height: '85vh', borderRadius: '16px', display: 'flex', flexDirection: 'column', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>

                {/* HEADER */}
                <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{ width: '50px', height: '50px', background: '#3b82f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 'bold' }}>
                            {user.name?.[0] || '?'}
                        </div>
                        <div>
                            <h2 style={{ margin: 0 }}>{user.name || 'Unbekannt'}</h2>
                            <div style={{ opacity: 0.6, fontSize: '0.9rem' }}>Interne ID: {user.uid}</div>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
                </div>

                {/* TABS */}
                <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)' }}>
                    {['master', 'payroll', 'contract', 'documents'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            style={{
                                flex: 1, padding: '15px', background: 'transparent', border: 'none',
                                color: activeTab === tab ? '#3b82f6' : 'rgba(255,255,255,0.6)',
                                borderBottom: activeTab === tab ? '2px solid #3b82f6' : 'none',
                                cursor: 'pointer', fontWeight: 'bold'
                            }}
                        >
                            {tab === 'master' && '📝 Stammdaten'}
                            {tab === 'payroll' && '💶 Abrechnung'}
                            {tab === 'contract' && '🤝 Vertrag & Stunden'}
                            {tab === 'documents' && '📄 Dokumente'}
                        </button>
                    ))}
                </div>

                {/* CONTENT */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '25px' }}>

                    {/* MASTER DATA */}
                    {activeTab === 'master' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div className="form-group">
                                <label>Vorname</label>
                                <input type="text" value={formData.firstName} onChange={e => handleChange('firstName', e.target.value)} className="input-field" />
                            </div>
                            <div className="form-group">
                                <label>Nachname</label>
                                <input type="text" value={formData.lastName} onChange={e => handleChange('lastName', e.target.value)} className="input-field" />
                            </div>
                            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                <label>Straße & Hausnummer</label>
                                <input type="text" value={formData.street} onChange={e => handleChange('street', e.target.value)} className="input-field" />
                            </div>
                            <div className="form-group">
                                <label>PLZ</label>
                                <input type="text" value={formData.zip} onChange={e => handleChange('zip', e.target.value)} className="input-field" />
                            </div>
                            <div className="form-group">
                                <label>Ort</label>
                                <input type="text" value={formData.city} onChange={e => handleChange('city', e.target.value)} className="input-field" />
                            </div>
                            <div className="form-group">
                                <label>Telefon</label>
                                <input type="text" value={formData.phone} onChange={e => handleChange('phone', e.target.value)} className="input-field" />
                            </div>
                            <div className="form-group">
                                <label>E-Mail (Login)</label>
                                <input type="text" value={formData.email} disabled className="input-field" style={{ opacity: 0.5, cursor: 'not-allowed' }} />
                            </div>
                        </div>
                    )}

                    {/* PAYROLL */}
                    {activeTab === 'payroll' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div className="form-group">
                                <label>IBAN</label>
                                <input type="text" value={formData.iban} onChange={e => handleChange('iban', e.target.value)} className="input-field" />
                            </div>
                            <div className="form-group">
                                <label>Steuer-ID</label>
                                <input type="text" value={formData.taxId} onChange={e => handleChange('taxId', e.target.value)} className="input-field" />
                            </div>
                            <div className="form-group">
                                <label>Sozialversicherungsnummer (SV-Nr.)</label>
                                <input type="text" value={formData.svNumber} onChange={e => handleChange('svNumber', e.target.value)} className="input-field" />
                            </div>
                            <div className="form-group">
                                <label>Krankenkasse</label>
                                <input type="text" value={formData.healthInsurance} onChange={e => handleChange('healthInsurance', e.target.value)} className="input-field" />
                            </div>
                        </div>
                    )}

                    {/* CONTRACT */}
                    {activeTab === 'contract' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '8px' }}>
                                <h3 style={{ marginTop: 0 }}>📊 Berechnungsgrundlagen</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div className="form-group">
                                        <label>Stundenlohn (€)</label>
                                        <input
                                            type="number"
                                            value={formData.hourlyRate}
                                            onChange={e => handleChange('hourlyRate', e.target.value)}
                                            className="input-field"
                                            placeholder="z.B. 13.50"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Soll-Stunden / Monat</label>
                                        <input
                                            type="number"
                                            value={formData.targetHours}
                                            onChange={e => handleChange('targetHours', e.target.value)}
                                            className="input-field"
                                            placeholder="z.B. 40"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* MTV Entitlements (New) */}
                            <div style={{ background: 'rgba(234, 179, 8, 0.1)', padding: '20px', borderRadius: '8px', border: '1px solid #eab308' }}>
                                <h3 style={{ marginTop: 0, color: '#eab308' }}>🦁 MTV & Ansprüche</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px' }}>

                                    <div className="form-group">
                                        <label>Urlaubstage (Jahr)</label>
                                        <input
                                            type="number"
                                            value={formData.vacationDays || 25}
                                            onChange={e => handleChange('vacationDays', e.target.value)}
                                            className="input-field"
                                            placeholder="25"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Urlaubsgeld (€/Tag)</label>
                                        <input
                                            type="number"
                                            value={formData.holidayPay || 0}
                                            onChange={e => handleChange('holidayPay', e.target.value)}
                                            className="input-field"
                                            placeholder="z.B. 15.00"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Weihnachtsgeld</label>
                                        <select
                                            value={formData.christmasBonusMode || 'none'}
                                            onChange={e => handleChange('christmasBonusMode', e.target.value)}
                                            className="input-field"
                                            style={{ background: '#222' }}
                                        >
                                            <option value="none">Keine</option>
                                            <option value="fixed">Pauschal</option>
                                            <option value="13th_salary">13. Gehalt</option>
                                            <option value="mtv_scaled">MTV Staffelung</option>
                                        </select>
                                    </div>

                                </div>
                            </div>

                            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '8px' }}>
                                <h3 style={{ marginTop: 0 }}>🛡️ System-Rolle</h3>
                                <div className="form-group">
                                    <select value={formData.role} onChange={e => handleChange('role', e.target.value)} className="input-field" style={{ background: '#222' }}>
                                        {ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                                    </select>
                                    <p style={{ fontSize: '0.8rem', opacity: 0.6, marginTop: '5px' }}>Bestimmt den Zugriff auf Admin-Bereiche.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* DOCUMENTS */}
                    {activeTab === 'documents' && (
                        <div>
                            {/* Upload Controls */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                                <label style={{
                                    padding: '15px', background: 'rgba(255,255,255,0.1)', borderRadius: '12px',
                                    border: '1px dashed rgba(255,255,255,0.3)', cursor: 'pointer', textAlign: 'center',
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px'
                                }}>
                                    <span style={{ fontSize: '1.5rem' }}>📄</span>
                                    <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>Datei hochladen</span>
                                    <input type="file" onChange={(e) => handleFileUpload(e, false)} style={{ display: 'none' }} />
                                </label>

                                <label style={{
                                    padding: '15px', background: 'rgba(255,255,255,0.1)', borderRadius: '12px',
                                    border: '1px dashed rgba(255,255,255,0.3)', cursor: 'pointer', textAlign: 'center',
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px'
                                }}>
                                    <span style={{ fontSize: '1.5rem' }}>📸</span>
                                    <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>Kamera Scan</span>
                                    <input type="file" accept="image/*" capture="environment" onChange={(e) => handleFileUpload(e, true)} style={{ display: 'none' }} />
                                </label>
                            </div>

                            {/* Document List */}
                            <h4 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>Vorhandene Dokumente</h4>
                            {formData.documents ? (
                                <ul style={{ listStyle: 'none', padding: 0 }}>
                                    {Object.entries(formData.documents).map(([key, url]) => (
                                        <li key={key} style={{ padding: '10px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ opacity: 0.8 }}>{key}</span>
                                            <a href={url} target="_blank" rel="noreferrer" style={{
                                                background: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6',
                                                padding: '4px 10px', borderRadius: '4px', textDecoration: 'none', fontSize: '0.85rem'
                                            }}>
                                                Öffnen ↗
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div style={{ opacity: 0.5, textAlign: 'center', padding: '20px' }}>Keine Dokumente vorhanden.</div>
                            )}
                        </div>
                    )}

                </div>

                {/* FOOTER */}
                <div style={{ padding: '20px', borderTop: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button onClick={onClose} style={{ padding: '12px 25px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#fff', cursor: 'pointer' }}>Abbrechen</button>
                    <button onClick={handleSave} style={{ padding: '12px 25px', borderRadius: '8px', border: 'none', background: '#10b981', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>Speichern</button>
                </div>
            </div>
            <style>{`
                .form-group label { display: block; font-size: 0.85rem; margin-bottom: 5px; opacity: 0.8; }
                .input-field { width: 100%; padding: 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.3); color: white; font-size: 1rem; }
                .input-field:focus { outline: none; border-color: #3b82f6; }
            `}</style>
        </div>
    );
}
