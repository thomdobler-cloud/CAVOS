import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth, db, storage } from '../firebase';
import { ref as dbRef, update } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { createUserWithEmailAndPassword } from 'firebase/auth';

export default function Onboarding() {
    const navigate = useNavigate();
    const location = useLocation();
    const registerData = location.state?.registerData; // data from Step 1

    const [user, setUser] = useState(auth.currentUser); // might be null initially
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [error, setError] = useState('');
    const [identity, setIdentity] = useState({ dob: '', nationality: '', street: '', zip: '', city: '' });
    const [fiscal, setFiscal] = useState({ svNumber: '', healthInsurance: '', taxId: '' });
    const [employment, setEmployment] = useState({ type: 'minijob', hasOtherMinijob: 'no', hasMainJob: 'no', status: 'regular' });
    const [iban, setIban] = useState('');
    const [files, setFiles] = useState({ idCard: null, workPermit: null, healthCert: null, membershipCert: null });
    const [confirmed, setConfirmed] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    // Validation State
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});

    useEffect(() => {
        // If we have registerData, we are in "New User Flow" -> No need to fetch DB yet.
        if (registerData) {
            setUser(null); // Explicitly no user yet
            setLoading(false);
            return;
        }

        // Existing User Flow (Login -> Complete Profile)
        const unsubscribe = auth.onAuthStateChanged((currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                setLoading(false);
            } else {
                // If no user and no registerData, go to login
                navigate('/login');
            }
        });
        return () => unsubscribe();
    }, [registerData, navigate]);

    // --- HOSTED FUNCTIONS (Restored) ---
    const handleIdentityChange = (e) => {
        setIdentity({ ...identity, [e.target.name]: e.target.value });
        if (errors[e.target.name]) {
            setErrors({ ...errors, [e.target.name]: null });
        }
    };
    const handleFiscalChange = (e) => {
        setFiscal({ ...fiscal, [e.target.name]: e.target.value });
        if (errors[e.target.name]) {
            setErrors({ ...errors, [e.target.name]: null });
        }
    };
    const handleEmploymentChange = (e) => setEmployment({ ...employment, [e.target.name]: e.target.value });
    const handleFileChange = (e, key) => {
        if (e.target.files[0]) setFiles({ ...files, [key]: e.target.files[0] });
        if (errors[key]) setErrors({ ...errors, [key]: null });
    };

    const handleIbanChange = (e) => {
        setIban(e.target.value);
        if (errors.iban) setErrors({ ...errors, iban: null });
    };

    const validateField = (name, value) => {
        let errorMsg = null;
        switch (name) {
            case 'dob':
                if (!value) errorMsg = "Bitte Geburtsdatum angeben.";
                else {
                    const birthDate = new Date(value);
                    const today = new Date();
                    let age = today.getFullYear() - birthDate.getFullYear();
                    const m = today.getMonth() - birthDate.getMonth();
                    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
                    if (age < 14) errorMsg = "Du musst mindestens 14 Jahre alt sein.";
                }
                break;
            case 'nationality':
                if (!value || value.trim().length < 2) errorMsg = "Bitte Staatsangehörigkeit angeben.";
                break;
            case 'street':
                if (!/\d+/.test(value)) errorMsg = "Die Straße muss eine Hausnummer enthalten.";
                break;
            case 'zip':
                if (!/^\d{5}$/.test(value)) errorMsg = "Die PLZ muss genau 5 Ziffern haben.";
                break;
            case 'city':
                if (value.trim().length < 2) errorMsg = "Der Stadtname ist zu kurz.";
                break;
            case 'healthInsurance':
                if (!value.trim()) errorMsg = "Bitte Krankenkasse angeben.";
                break;
            case 'taxId':
                if (value && !/^\d{11}$/.test(value.replace(/\s/g, ''))) errorMsg = "Die Steuer-ID muss genau 11 Ziffern haben.";
                break;
            case 'svNumber':
                if (value) {
                    const cleanSV = value.replace(/\s/g, '').toUpperCase();
                    if (!/^\d{2}\d{6}[A-Z]\d{3}$/.test(cleanSV) && cleanSV.length !== 12) {
                        errorMsg = "Format: 12 123456 A 123";
                    }
                }
                break;
            case 'iban':
                const cleanIban = value.replace(/\s/g, '').toUpperCase();
                if (cleanIban.length < 15 || cleanIban.length > 34 || !/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(cleanIban)) {
                    errorMsg = "Ungültige IBAN.";
                }
                break;
            default: break;
        }
        return errorMsg;
    };

    const handleBlur = (e) => {
        const { name, value } = e.target;
        setTouched({ ...touched, [name]: true });
        const errorMsg = validateField(name, value);
        setErrors((prev) => ({ ...prev, [name]: errorMsg }));
    };

    const validateForm = () => {
        const newErrors = {};
        newErrors.dob = validateField('dob', identity.dob);
        newErrors.nationality = validateField('nationality', identity.nationality);
        newErrors.street = validateField('street', identity.street);
        newErrors.zip = validateField('zip', identity.zip);
        newErrors.city = validateField('city', identity.city);
        newErrors.healthInsurance = validateField('healthInsurance', fiscal.healthInsurance);
        newErrors.taxId = validateField('taxId', fiscal.taxId);
        newErrors.svNumber = validateField('svNumber', fiscal.svNumber);
        newErrors.iban = validateField('iban', iban);

        const isGerman = identity.nationality.toLowerCase().includes('deutsch') || identity.nationality.toLowerCase() === 'de';
        if (!isGerman && !files.workPermit) {
            newErrors.workPermit = "Arbeitserlaubnis erforderlich.";
        }

        Object.keys(newErrors).forEach(key => newErrors[key] === null && delete newErrors[key]);
        return newErrors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        const valErrors = validateForm();
        if (Object.keys(valErrors).length > 0) {
            setErrors(valErrors);
            window.scrollTo(0, 0);
            return;
        }

        if (!confirmed) return setError("Bitte bestätigen Sie die Richtigkeit der Angaben.");
        if (!files.idCard) return setError("Bitte laden Sie ein Foto Ihres Ausweises hoch.");

        setSubmitting(true);
        try {
            console.log("Starting submission...");

            let targetUid = user?.uid;
            let targetUser = user;

            // NEW USER FLOW: Create Account NOW
            if (registerData) {
                console.log("Creating new account...");
                const { email, password } = registerData;
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                targetUser = userCredential.user;
                targetUid = targetUser.uid;
                console.log("Account created:", targetUid);
            }

            if (!targetUid) throw new Error("Keine User-ID gefunden.");

            // Upload Files using targetUid
            const uploadedUrls = {};
            const safeUpload = async (key, file) => {
                if (!file) return;
                try {
                    console.log(`Uploading ${key}...`);
                    const fileRef = storageRef(storage, `documents/${targetUid}/${key}_${Date.now()}`);
                    const snapshot = await uploadBytes(fileRef, file);
                    const url = await getDownloadURL(snapshot.ref);
                    uploadedUrls[key + 'Url'] = url;
                } catch (upErr) {
                    console.error(`Failed to upload ${key} (non-blocking):`, upErr);
                    // Do not throw. Just log. 
                    // This ensures the user data is saved even if file upload fails (e.g. CORS).
                }
            };

            await Promise.all([
                safeUpload('idCard', files.idCard),
                safeUpload('workPermit', files.workPermit),
                safeUpload('healthCert', files.healthCert),
                safeUpload('membershipCert', files.membershipCert)
            ]);

            // Prepare Data
            const baseData = registerData || {}; // firstName, lastName, phone, email, etc.
            // Remove password from object if present (security best practice, though not in DB anyway)
            delete baseData.password;

            // Determine role if new user
            let role = 'user';
            if (registerData && registerData.email.toLowerCase() === 'dobler@email.de') {
                role = 'admin';
            }

            const finalData = {
                ...baseData, // From Step 1
                ...identity, // From Step 2
                ...fiscal,
                ...employment,
                iban,
                ...uploadedUrls,
                role: role, // Ensure role is set
                email: registerData ? registerData.email : targetUser.email, // Ensure email is set
                onboardingSubmittedAt: new Date().toISOString(),
                onboardingStatus: 'pending_verification',
                isProfileComplete: false
            };

            // Save to DB
            await update(dbRef(db, `users/${targetUid}`), finalData);

            console.log("Success. showing message.");
            setShowSuccess(true);
            window.scrollTo(0, 0);

        } catch (err) {
            console.error("Submission Error:", err);
            let msg = err.message;
            if (err.code === 'auth/email-already-in-use') msg = "Diese E-Mail wird bereits verwendet.";
            setError(msg || "Fehler beim Speichern.");
        } finally {
            setSubmitting(false);
        }
    };

    // --- HOSTED FUNCTIONS (Restored) ---
    // ... (keep top part, replacement starts around line 250 where mess begins)

    // ... (Imports were already at top, no need to re-add here, just remove the duplicate ones if they appear in the middle)

    const handleBackToLogin = async () => {
        try {
            await signOut(auth);
            navigate('/login');
        } catch (e) {
            console.error(e);
            navigate('/login');
        }
    };

    if (loading) return <div className="login-container"><div style={{ color: 'white' }}>Laden...</div></div>;

    // --- SUCCESS OVERLAY ---
    if (showSuccess) {
        return (
            <div className="login-container">
                <div className="glass-panel login-card" style={{ maxWidth: '600px', textAlign: 'center', padding: '40px' }}>
                    <div style={{ fontSize: '4rem', marginBottom: '20px' }}>✅</div>
                    <h2 className="login-welcome">Vielen Dank!</h2>
                    <p style={{ fontSize: '1.2rem', lineHeight: '1.6', color: 'white', marginBottom: '30px' }}>
                        Wir haben Ihre Nachricht erhalten. <br />
                        Wir werden Ihre Daten prüfen.
                    </p>
                    <div style={{ background: 'rgba(255,255,255,0.1)', padding: '20px', borderRadius: '12px', marginBottom: '30px' }}>
                        <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.8 }}>
                            Bitte prüfen Sie zusätzlich Ihr E-Mail-Postfach. <br />
                            Falls wir Rückfragen haben, melden wir uns.
                        </p>
                    </div>
                    <button
                        onClick={() => navigate('/verify-email')}
                        className="login-button"
                    >
                        Weiter zur Verifizierung ➔
                    </button>

                    <div style={{ marginTop: '20px' }}>
                        <button
                            onClick={handleBackToLogin}
                            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', textDecoration: 'underline' }}
                        >
                            Abmelden
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="login-container" style={{ alignItems: 'flex-start', paddingTop: '40px', paddingBottom: '40px' }}>

            {/* Back Button */}
            <div style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 10 }}>
                <button
                    onClick={handleBackToLogin}
                    style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                    ⬅ Zurück zur Anmeldung
                </button>
            </div>

            <div className="glass-panel login-card" style={{ maxWidth: '800px', width: '95%', margin: '0 auto' }}>
                <h2 className="login-welcome">Personalfragebogen 📝</h2>
                <p className="login-subtitle">
                    Wir benötigen diese Angaben für deine rechtssichere Anmeldung (Sozialversicherung & Steuer).
                </p>

                {error && <div style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '10px', borderRadius: '8px', marginBottom: '20px' }}>{error}</div>}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '25px', textAlign: 'left' }}>
                    {/* ... rest of the form ... */}

                    {/* 1. Identity */}
                    <section>
                        <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px', color: '#60a5fa' }}>1. Persönliche Daten</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px' }}>
                            <div className="input-group">
                                <label>Geburtsdatum *</label>
                                <input type="date" name="dob" value={identity.dob} onChange={handleIdentityChange} onBlur={handleBlur} required className="login-input" />
                                {errors.dob && <small style={{ color: '#ef4444' }}>{errors.dob}</small>}
                            </div>
                            <div className="input-group">
                                <label>Staatsangehörigkeit *</label>
                                <input type="text" name="nationality" placeholder="z.B. Deutsch" value={identity.nationality} onChange={handleIdentityChange} onBlur={handleBlur} required className="login-input" />
                                {errors.nationality && <small style={{ color: '#ef4444' }}>{errors.nationality}</small>}
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr', gap: '10px', marginTop: '10px' }}>
                            <div className="input-group">
                                <input type="text" name="street" placeholder="Straße & Hausnummer" value={identity.street} onChange={handleIdentityChange} onBlur={handleBlur} required className="login-input" />
                                {errors.street && <small style={{ color: '#ef4444' }}>{errors.street}</small>}
                            </div>
                            <div className="input-group">
                                <input type="text" name="zip" placeholder="PLZ" value={identity.zip} onChange={handleIdentityChange} onBlur={handleBlur} required className="login-input" maxLength="5" />
                                {errors.zip && <small style={{ color: '#ef4444' }}>{errors.zip}</small>}
                            </div>
                            <div className="input-group">
                                <input type="text" name="city" placeholder="Stadt" value={identity.city} onChange={handleIdentityChange} onBlur={handleBlur} required className="login-input" />
                                {errors.city && <small style={{ color: '#ef4444' }}>{errors.city}</small>}
                            </div>
                        </div>
                    </section>

                    {/* 2. SV & Tax */}
                    <section>
                        <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px', color: '#60a5fa' }}>2. Sozialversicherung & Steuer</h3>
                        <div className="input-group" style={{ marginTop: '15px' }}>
                            <label>Rentenversicherungsnummer (SV-Nummer)</label>
                            <input type="text" name="svNumber" placeholder="XX 123456 A 123" value={fiscal.svNumber} onChange={handleFiscalChange} onBlur={handleBlur} className="login-input" />
                            {errors.svNumber && <small style={{ color: '#ef4444' }}>{errors.svNumber}</small>}
                            <small style={{ opacity: 0.5 }}>Falls nicht vorhanden: Wir beantragen eine für dich.</small>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '10px' }}>
                            <div className="input-group">
                                <label>Krankenkasse (Name) *</label>
                                <input type="text" name="healthInsurance" placeholder="z.B. AOK, TK..." value={fiscal.healthInsurance} onChange={handleFiscalChange} onBlur={handleBlur} required className="login-input" />
                                {errors.healthInsurance && <small style={{ color: '#ef4444' }}>{errors.healthInsurance}</small>}
                            </div>
                            <div className="input-group">
                                <label>Steuer-ID (11-stellig)</label>
                                <input type="text" name="taxId" placeholder="Steueridentifikationsnummer" value={fiscal.taxId} onChange={handleFiscalChange} onBlur={handleBlur} className="login-input" />
                                {errors.taxId && <small style={{ color: '#ef4444' }}>{errors.taxId}</small>}
                            </div>
                        </div>
                    </section>

                    {/* 3. Job Details */}
                    <section>
                        <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px', color: '#60a5fa' }}>3. Beschäftigung</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px' }}>
                            {/* Startdatum removed - Admin sets it */}
                            <div className="input-group">
                                <label>Art der Beschäftigung *</label>
                                <select name="type" value={employment.type} onChange={handleEmploymentChange} className="login-input" style={{ background: '#1e293b', color: 'white' }}>
                                    <option value="minijob">Minijob (bis 538€)</option>
                                    <option value="parttime">Teilzeit (Midijob)</option>
                                    <option value="fulltime">Vollzeit</option>
                                    <option value="shortterm">Kurzfristige Besch. (70 Tage)</option>
                                </select>
                            </div>
                        </div>

                        {/* Conditional: Minijob */}
                        {employment.type === 'minijob' && (
                            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '8px', marginTop: '10px' }}>
                                <label style={{ display: 'block', marginBottom: '5px' }}>Hast du weitere Minijobs?</label>
                                <select name="hasOtherMinijob" value={employment.hasOtherMinijob} onChange={handleEmploymentChange} className="login-input" style={{ marginBottom: '10px' }}>
                                    <option value="no">Nein</option>
                                    <option value="yes">Ja (Bitte Details im Büro melden)</option>
                                </select>
                                <label style={{ display: 'block', marginBottom: '5px' }}>Hast du einen Hauptjob?</label>
                                <select name="hasMainJob" value={employment.hasMainJob} onChange={handleEmploymentChange} className="login-input">
                                    <option value="no">Nein</option>
                                    <option value="yes">Ja</option>
                                </select>
                            </div>
                        )}

                        {/* Conditional: Student */}
                        <div className="input-group" style={{ marginTop: '15px' }}>
                            <label>Status</label>
                            <select name="status" value={employment.status} onChange={handleEmploymentChange} className="login-input" style={{ background: '#1e293b', color: 'white' }}>
                                <option value="regular">Arbeitnehmer (Regulär)</option>
                                <option value="student">Student (Werkstudent)</option>
                                <option value="pensioner">Rentner</option>
                            </select>
                        </div>
                    </section>

                    {/* 4. Banking */}
                    <section>
                        <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px', color: '#60a5fa' }}>4. Bankverbindung</h3>
                        <div className="input-group" style={{ marginTop: '15px' }}>
                            <label>IBAN (Dein Konto) *</label>
                            <input type="text" name="iban" value={iban} onChange={handleIbanChange} onBlur={handleBlur} required placeholder="DE..." className="login-input" />
                            {errors.iban && <small style={{ color: '#ef4444' }}>{errors.iban}</small>}
                        </div>
                    </section>

                    {/* 5. Documents */}
                    <section>
                        <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px', color: '#60a5fa' }}>5. Dokumente</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px' }}>
                            <div className="input-group">
                                <label>Ausweis / Pass (Foto) *</label>
                                <input type="file" onChange={e => handleFileChange(e, 'idCard')} required accept="image/*,.pdf" style={{ color: 'rgba(255,255,255,0.6)' }} />
                            </div>
                            <div className="input-group">
                                <label>Arbeitserlaubnis (falls nötig)</label>
                                <input type="file" onChange={e => handleFileChange(e, 'workPermit')} accept="image/*,.pdf" style={{ color: 'rgba(255,255,255,0.6)' }} />
                                {errors.workPermit && <small style={{ color: '#ef4444' }}>{errors.workPermit}</small>}
                            </div>
                            <div className="input-group">
                                <label>Gesundheitszeugnis (IfSG) (falls vorh.)</label>
                                <input type="file" onChange={e => handleFileChange(e, 'healthCert')} accept="image/*,.pdf" style={{ color: 'rgba(255,255,255,0.6)' }} />
                            </div>
                            {employment.status === 'student' && (
                                <div className="input-group">
                                    <label>Immatrikulationsbescheinigung</label>
                                    <input type="file" onChange={e => handleFileChange(e, 'membershipCert')} required accept="image/*,.pdf" style={{ color: 'rgba(255,255,255,0.6)' }} />
                                </div>
                            )}
                        </div>
                    </section>

                    {/* 6. Confirmation */}
                    <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-start', background: 'rgba(16, 185, 129, 0.1)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                        <input
                            type="checkbox"
                            checked={confirmed}
                            onChange={e => setConfirmed(e.target.checked)}
                            id="conf"
                            style={{ width: '20px', height: '20px', marginTop: '3px' }}
                        />
                        <label htmlFor="conf" style={{ fontSize: '0.9rem', lineHeight: '1.5' }}>
                            Ich bestätige, dass alle Angaben vollständig und wahrheitsgemäß sind. Änderungen meiner Verhältnisse (z.B. neue Jobs, Umzug, Krankenkassenwechsel) werde ich unverzüglich mitteilen.
                        </label>
                    </div>

                    <button type="submit" className="login-button" disabled={submitting}>
                        {submitting ? 'Daten werden übermittelt...' : 'Abschließen & Starten 🚀'}
                    </button>

                </form>
            </div>
        </div>
    );
}
