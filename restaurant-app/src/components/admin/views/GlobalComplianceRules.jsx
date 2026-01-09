import React, { useState, useEffect } from 'react';
import { ref, update, onValue } from 'firebase/database';
import { db } from '../../../firebase';

export default function GlobalComplianceRules() {
    const [rules, setRules] = useState({
        maxDailyHours: 10,
        minRestPeriod: 11,
        minBreak6h: 30,
        minBreak9h: 45,
        maxSundaysPerYear: 15,
        // MTV Extended
        nightSurcharge: 0,
        holidaySurcharge: 0,
        overtimeSurchargeStart: 0, // e.g. 30 (hours/month)
        stdVacationDays: 0,
        holidayPay: 0, // € per day
        christmasBonusMode: 'none', // 'none', '13th_salary', 'fixed'
        enforceStrictCompliance: false
    });
    const [loading, setLoading] = useState(true);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        const rulesRef = ref(db, 'settings/compliance');
        const unsub = onValue(rulesRef, (snap) => {
            const data = snap.val();
            if (data) setRules(data);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const handleChange = (field, value) => {
        // Handle boolean toggles or numeric inputs
        const val = (typeof value === 'boolean') ? value : (field === 'christmasBonusMode' ? value : parseFloat(value));
        setRules(prev => ({ ...prev, [field]: val }));
    };

    const handleSave = async () => {
        await update(ref(db, 'settings/compliance'), rules);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const applyMTV_BW = () => {
        setRules({
            maxDailyHours: 10,
            minRestPeriod: 11,
            minBreak6h: 30,
            minBreak9h: 45,
            maxSundaysPerYear: 15,
            nightSurcharge: 25,
            holidaySurcharge: 125,

            // New MTV BW Values
            overtimeTier1: 25,          // 1. bis 13. Überstunde
            overtimeTier2: 35,          // 14. bis 29. Überstunde
            overtimeTier3: 50,          // ab 30. Überstunde

            stdVacationDays: 25,        // 25 Tage bei 5-Tage-Woche
            holidayPay: 15,             // Beispielwert für Urlaubsgeld/Tag
            christmasBonusMode: 'fixed', // Jahressonderzuwendung
            enforceStrictCompliance: true // "Gesetzeskonforme Planung"
        });
        alert("Manteltarifvertrag BW (Vollständig) geladen! 🦁\n(Bitte speichern klicken)");
    };

    if (loading) return <div style={{ padding: '20px' }}>Lade Gesetze...</div>;

    return (
        <div style={{ padding: '20px', color: '#fff', maxWidth: '800px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
                <h2 style={{ margin: 0 }}>§ Arbeitsrecht & Tarife</h2>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={applyMTV_BW}
                        style={{ background: '#eab308', border: 'none', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', color: 'black', fontWeight: 'bold' }}
                    >
                        📜 Preset: MTV BW Vollständig
                    </button>
                </div>
            </div>

            {/* Strict Mode Toggle */}
            <div style={{ background: rules.enforceStrictCompliance ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '8px', margin: '20px 0', border: rules.enforceStrictCompliance ? '1px solid #ef4444' : '1px solid #444', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <h3 style={{ margin: '0 0 5px 0', color: rules.enforceStrictCompliance ? '#fca5a5' : '#fff' }}>🛡️ Strict Enforcement Mode</h3>
                    <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.7 }}>Blockiert das Speichern von Schichten, die gegen Gesetze verstoßen.</p>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input
                        type="checkbox"
                        checked={rules.enforceStrictCompliance || false}
                        onChange={(e) => handleChange('enforceStrictCompliance', e.target.checked)}
                        style={{ width: '20px', height: '20px' }}
                    />
                    <span style={{ fontWeight: 'bold' }}>Aktivieren</span>
                </label>
            </div>

            <p style={{ opacity: 0.7, marginBottom: '20px', marginTop: '10px' }}>
                Diese Regeln werden bei der Schichtplanung automatisch geprüft.
                <br />
                <a href="https://www.zoll.de/SharedDocs/Downloads/DE/Links-fuer-Inhaltseiten/Fachthemen/Arbeit/hotel_manteltarifvertrag_baden_wuert_20240515.pdf?__blob=publicationFile&v=3" target="_blank" rel="noreferrer" style={{ color: '#3b82f6', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                    📄 Original-Vertrag (PDF) ansehen
                </a>
            </p>



            <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>

                {/* Max Hours */}
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '12px' }}>
                    <h3 style={{ marginTop: 0 }}>Tägliche Höchstarbeitszeit</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <input
                            type="number"
                            value={rules.maxDailyHours}
                            onChange={e => handleChange('maxDailyHours', e.target.value)}
                            style={{ padding: '10px', borderRadius: '6px', border: '1px solid #555', background: '#222', color: '#fff', width: '80px', fontSize: '1.2rem' }}
                        />
                        <span style={{ fontSize: '1.2rem' }}>Stunden</span>
                    </div>
                    <p style={{ fontSize: '0.8rem', opacity: 0.6, marginTop: '10px' }}>
                        MTV BW: 10 Stunden (im Ausgleichszeitraum).
                    </p>
                </div>

                {/* Rest Period */}
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '12px' }}>
                    <h3 style={{ marginTop: 0 }}>Mindestruhezeit</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <input
                            type="number"
                            value={rules.minRestPeriod}
                            onChange={e => handleChange('minRestPeriod', e.target.value)}
                            style={{ padding: '10px', borderRadius: '6px', border: '1px solid #555', background: '#222', color: '#fff', width: '80px', fontSize: '1.2rem' }}
                        />
                        <span style={{ fontSize: '1.2rem' }}>Stunden</span>
                    </div>
                    <p style={{ fontSize: '0.8rem', opacity: 0.6, marginTop: '10px' }}>
                        Ruhezeit zwischen zwei Schichten.
                    </p>
                </div>

                {/* Breaks Section */}
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '12px', gridColumn: '1 / -1' }}>
                    <h3 style={{ marginTop: 0 }}>Pausenregelungen</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '5px' }}>Bei &gt; 6 Stunden Arbeit</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <input
                                    type="number"
                                    value={rules.minBreak6h}
                                    onChange={e => handleChange('minBreak6h', e.target.value)}
                                    style={{ padding: '8px', borderRadius: '6px', border: '1px solid #555', background: '#222', color: '#fff', width: '70px' }}
                                />
                                <span>Minuten</span>
                            </div>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '5px' }}>Bei &gt; 9 Stunden Arbeit</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <input
                                    type="number"
                                    value={rules.minBreak9h}
                                    onChange={e => handleChange('minBreak9h', e.target.value)}
                                    style={{ padding: '8px', borderRadius: '6px', border: '1px solid #555', background: '#222', color: '#fff', width: '70px' }}
                                />
                                <span>Minuten</span>
                            </div>
                        </div>
                    </div>
                </div>



                {/* Surcharges Section (Modified for detailed MTV) */}
                <div style={{ background: 'rgba(234, 179, 8, 0.1)', padding: '20px', borderRadius: '12px', gridColumn: '1 / -1', border: '1px solid #eab308' }}>
                    <h3 style={{ marginTop: 0, color: '#eab308' }}>💰 Zuschläge (Manteltarifvertrag)</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '5px' }}>Nachtarbeit (23:00-06:00)</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <input
                                    type="number"
                                    value={rules.nightSurcharge || 0}
                                    onChange={e => handleChange('nightSurcharge', e.target.value)}
                                    style={{ padding: '8px', borderRadius: '6px', border: '1px solid #555', background: '#222', color: '#fff', width: '60px' }}
                                />
                                <span>%</span>
                            </div>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '5px' }}>Feiertagsarbeit</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <input
                                    type="number"
                                    value={rules.holidaySurcharge || 0}
                                    onChange={e => handleChange('holidaySurcharge', e.target.value)}
                                    style={{ padding: '8px', borderRadius: '6px', border: '1px solid #555', background: '#222', color: '#fff', width: '60px' }}
                                />
                                <span>%</span>
                            </div>
                        </div>
                    </div>

                    {/* Overtime Tiers */}
                    <div style={{ marginTop: '15px', padding: '15px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                        <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>Mehrarbeitszuschläge (Monatlich)</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
                            <div>
                                <label style={{ fontSize: '0.8rem', display: 'block', opacity: 0.7 }}>1. - 13. Std.</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <input
                                        type="number"
                                        value={rules.overtimeTier1 || 0}
                                        onChange={e => handleChange('overtimeTier1', e.target.value)}
                                        style={{ padding: '8px', borderRadius: '6px', border: '1px solid #555', background: '#222', color: '#fff', width: '50px' }}
                                    />
                                    <span>%</span>
                                </div>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.8rem', display: 'block', opacity: 0.7 }}>14. - 29. Std.</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <input
                                        type="number"
                                        value={rules.overtimeTier2 || 0}
                                        onChange={e => handleChange('overtimeTier2', e.target.value)}
                                        style={{ padding: '8px', borderRadius: '6px', border: '1px solid #555', background: '#222', color: '#fff', width: '50px' }}
                                    />
                                    <span>%</span>
                                </div>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.8rem', display: 'block', opacity: 0.7 }}>ab 30. Std.</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <input
                                        type="number"
                                        value={rules.overtimeTier3 || 0}
                                        onChange={e => handleChange('overtimeTier3', e.target.value)}
                                        style={{ padding: '8px', borderRadius: '6px', border: '1px solid #555', background: '#222', color: '#fff', width: '50px' }}
                                    />
                                    <span>%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ marginTop: '30px' }}>
                    <button
                        onClick={handleSave}
                        style={{
                            background: '#10b981', color: '#fff', border: 'none', padding: '12px 25px',
                            borderRadius: '8px', fontSize: '1rem', cursor: 'pointer', fontWeight: 'bold',
                            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                        }}
                    >
                        {saved ? 'Gespeichert! ✅' : 'Einstellungen speichern'}
                    </button>
                </div>
            </div>
        </div>
    );
}
