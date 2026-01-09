import React, { useState, useEffect } from 'react';
import { ref, onValue, push, get } from 'firebase/database';
import { db } from '../firebase';
import IngredientsManager from './products/IngredientsManager';
import CategoryManager from './products/CategoryManager';
import ProductManager from './products/ProductManager';

export default function GlobalProductManager() {
    const [activeTab, setActiveTab] = useState('ingredients'); // ingredients, categories, products
    const [ingredients, setIngredients] = useState([]);
    const [categories, setCategories] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fetch Master Data
    useEffect(() => {
        const masterRef = ref(db, 'master_data');
        const unsubscribe = onValue(masterRef, (snapshot) => {
            const data = snapshot.val() || {};

            // Process Ingredients
            const ingList = data.ingredients ? Object.entries(data.ingredients).map(([id, val]) => ({ id, ...val })) : [];
            setIngredients(ingList);

            // Process Categories
            const catList = data.categories ? Object.entries(data.categories).map(([id, val]) => ({ id, ...val })) : [];
            setCategories(catList);

            // Process Products
            const prodList = data.products ? Object.entries(data.products).map(([id, val]) => ({ id, ...val })) : [];
            setProducts(prodList);

            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // --- Legacy Migration Logic ---
    const handleMigrateLegacyData = async () => {
        if (!window.confirm('WARNUNG: Dies importiert alle alten Kategorien und Produkte in die neuen Stammdaten. Fortfahren?')) return;

        setLoading(true);
        try {
            // 1. Fetch Old Data
            const oldCatsSnap = await get(ref(db, 'productCategories'));
            const oldProdsSnap = await get(ref(db, 'products'));

            const oldCats = oldCatsSnap.val() || {};
            const oldProds = oldProdsSnap.val() || {};

            const catIdMap = {};

            // 2. Migrate Categories
            for (const [oldId, data] of Object.entries(oldCats)) {
                // Check if already exists to avoid duplicates (simple name check)
                const exists = categories.find(c => c.name === data.name);
                if (!exists) {
                    const newRef = await push(ref(db, 'master_data/categories'), {
                        name: data.name,
                        level: 0,
                        parentId: null,
                        createdAt: new Date().toISOString(),
                        importedFrom: oldId
                    });
                    catIdMap[oldId] = newRef.key;
                } else {
                    catIdMap[oldId] = exists.id;
                }
            }

            // 3. Migrate Products
            for (const [oldId, data] of Object.entries(oldProds)) {
                const legacyCatId = data.category || data.categoryId;
                const newCatId = catIdMap[legacyCatId];

                // Avoid duplicates
                const exists = products.find(p => p.name === data.name);

                if (!exists && newCatId) {
                    await push(ref(db, 'master_data/products'), {
                        name: data.name,
                        basePrice: parseFloat(data.price || 0),
                        categoryId: newCatId,
                        description: data.description || '',
                        recipe: [], // Legacy products usually don't have recipes
                        itemNo: data.id || '', // Keep original ID as item number if numerical
                        createdAt: new Date().toISOString(),
                        importedFrom: oldId
                    });
                }
            }

            alert('Migration erfolgreich! Alle Daten sind jetzt in den Stammdaten.');
        } catch (err) {
            console.error(err);
            alert('Fehler: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div style={{ padding: '50px', textAlign: 'center', color: 'white' }}>Lade Stammdaten...</div>;

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                paddingBottom: '10px'
            }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <TabButton active={activeTab === 'ingredients'} onClick={() => setActiveTab('ingredients')} icon="🥬" label="Zutaten / Rohstoffe" />
                    <TabButton active={activeTab === 'categories'} onClick={() => setActiveTab('categories')} icon="📂" label="Kategorien (Struktur)" />
                    <TabButton active={activeTab === 'products'} onClick={() => setActiveTab('products')} icon="🍔" label="Produkte & Rezepte" />
                </div>
                <button
                    onClick={handleMigrateLegacyData}
                    style={{
                        padding: '8px 16px',
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '8px',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        fontSize: '0.85rem'
                    }}
                >
                    📥 Altdaten importieren
                </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
                {activeTab === 'ingredients' && <IngredientsManager ingredients={ingredients} />}
                {activeTab === 'categories' && <CategoryManager categories={categories} />}
                {activeTab === 'products' && <ProductManager products={products} categories={categories} ingredients={ingredients} />}
            </div>
        </div>
    );
}

// Simple Helper Button
const TabButton = ({ active, onClick, icon, label }) => (
    <button
        onClick={onClick}
        style={{
            background: active ? 'var(--primary)' : 'transparent',
            color: active ? 'white' : 'var(--text-muted)',
            border: 'none',
            padding: '10px 15px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: active ? '600' : '400',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s'
        }}
    >
        <span>{icon}</span> {label}
    </button>
);
