import React, { useState, useEffect } from 'react';
import { ref, onValue, push, update, remove, get } from 'firebase/database';
import { db } from '../firebase';

export default function LocationMenuManager({ location }) {
    const [localCategories, setLocalCategories] = useState([]);
    const [localProducts, setLocalProducts] = useState([]);

    // Master Data Sync
    const [masterCategories, setMasterCategories] = useState([]);
    const [masterProducts, setMasterProducts] = useState([]);

    const [activeCategory, setActiveCategory] = useState(null);
    const [loading, setLoading] = useState(true);

    // Selection States
    const [isSelectingProduct, setIsSelectingProduct] = useState(false);
    const [isSelectingCategories, setIsSelectingCategories] = useState(false);

    // Override State
    const [editingProduct, setEditingProduct] = useState(null); // { localId, ...data }

    useEffect(() => {
        if (!location?.id) return;

        // 1. Fetch Local Data
        const menuRef = ref(db, `locations/${location.id}/menu`);
        const unsubscribeLocal = onValue(menuRef, (snapshot) => {
            const data = snapshot.val() || {};

            // Categories
            const lCats = data.categories ? Object.entries(data.categories).map(([id, val]) => ({ id, ...val })) : [];
            setLocalCategories(lCats);

            // Products
            const lProds = data.products ? Object.entries(data.products).map(([id, val]) => ({ id, ...val })) : [];
            setLocalProducts(lProds);

            setLoading(false);
        });

        // 2. Fetch Master Data
        const masterRef = ref(db, 'master_data');
        const unsubscribeMaster = onValue(masterRef, (snapshot) => {
            const data = snapshot.val() || {};
            setMasterCategories(data.categories ? Object.entries(data.categories).map(([id, val]) => ({ id, ...val })) : []);
            setMasterProducts(data.products ? Object.entries(data.products).map(([id, val]) => ({ id, ...val })) : []);
        });

        return () => {
            unsubscribeLocal();
            unsubscribeMaster();
        };
    }, [location?.id]);

    // --- Logic: Add Master Category to Location ---
    const handleAddCategory = async (masterCatId) => {
        const masterCat = masterCategories.find(c => c.id === masterCatId);
        if (!masterCat) return;

        // Check availability
        if (localCategories.find(c => c.masterId === masterCatId)) {
            alert('Diese Kategorie existiert bereits an diesem Standort.');
            return;
        }

        await push(ref(db, `locations/${location.id}/menu/categories`), {
            name: masterCat.name,
            masterId: masterCatId,
            level: masterCat.level || 0,
            parentId: masterCat.parentId || null,
            createdAt: new Date().toISOString()
        });
    };

    const handleRemoveCategory = async (localCatId) => {
        if (!window.confirm('Kategorie vom Standort entfernen?')) return;
        await remove(ref(db, `locations/${location.id}/menu/categories/${localCatId}`));
    }

    // --- Logic: Add Master Product to Location ---
    const handleAddProduct = async (masterProdId, overridePrice, overrideVat) => {
        const masterProd = masterProducts.find(p => p.id === masterProdId);
        if (!masterProd) return;

        // Find corresponding local category (match by masterId)
        const masterCatId = masterProd.categoryId;
        const localCat = localCategories.find(c => c.masterId === masterCatId);

        if (!localCat) {
            alert('Bitte füge erst die entsprechende Kategorie (' + (masterCategories.find(c => c.id === masterCatId)?.name) + ') zum Standort hinzu.');
            return;
        }

        await push(ref(db, `locations/${location.id}/menu/products`), {
            masterId: masterProdId,
            name: masterProd.name, // Copied for easier display even if master changes
            localCategoryId: localCat.id,
            price: parseFloat(overridePrice || masterProd.basePrice),
            vat: parseFloat(overrideVat || 19), // Default 19%
            isActive: true,
            createdAt: new Date().toISOString()
        });
        setIsSelectingProduct(false);
    };

    const handleUpdateProduct = async (localProdId, updates) => {
        await update(ref(db, `locations/${location.id}/menu/products/${localProdId}`), updates);
        setEditingProduct(null);
    };

    const handleRemoveProduct = async (localProdId) => {
        if (!window.confirm('Produkt vom Standort entfernen?')) return;
        await remove(ref(db, `locations/${location.id}/menu/products/${localProdId}`));
    };

    // --- Sync Check for Categories ---
    // If master category structure changes, we might want to alert key updates, but for now we manually add.

    // Filter products
    const activeLocalProducts = localProducts.filter(p => p.localCategoryId === activeCategory);

    // Helpers for Modal
    const getAvailableMasterProducts = () => {
        // Find master products whose category exists locally AND who aren't added yet
        if (!activeCategory) return [];
        const currentLocalCat = localCategories.find(c => c.id === activeCategory);
        if (!currentLocalCat || !currentLocalCat.masterId) return [];

        return masterProducts.filter(mp =>
            mp.categoryId === currentLocalCat.masterId &&
            !localProducts.find(lp => lp.masterId === mp.id)
        );
    };

    const getAvailableMasterCategories = () => {
        return masterCategories.filter(mc => !localCategories.find(lc => lc.masterId === mc.id));
    };


    if (loading) return <div>Lade Standort-Daten...</div>;

    return (
        <div style={{ padding: '0 20px 40px 20px', height: '100%', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                    <h2 style={{ margin: 0 }}>Speisekarte: {location.name}</h2>
                    <p style={{ color: 'var(--text-muted)', margin: '5px 0 0 0' }}>Produkte aus Zentrale auswählen & anpassen</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 1fr) 2fr', gap: '20px', alignItems: 'start' }}>

                {/* 1. LOCAL CATEGORIES */}
                <div className="glass-panel" style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Aktive Kategorien</h3>
                        <button
                            onClick={() => setIsSelectingCategories(true)}
                            style={{ background: 'var(--primary)', border: 'none', borderRadius: '50%', width: '30px', height: '30px', color: 'white', cursor: 'pointer' }}
                        >
                            +
                        </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {localCategories.map(cat => (
                            <div
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                style={{
                                    padding: '10px 14px',
                                    borderRadius: '8px',
                                    background: activeCategory === cat.id ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                                    color: activeCategory === cat.id ? 'white' : 'var(--text-muted)',
                                    cursor: 'pointer',
                                    display: 'flex', justifyContent: 'space-between'
                                }}
                            >
                                <span style={{ marginLeft: (cat.level || 0) * 10 }}>
                                    {(cat.level > 0 ? '↳ ' : '') + cat.name}
                                </span>
                                {activeCategory === cat.id && <button onClick={(e) => { e.stopPropagation(); handleRemoveCategory(cat.id) }} style={{ background: 'none', border: 'none', color: 'white' }}>×</button>}
                            </div>
                        ))}
                    </div>
                </div>

                {/* 2. LOCAL PRODUCTS */}
                <div>
                    {!activeCategory ? (
                        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            Wähle eine Kategorie, um Produkte hinzuzufügen.
                        </div>
                    ) : (
                        <div className="glass-panel" style={{ padding: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h3 style={{ margin: 0 }}>
                                    Produkte in "{localCategories.find(c => c.id === activeCategory)?.name}"
                                </h3>
                                <button
                                    onClick={() => setIsSelectingProduct(true)}
                                    style={{ padding: '8px 16px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                                >
                                    + Aus Zentrale wählen
                                </button>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px' }}>
                                {activeLocalProducts.map(prod => (
                                    <div key={prod.id} style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '10px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                            <span style={{ fontWeight: '600' }}>{prod.name}</span>
                                            {prod.isActive === false && <span style={{ color: 'red', fontSize: '0.8rem' }}>(Inaktiv)</span>}
                                        </div>

                                        {/* Edit Mode vs Display Mode */}
                                        {editingProduct?.id === prod.id ? (
                                            <div style={{ marginTop: '10px', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px' }}>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                                                    <div>
                                                        <label style={{ fontSize: '0.75rem' }}>Preis (€)</label>
                                                        <input
                                                            type="number" step="0.01"
                                                            value={editingProduct.price}
                                                            onChange={e => setEditingProduct({ ...editingProduct, price: e.target.value })}
                                                            className="login-input" style={{ padding: '5px' }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label style={{ fontSize: '0.75rem' }}>MwSt (%)</label>
                                                        <input
                                                            type="number" step="1"
                                                            value={editingProduct.vat}
                                                            onChange={e => setEditingProduct({ ...editingProduct, vat: e.target.value })}
                                                            className="login-input" style={{ padding: '5px' }}
                                                        />
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: '5px' }}>
                                                    <button onClick={() => handleUpdateProduct(prod.id, { price: parseFloat(editingProduct.price), vat: parseFloat(editingProduct.vat) })} style={{ background: 'var(--primary)', border: 'none', color: 'white', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', flex: 1 }}>OK</button>
                                                    <button onClick={() => setEditingProduct(null)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', flex: 1 }}>Abbrechen</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div>
                                                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                                                    Preis: <span style={{ color: 'white' }}>€{parseFloat(prod.price).toFixed(2)}</span> |
                                                    MwSt: <span style={{ color: 'white' }}>{prod.vat}%</span>
                                                </div>
                                                <div style={{ display: 'flex', gap: '10px' }}>
                                                    <button onClick={() => setEditingProduct({ id: prod.id, price: prod.price, vat: prod.vat })} style={{ flex: 1, cursor: 'pointer', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '5px', borderRadius: '4px' }}>✏️ Anpassen</button>
                                                    <button onClick={() => handleRemoveProduct(prod.id)} style={{ cursor: 'pointer', background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#ef4444', padding: '5px 10px', borderRadius: '4px' }}>🗑️</button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* MODAL: Select Categories */}
            {isSelectingCategories && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(5px)' }}>
                    <div className="glass-panel" style={{ width: '400px', padding: '25px', maxHeight: '80vh', overflowY: 'auto' }}>
                        <h3>Kategorien hinzufügen</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {getAvailableMasterCategories().map(mc => (
                                <button
                                    key={mc.id}
                                    onClick={() => { handleAddCategory(mc.id); setIsSelectingCategories(false); }}
                                    style={{ textAlign: 'left', padding: '12px', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', borderRadius: '8px', cursor: 'pointer' }}
                                >
                                    {mc.name}
                                </button>
                            ))}
                            {getAvailableMasterCategories().length === 0 && <p>Keine neuen Kategorien verfügbar.</p>}
                        </div>
                        <button onClick={() => setIsSelectingCategories(false)} style={{ marginTop: '20px', width: '100%', padding: '10px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: '8px', cursor: 'pointer' }}>Schließen</button>
                    </div>
                </div>
            )}

            {/* MODAL: Select Products */}
            {isSelectingProduct && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(5px)' }}>
                    <div className="glass-panel" style={{ width: '500px', padding: '25px', maxHeight: '80vh', overflowY: 'auto' }}>
                        <h3>Produkt hinzufügen</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {getAvailableMasterProducts().map(mp => (
                                <div key={mp.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.1)', padding: '15px', borderRadius: '8px' }}>
                                    <div style={{ flex: 1, fontWeight: 'bold' }}>{mp.name}</div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Std: €{mp.basePrice}</div>
                                    <button
                                        onClick={() => { handleAddProduct(mp.id, mp.basePrice, 19); }} // Defaults
                                        style={{ padding: '8px 12px', background: 'var(--primary)', border: 'none', color: 'white', borderRadius: '6px', cursor: 'pointer' }}
                                    >
                                        Hinzufügen
                                    </button>
                                </div>
                            ))}
                            {getAvailableMasterProducts().length === 0 && <p>Keine weiteren Produkte in dieser Kategorie verfügbar.</p>}
                        </div>
                        <button onClick={() => setIsSelectingProduct(false)} style={{ marginTop: '20px', width: '100%', padding: '10px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: '8px', cursor: 'pointer' }}>Schließen</button>
                    </div>
                </div>
            )}
        </div>
    );
}
