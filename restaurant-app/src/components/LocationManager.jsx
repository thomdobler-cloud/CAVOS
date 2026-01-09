import React, { useState, useEffect } from 'react';
import { ref, push, onValue, remove, update } from 'firebase/database';
import { db } from '../firebase';

export default function LocationManager() {
    const [locations, setLocations] = useState([]);
    // Initial state matches existing German DB schema
    const initialState = {
        standortNummer: '',
        firmenname: '',
        name: '', // Internal name (e.g. "CAVOS Stuttgart")
        rechtsform: '',
        geschaeftsfuehrer: '',
        strasse: '',
        hausnummer: '',
        plz: '',
        ort: '',
        land: 'Deutschland',
        email: '',
        telefon: '',
        fax: '',
        website: '',
        registergericht: '',
        handelsregister: '', // HRB Number
        ustIdNr: '',
        steuernummer: '',
        bankName: '',
        iban: '',
        bic: '',
        oeffnungszeiten: '',
        notizen: '',
        lat: '', // GPS Latitude
        lng: '', // GPS Longitude
        isActive: true
    };
    const [formData, setFormData] = useState(initialState);
    const [editingId, setEditingId] = useState(null);

    useEffect(() => {
        const locationsRef = ref(db, 'locations');
        const unsubscribe = onValue(locationsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setLocations(Object.entries(data).map(([id, val]) => ({ id, ...val })));
            } else {
                setLocations([]);
            }
        });
        return () => unsubscribe();
    }, []);

    const handleChange = (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setFormData({ ...formData, [e.target.name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const payload = {
            ...formData,
            updatedAt: new Date().toISOString()
        };

        if (editingId) {
            await update(ref(db, `locations/${editingId}`), payload);
            setEditingId(null);
        } else {
            payload.createdAt = new Date().toISOString();
            await push(ref(db, 'locations'), payload);
        }
        setFormData(initialState);
    };

    const handleEdit = (loc) => {
        setFormData(loc);
        setEditingId(loc.id);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Standort wirklich löschen?')) {
            await remove(ref(db, `locations/${id}`));
        }
    };

    const inputStyle = {
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        borderRadius: '12px',
        padding: '12px 15px',
        color: '#fff',
        fontSize: '0.95rem',
        outline: 'none',
        width: '100%',
        transition: 'all 0.2s',
        backdropFilter: 'blur(5px)'
    };

    const buttonStyle = {
        background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.2), rgba(37, 99, 235, 0.1))',
        border: 'none',
        borderRadius: '12px',
        padding: '12px 24px',
        color: '#fff',
        cursor: 'pointer',
        fontWeight: '600',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 4px 15px rgba(37, 99, 235, 0.15)',
        transition: 'all 0.2s'
    };

    return (
        <div className="glass-panel" style={{ padding: '30px', marginTop: '30px', background: 'transparent', border: 'none', boxShadow: 'none' }}>

            <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '40px', background: 'rgba(255,255,255,0.02)', padding: '30px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <h2 style={{ gridColumn: '1 / -1', marginBottom: '10px', color: 'var(--primary)', fontSize: '1.5rem', letterSpacing: '-0.02em' }}>Standort bearbeiten</h2>

                {/* Basisdaten */}
                <div style={{ gridColumn: '1 / -1', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px', marginTop: '10px', color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Basisdaten</div>

                <input name="standortNummer" placeholder="Standort-Nr." value={formData.standortNummer} onChange={handleChange} style={inputStyle} />
                <input name="name" placeholder="Interner Name (z.B. Berlin)" value={formData.name || ''} onChange={handleChange} style={inputStyle} required />
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#fff' }}>
                    <input type="checkbox" name="isActive" checked={formData.isActive} onChange={handleChange} style={{ width: '20px', height: '20px', accentColor: 'var(--primary)' }} />
                    <label style={{ fontSize: '0.9rem' }}>Aktiv</label>
                </div>

                {/* Firmendaten */}
                <div style={{ gridColumn: '1 / -1', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px', marginTop: '20px', color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Firmendaten</div>

                <input name="firmenname" placeholder="Offizieller Firmenname" value={formData.firmenname || ''} onChange={handleChange} style={{ ...inputStyle, gridColumn: 'span 2' }} required />
                <input name="rechtsform" placeholder="Rechtsform (z.B. GmbH)" value={formData.rechtsform || ''} onChange={handleChange} style={inputStyle} />
                <input name="geschaeftsfuehrer" placeholder="Geschäftsführer" value={formData.geschaeftsfuehrer || ''} onChange={handleChange} style={{ ...inputStyle, gridColumn: 'span 3' }} required />

                {/* Adresse */}
                <div style={{ gridColumn: '1 / -1', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px', marginTop: '20px', color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Anschrift</div>

                <input name="strasse" placeholder="Straße" value={formData.strasse || ''} onChange={handleChange} style={{ ...inputStyle, gridColumn: 'span 2' }} required />
                <input name="hausnummer" placeholder="Nr." value={formData.hausnummer || ''} onChange={handleChange} style={inputStyle} required />

                <input name="plz" placeholder="PLZ" value={formData.plz || ''} onChange={handleChange} style={inputStyle} required />
                <input name="ort" placeholder="Ort" value={formData.ort || ''} onChange={handleChange} style={inputStyle} required />
                <input name="land" placeholder="Land" value={formData.land || 'Deutschland'} onChange={handleChange} style={inputStyle} />

                {/* GPS / Geofence */}
                <div style={{ gridColumn: '1 / -1', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px', marginTop: '20px', color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>GPS Koordinaten (Für Stempeluhr)</div>
                <input name="lat" type="number" placeholder="Breitengrad (Lat)" value={formData.lat || ''} onChange={handleChange} style={inputStyle} />
                <input name="lng" type="number" placeholder="Längengrad (Lng)" value={formData.lng || ''} onChange={handleChange} style={inputStyle} />

                <button type="button" onClick={() => {
                    if (!navigator.geolocation) return alert('Geolocatiion wird nicht unterstützt.');
                    navigator.geolocation.getCurrentPosition(
                        pos => setFormData(prev => ({ ...prev, lat: pos.coords.latitude, lng: pos.coords.longitude })),
                        err => alert('Fehler: ' + err.message)
                    );
                }} style={{ ...buttonStyle, gridColumn: 'span 1', background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', boxShadow: 'none' }}>
                    📍 Aktuelle Position setzen
                </button>

                {/* Kontakt */}
                <div style={{ gridColumn: '1 / -1', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px', marginTop: '20px', color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Kontakt</div>

                <input name="email" type="email" placeholder="E-Mail" value={formData.email || ''} onChange={handleChange} style={inputStyle} required />
                <input name="telefon" placeholder="Telefon" value={formData.telefon || ''} onChange={handleChange} style={inputStyle} />
                <input name="website" placeholder="Webseite" value={formData.website || ''} onChange={handleChange} style={inputStyle} />

                {/* Rechtliches & Finanz */}
                <div style={{ gridColumn: '1 / -1', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px', marginTop: '20px', color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Rechtliches & Bankverbindung</div>

                <input name="registergericht" placeholder="Registergericht" value={formData.registergericht || ''} onChange={handleChange} style={inputStyle} />
                <input name="handelsregister" placeholder="Registernummer (HRB)" value={formData.handelsregister || ''} onChange={handleChange} style={inputStyle} />
                <input name="ustIdNr" placeholder="USt-IdNr." value={formData.ustIdNr || ''} onChange={handleChange} style={inputStyle} />

                <input name="bankName" placeholder="Bankname" value={formData.bankName || ''} onChange={handleChange} style={inputStyle} />
                <input name="iban" placeholder="IBAN" value={formData.iban || ''} onChange={handleChange} style={inputStyle} />
                <input name="bic" placeholder="BIC" value={formData.bic || ''} onChange={handleChange} style={inputStyle} />

                {/* Sonstiges */}
                <div style={{ gridColumn: '1 / -1', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px', marginTop: '20px', color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Sonstiges</div>

                <textarea name="oeffnungszeiten" placeholder="Öffnungszeiten" value={formData.oeffnungszeiten || ''} onChange={handleChange} style={{ ...inputStyle, gridColumn: 'span 3', minHeight: '80px', fontFamily: 'inherit' }} />
                <textarea name="notizen" placeholder="Interne Notizen" value={formData.notizen || ''} onChange={handleChange} style={{ ...inputStyle, gridColumn: 'span 3', minHeight: '60px', fontFamily: 'inherit' }} />

                <button type="submit" style={{ ...buttonStyle, gridColumn: 'span 3', marginTop: '20px' }}
                    onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    {editingId ? 'Standort Aktualisieren' : 'Standort Speichern'}
                </button>
                {editingId && (
                    <button type="button" onClick={() => { setEditingId(null); setFormData(initialState) }} style={{ ...buttonStyle, gridColumn: 'span 3', background: 'transparent', boxShadow: 'none', color: 'var(--text-muted)' }}>
                        Abbrechen
                    </button>
                )}
            </form>

            <div style={{ display: 'grid', gap: '15px' }}>
                {locations.map(loc => (
                    <div key={loc.id} style={{
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01))',
                        backdropFilter: 'blur(10px)',
                        padding: '25px',
                        borderRadius: '20px',
                        border: '1px solid rgba(255,255,255,0.05)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
                    }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <strong style={{ color: '#fff', fontSize: '1.2rem', letterSpacing: '-0.02em' }}>{loc.firmenname}</strong>
                                {loc.name && <span style={{ background: 'rgba(37, 99, 235, 0.2)', color: 'var(--primary)', padding: '4px 10px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '600' }}>{loc.name}</span>}
                            </div>
                            <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', marginTop: '8px', lineHeight: '1.6' }}>
                                {loc.strasse} {loc.hausnummer}, {loc.plz} {loc.ort}<br />
                                <span style={{ color: 'rgba(255,255,255,0.4)' }}>GF: {loc.geschaeftsfuehrer}</span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
                            <button onClick={() => handleEdit(loc)} style={{ ...buttonStyle, padding: '8px 16px', fontSize: '0.9rem', background: 'rgba(255,255,255,0.1)', boxShadow: 'none' }}>Bearbeiten</button>
                            <button onClick={() => handleDelete(loc.id)} style={{ ...buttonStyle, padding: '8px 16px', fontSize: '0.9rem', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', boxShadow: 'none' }}>Löschen</button>
                        </div>
                    </div>
                ))}
                {locations.length === 0 && <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px' }}>Keine Standorte gefunden.</p>}
            </div>
        </div>
    );
}
