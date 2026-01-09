import React, { useState, useEffect } from 'react';
import { signOut } from 'firebase/auth';
import { ref, onValue } from 'firebase/database';
import { auth, db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import LocationManager from './LocationManager';
import LocationMenuManager from './LocationMenuManager';
import GlobalProductManager from './GlobalProductManager';
import MainLayout from './MainLayout';

// Sub-components
import RoleManagementModal from './admin/RoleManagementModal';
import DashboardHomeGrid from './admin/DashboardHomeGrid';
import GlobalLocationsView from './admin/views/GlobalLocationsView';
import GlobalUsersView from './admin/views/GlobalUsersView';
import GlobalSettingsView from './admin/views/GlobalSettingsView';
import GlobalComplianceRules from './admin/views/GlobalComplianceRules';
import HomeBanner from './admin/views/HomeBanner';
import StaffManager from './admin/StaffManager'; // CORRECTED PATH
import TimeClock from './staff/TimeClock';
import ShiftPlanner from './staff/ShiftPlanner';
import MessageCenter from './staff/MessageCenter';

export default function AdminDashboard() {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('locations');
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [locations, setLocations] = useState([]);
    const [theme, setTheme] = useState('navy');

    // RBAC Modal State
    const [editingUser, setEditingUser] = useState(null);
    const [showRoleModal, setShowRoleModal] = useState(false);

    const AVAILABLE_ROLES = [
        // Management & Office
        { id: 'admin', label: 'Globaler Admin', icon: '🛡️', desc: 'Voller Zugriff auf alles.' },
        { id: 'ceo', label: 'Geschäftsführer', icon: '🎩', desc: 'Gesamtverantwortung.' },
        { id: 'manager', label: 'Betriebsleiter', icon: '👔', desc: 'Standortleitung.' },
        { id: 'office', label: 'Büro', icon: '💻', desc: 'Verwaltung & Orga.' },
        { id: 'accounting', label: 'Buchhaltung', icon: '📊', desc: 'Finanzen & Abrechnung.' },
        // Service
        { id: 'bar_manager', label: 'Barchef', icon: '🍸', desc: 'Leitung Bar.' },
        { id: 'barkeeper', label: 'Barkeeper', icon: '🍹', desc: 'Getränke & Service.' },
        { id: 'service', label: 'Service / Kellner', icon: '🤵', desc: 'Gastservice.' },
        { id: 'reception', label: 'Empfang', icon: '🛎️', desc: 'Begrüßung & Platzierung.' },
        { id: 'reservations', label: 'Reservierung', icon: '📅', desc: 'Telefon & Planung.' },
        { id: 'phone', label: 'Telefonannahme', icon: '☎️', desc: 'Anrufe & Bestellungen.' },
        { id: 'cloakroom', label: 'Garderobe', icon: '🧥', desc: 'Gästeempfang.' },
        // Social
        { id: 'instagram', label: 'Instagram', icon: '📸', desc: 'Social Media Content.' },
        { id: 'tiktok', label: 'TikTok', icon: '🎵', desc: 'Video Content.' },
        // Kitchen
        { id: 'head_chef', label: 'Küchenchef', icon: '👨‍🍳', desc: 'Leitung Küche.' },
        { id: 'kitchen', label: 'Koch / Küche', icon: '🍳', desc: 'Zubereitung.' },
        { id: 'commi', label: 'Commi', icon: '🔪', desc: 'Zu- & Vorbereitung.' },
        { id: 'kitchen_help', label: 'Küchenhilfe', icon: '🥔', desc: 'Unterstützung.' },
        { id: 'dishwasher', label: 'Spüler', icon: '🧼', desc: 'Abwasch.' },
        // Facility
        { id: 'stock', label: 'Lagerist', icon: '📦', desc: 'Warenannahme & Lager.' },
        { id: 'cleaner', label: 'Reinigungskraft', icon: '🧹', desc: 'Sauberkeit.' },
        { id: 'restroom', label: 'WC-Service', icon: '🚽', desc: 'Sanitärbereich.' },
        { id: 'security', label: 'Security', icon: '👮', desc: 'Sicherheit & Einlass.' },
    ];

    // Theme application effect
    useEffect(() => {
        document.body.setAttribute('data-theme', theme);
    }, [theme]);

    const themes = [
        { id: 'navy', name: 'Deep Navy', color: '#2563EB' },
        { id: 'midnight', name: 'Midnight', color: '#000000' },
        { id: 'forest', name: 'Nordic Forest', color: '#10b981' },
        { id: 'wine', name: 'Bordeaux', color: '#e11d48' },
        { id: 'slate', name: 'Slate', color: '#64748b' },
        { id: 'royal', name: 'Royal', color: '#8b5cf6' },
        { id: 'ocean', name: 'Ocean', color: '#06b6d4' },
        { id: 'sunset', name: 'Sunset', color: '#f97316' },
        { id: 'light', name: 'Pure Light', color: '#f8fafc' },
        { id: 'cream', name: 'Creamy Latte', color: '#eee8d5' },
        // New Themes
        { id: 'noir', name: 'Noir Luxury', color: '#d4af37' },
        { id: 'arctic', name: 'Arctic Ice', color: '#0ea5e9' },
        { id: 'sakura', name: 'Sakura Bloom', color: '#ec4899' },
        { id: 'emerald', name: 'Emerald City', color: '#34d399' },
        { id: 'graphite', name: 'Graphite', color: '#94a3b8' },
        { id: 'lavender', name: 'Lavender', color: '#8b5cf6' },
        { id: 'sapphire', name: 'Sapphire', color: '#3b82f6' },
        { id: 'sand', name: 'Desert Sand', color: '#d97706' },
        { id: 'neon', name: 'Neon City', color: '#06b6d4' },
        { id: 'mint', name: 'Mint Fresh', color: '#14b8a6' }
    ];

    useEffect(() => {
        // Fetch users
        const usersRef = ref(db, 'users');
        const unsubscribeUsers = onValue(usersRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const usersList = Object.entries(data).map(([uid, userData]) => ({
                    uid,
                    ...userData
                }));
                setUsers(usersList);
            } else {
                setUsers([]);
            }
            setLoading(false);
        });

        // Fetch locations for picker
        const locationsRef = ref(db, 'locations');
        const unsubscribeLocs = onValue(locationsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setLocations(Object.entries(data).map(([id, val]) => ({ id, ...val })));
            } else {
                setLocations([]);
            }
        });

        return () => {
            unsubscribeUsers();
            unsubscribeLocs();
        };
    }, []);

    const handleOpenRoleModal = (user) => {
        setEditingUser(user);
        setShowRoleModal(true);
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
            navigate('/login');
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    // Determine Title/Subtitle
    const getTitle = () => {
        if (!selectedLocation) return 'Admin Center';
        return selectedLocation.firmenname;
    };

    // Navigation State
    const [view, setView] = useState('home'); // 'home', 'locations', 'users', 'hr', 'settings'
    const [scopedView, setScopedView] = useState('dashboard'); // 'dashboard', 'menu', 'orders', 'staff'

    // Helpers
    const getDisplayName = (user) => {
        if (!user) return '';
        return user.name || user.Name || user.username || user.fullName || user.displayName || user.email;
    };

    const handleLocationSelect = (loc) => {
        if (loc.id === 'global') {
            setSelectedLocation(null);
            setView('settings'); // Global admin card goes to settings/admin area
        } else if (loc.id === 'new') {
            setSelectedLocation(loc); // {id:'new', name:'Neuer Standort'}
            setScopedView('settings'); // Show the LocationManager form directly
        } else {
            setSelectedLocation(loc);
            setScopedView('dashboard'); // Reset to dashboard when entering location
        }
    };

    // --- Dock Configurations ---
    const [unreadCount, setUnreadCount] = useState(0);
    const [secureUser, setSecureUser] = useState(null);

    // 1. Ensure we have a valid user via onAuthStateChanged (More robust than auth.currentUser direct access)
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            setSecureUser(user);
        });
        return () => unsubscribe();
    }, []);

    // 2. Listen for Unread Messages only when secureUser is confirmed
    useEffect(() => {
        if (!secureUser) {
            setUnreadCount(0);
            return;
        }

        try {
            const messagesRef = ref(db, `messages/direct/${secureUser.uid}`);
            return onValue(messagesRef, (snap) => {
                const data = snap.val();
                if (data) {
                    const count = Object.values(data).filter(msg => !msg.read).length;
                    setUnreadCount(count);
                } else {
                    setUnreadCount(0);
                }
            });
        } catch (error) {
            console.error("Error setting up message listener:", error);
            setUnreadCount(0);
        }
    }, [secureUser]);
    const globalDockItems = [
        { icon: '📊', label: 'Dashboard', isActive: view === 'home', onClick: () => setView('home') },
        { icon: '🏢', label: 'Standorte', isActive: view === 'locations', onClick: () => setView('locations') },
        { icon: '👥', label: 'Team', isActive: view === 'users', onClick: () => setView('users') },
        { icon: '📇', label: 'Personal', isActive: view === 'hr', onClick: () => setView('hr') },
        { icon: '⚖️', label: 'Rechte', isActive: view === 'compliance', onClick: () => setView('compliance') },
        { icon: '🎨', label: 'Design', isActive: view === 'settings', onClick: () => setView('settings') }
    ];

    const scopedDockItems = [
        // FIXED: Dashboard button now always goes to Global Admin Dashboard (exits location)
        {
            icon: '📊',
            label: 'System',
            isActive: false, // Never active in scoped view because it leaves the view
            onClick: () => { setSelectedLocation(null); setView('home'); }
        },
        { icon: '🏠', label: 'Lokal', isActive: scopedView === 'dashboard', onClick: () => setScopedView('dashboard') },
        { icon: '📅', label: 'Planung', isActive: scopedView === 'planner', onClick: () => setScopedView('planner') },
        { icon: '⏱️', label: 'Stempeln', isActive: scopedView === 'timeclock', onClick: () => setScopedView('timeclock') },
        { icon: '📋', label: 'Karte', isActive: scopedView === 'menu', onClick: () => setScopedView('menu') },
        { icon: '🍽️', label: 'Orders', isActive: scopedView === 'orders', onClick: () => setScopedView('orders') },
        {
            icon: '💬',
            label: 'News',
            isActive: scopedView === 'messages',
            onClick: () => setScopedView('messages'),
            badge: unreadCount > 0 ? unreadCount : null
        },
        { icon: '⚙️', label: 'Admin', isActive: scopedView === 'settings', onClick: () => setScopedView('settings') },
        { icon: '↩', label: 'Zurück', isActive: false, onClick: () => setSelectedLocation(null) }
    ];

    // --- Title Logic ---
    const getPageTitle = () => {
        if (selectedLocation) {
            return `Verwaltung: ${selectedLocation.name || selectedLocation.firmenname}`;
        }
        switch (view) {
            case 'locations': return 'Standort Übersicht';
            case 'users': return 'Team Management';
            case 'hr': return 'Digitale Personalakte';
            case 'compliance': return 'Arbeitsrecht & Compliance';
            case 'settings': return 'System & Design';
            default: return 'Admin Dashboard';
        }
    };

    // Assuming currentUser is available from auth context or similar
    const currentUser = auth.currentUser;

    // --- INVENTORY WARNING SYSTEM ---
    const [criticalCount, setCriticalCount] = useState(0);
    useEffect(() => {
        const productsRef = ref(db, 'master_data/products');
        return onValue(productsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const count = Object.values(data).filter(p => (p.currentStock || 0) < (p.minStock || 0)).length;
                setCriticalCount(count);
            } else {
                setCriticalCount(0);
            }
        });
    }, []);

    return (
        <MainLayout
            title={getPageTitle()}
            subtitle={selectedLocation ? `${selectedLocation.strasse || ''}, ${selectedLocation.ort || ''}` : getDisplayName(currentUser)}
            showLogout={!selectedLocation}
            handleLogout={handleLogout}
            onBack={
                selectedLocation
                    ? () => setSelectedLocation(null)
                    : (view !== 'home' ? () => setView('home') : null)
            }
            dockItems={selectedLocation ? scopedDockItems : globalDockItems}
        >
            {/* --- GLOBAL VIEW --- */}
            {!selectedLocation && (
                <div style={{ paddingBottom: '80px' }}>

                    {/* WARNING BANNER */}
                    {criticalCount > 0 && (
                        <div style={{
                            margin: '20px',
                            background: 'linear-gradient(90deg, #dc2626, #ef4444)',
                            color: 'white',
                            padding: '15px 20px',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '15px',
                            boxShadow: '0 4px 15px rgba(220, 38, 38, 0.4)',
                            border: '1px solid rgba(255,255,255,0.2)'
                        }}>
                            <span style={{ fontSize: '1.8rem' }}>⚠️</span>
                            <div>
                                <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem' }}>Bestandskritisch: {criticalCount} Produkte</h3>
                                <span style={{ fontSize: '0.9rem', opacity: 0.9 }}>Der Lagerbestand dieser Produkte ist unter das Minimum gefallen.</span>
                            </div>
                            <button
                                onClick={() => setView('global-menu')}
                                style={{ marginLeft: 'auto', background: 'white', color: '#dc2626', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                                Zum Lager →
                            </button>
                        </div>
                    )}

                    {/* HOME VIEW (Now Dashboard) */}
                    {view === 'home' && (
                        <>
                            <HomeBanner unreadCount={unreadCount} onClick={() => setView('messages')} />
                            <div style={{ padding: '20px' }}>
                                {/* Quick Actions */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', marginBottom: '30px' }}>
                                    <button onClick={() => setView('users')} style={{ padding: '20px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', textAlign: 'left', cursor: 'pointer' }}>
                                        <div style={{ fontSize: '1.5rem', marginBottom: '10px' }}>➕</div>
                                        <div style={{ fontWeight: 'bold' }}>Neuer Mitarbeiter</div>
                                    </button>
                                    <button onClick={() => handleLocationSelect({ id: 'new', name: 'Neuer Standort' })} style={{ padding: '20px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', textAlign: 'left', cursor: 'pointer' }}>
                                        <div style={{ fontSize: '1.5rem', marginBottom: '10px' }}>🏢</div>
                                        <div style={{ fontWeight: 'bold' }}>Neuer Standort</div>
                                    </button>
                                    <button onClick={() => setView('compliance')} style={{ padding: '20px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', textAlign: 'left', cursor: 'pointer' }}>
                                        <div style={{ fontSize: '1.5rem', marginBottom: '10px' }}>⚖️</div>
                                        <div style={{ fontWeight: 'bold' }}>Rechte & Gesetze</div>
                                    </button>
                                </div>

                                <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px', marginBottom: '20px' }}>System Status</h3>
                                <DashboardHomeGrid setView={setView} />
                            </div>
                        </>
                    )}

                    {/* LOCATIONS VIEW */}
                    {view === 'locations' && (
                        <GlobalLocationsView
                            locations={locations}
                            onSelectLocation={handleLocationSelect}
                        />
                    )}

                    {/* USERS VIEW */}
                    {view === 'users' && (
                        <GlobalUsersView
                            users={users}
                            currentUser={currentUser}
                            onOpenRoleModal={handleOpenRoleModal}
                            onChangeView={setView}
                        />
                    )}

                    {/* HR STAFF MANAGER */}
                    {view === 'hr' && (
                        <div style={{ padding: '20px', height: 'calc(100vh - 180px)' }}>
                            <StaffManager />
                        </div>
                    )}

                    {/* COMPLIANCE VIEW */}
                    {view === 'compliance' && (
                        <div style={{ padding: '0', height: 'calc(100vh - 180px)', overflowY: 'auto' }}>
                            <GlobalComplianceRules />
                        </div>
                    )}

                    {/* GLOBAL MENU VIEW */}
                    {view === 'global-menu' && (
                        <div style={{ padding: '20px', height: 'calc(100vh - 180px)' }}>
                            <GlobalProductManager />
                        </div>
                    )}

                    {view === 'messages' && (
                        <div style={{ padding: '20px', height: 'calc(100vh - 180px)' }}>
                            <MessageCenter currentUser={currentUser} />
                        </div>
                    )}

                    {/* SETTINGS VIEW */}
                    {view === 'settings' && (
                        <GlobalSettingsView
                            themes={themes}
                            theme={theme}
                            setTheme={setTheme}
                        />
                    )}



                </div>
            )}

            {/* --- SCOPED LOCATION VIEW --- */}
            {selectedLocation && (
                <div style={{ paddingBottom: '80px', paddingTop: '20px' }}>
                    {scopedView === 'dashboard' && (
                        <div style={{ textAlign: 'center', paddingTop: '50px' }}>
                            <div style={{ marginBottom: '30px', fontSize: '4rem' }}>📊</div>
                            <h2 style={{ fontSize: '2rem', marginBottom: '10px' }}>Willkommen in {selectedLocation.ort}</h2>
                            <p style={{ color: 'var(--text-muted)' }}>Wähle eine Aktion aus dem Menü unten.</p>
                        </div>
                    )}

                    {scopedView === 'menu' && (
                        <LocationMenuManager location={selectedLocation} />
                    )}

                    {scopedView === 'orders' && (
                        <div style={{ padding: '20px' }}>
                            <h2>Bestellungen</h2>
                            <p>Aktuelle Bestellungen für {selectedLocation.name}</p>
                        </div>
                    )}

                    {scopedView === 'timeclock' && (
                        <div style={{ padding: '20px', height: '100%' }}>
                            <TimeClock currentUser={currentUser} location={selectedLocation} />
                        </div>
                    )}

                    {scopedView === 'planner' && (
                        <div style={{ padding: '20px', height: '100%' }}>
                            <ShiftPlanner location={selectedLocation} />
                        </div>
                    )}

                    {scopedView === 'settings' && (
                        <div style={{ padding: '20px' }}>
                            <LocationManager
                                selectedLocation={selectedLocation}
                                onClose={() => setSelectedLocation(null)}
                            />
                        </div>
                    )}

                    {scopedView === 'messages' && (
                        <div style={{ padding: '20px', height: 'calc(100vh - 180px)' }}>
                            <MessageCenter currentUser={currentUser} />
                        </div>
                    )}
                </div>
            )}

            {/* Role Selection Modal (Global) - Now using extracted component */}
            {showRoleModal && editingUser && (
                <RoleManagementModal
                    user={editingUser}
                    onClose={() => { setShowRoleModal(false); setEditingUser(null); }}
                    availableRoles={AVAILABLE_ROLES}
                />
            )}
        </MainLayout>
    );
}
