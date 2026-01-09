import React, { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';

export default function Menu() {
    const navigate = useNavigate();
    const [categories, setCategories] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const categoriesRef = ref(db, 'productCategories');
        const productsRef = ref(db, 'products');

        const unsubscribeCategories = onValue(categoriesRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                // Convert object to array
                const list = Object.entries(data).map(([id, val]) => ({
                    id,
                    ...val
                }));
                setCategories(list);
            }
        });

        const unsubscribeProducts = onValue(productsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const list = Object.entries(data).map(([id, val]) => ({
                    id,
                    ...val
                }));
                setProducts(list);
            }
            setLoading(false);
        });

        return () => {
            unsubscribeCategories();
            unsubscribeProducts();
        };
    }, []);

    // Group products by category
    const getProductsByCategory = (catId) => {
        return products.filter(p => p.category === catId || p.categoryId === catId);
    };

    return (
        <div style={{ width: '100%', maxWidth: '1200px', padding: '20px', color: 'var(--text-main)' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                <h1 style={{ color: 'var(--primary)', letterSpacing: '1px' }}>SPEISEKARTE</h1>
                <button
                    onClick={() => navigate('/dashboard')}
                    style={{
                        padding: '10px 20px',
                        background: 'transparent',
                        border: '1px solid var(--primary)',
                        color: 'var(--primary)',
                        borderRadius: 'var(--radius)'
                    }}
                >
                    Zurück
                </button>
            </header>

            {loading ? (
                <div style={{ textAlign: 'center', marginTop: '50px' }}>Lade Speisekarte...</div>
            ) : categories.length === 0 ? (
                <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
                    <p>Noch keine Kategorien gefunden.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                    {categories.map(cat => {
                        const catProducts = getProductsByCategory(cat.id);
                        if (catProducts.length === 0) return null;

                        return (
                            <section key={cat.id} className="glass-panel" style={{ padding: '25px' }}>
                                <h2 style={{
                                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                                    paddingBottom: '10px',
                                    marginBottom: '20px',
                                    color: 'var(--primary)'
                                }}>
                                    {cat.name}
                                </h2>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px' }}>
                                    {catProducts.map(prod => (
                                        <div key={prod.id} style={{
                                            background: 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))',
                                            backdropFilter: 'blur(10px)',
                                            padding: '18px',
                                            borderRadius: '16px',
                                            border: 'none',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'space-between',
                                            boxShadow: '0 4px 15px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.08)',
                                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                            cursor: 'pointer'
                                        }}
                                            onMouseOver={e => {
                                                e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                                                e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15), 0 3px 8px rgba(0,0,0,0.1)';
                                                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.18), rgba(255,255,255,0.08))';
                                            }}
                                            onMouseOut={e => {
                                                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                                e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.08)';
                                                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))';
                                            }}>
                                            <div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                                                    <h3 style={{ fontSize: '1.1rem', fontWeight: '600', letterSpacing: '-0.02em', margin: 0 }}>{prod.name}</h3>
                                                    <span style={{ color: 'var(--primary)', fontWeight: '700', fontSize: '1.1rem' }}>
                                                        {prod.price ? `€${Number(prod.price).toFixed(2)}` : ''}
                                                    </span>
                                                </div>
                                                {prod.description && <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: '1.4' }}>{prod.description}</p>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
