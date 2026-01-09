import React, { useState } from 'react';
import { ref, push, update, remove } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase';

export default function ProductManager({ products, categories, ingredients }) {
    const [viewMode, setViewMode] = useState('list'); // 'list', 'edit', 'create'
    const [currentProduct, setCurrentProduct] = useState(null); // The product being edited
    const [filterCategory, setFilterCategory] = useState('all');

    // Default Product Structure
    const emptyProduct = {
        name: '', description: '',
        basePrice: '', vat: 19, deposit: 0,
        categoryId: '',
        recipe: [],
        minStock: 0,
        currentStock: 0,
        itemNo: '',
        quantity: '',
        unit: '',
        imageUrl: '',
        allergens: [],
        additives: [],
        active: true
    };

    const [formData, setFormData] = useState(emptyProduct);
    const [recipe, setRecipe] = useState([]); // Separate state for recipe builder

    // Initialize form when creating or editing
    const handleStartCreate = () => {
        setFormData(emptyProduct);
        setRecipe([]);
        setViewMode('create');
    };

    const handleStartEdit = (prod) => {
        setCurrentProduct(prod);
        setFormData({
            ...emptyProduct,
            ...prod,
            basePrice: prod.basePrice || '',
            vat: prod.vat || 19,
            deposit: prod.deposit || 0,
            quantity: prod.quantity || '',
            unit: prod.unit || '',
            imageUrl: prod.imageUrl || ''
        });
        setRecipe(prod.recipe || []);
        setViewMode('edit');
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.categoryId || !formData.basePrice) {
            alert('Bitte Name, Kategorie und Basispreis angeben.');
            return;
        }

        const productData = {
            ...formData,
            basePrice: parseFloat(formData.basePrice),
            vat: parseFloat(formData.vat),
            deposit: parseFloat(formData.deposit),
            quantity: parseFloat(formData.quantity || 0),
            unit: formData.unit || '',
            imageUrl: formData.imageUrl || '',
            minStock: parseInt(formData.minStock || 0),
            currentStock: parseInt(formData.currentStock || 0),
            recipe: recipe.filter(r => r.ingredientId && r.quantity),
            updatedAt: new Date().toISOString()
        };

        if (viewMode === 'create') {
            await push(ref(db, 'master_data/products'), {
                ...productData,
                createdAt: new Date().toISOString()
            });
        } else {
            await update(ref(db, `master_data/products/${currentProduct.id}`), productData);
        }

        setViewMode('list');
    };

    const handleDelete = async (id) => {
        if (window.confirm('Produkt wirklich löschen?')) {
            await remove(ref(db, `master_data/products/${id}`));
        }
    };

    // --- Helper for Recipe ---
    const handleAddIngredientToRecipe = () => {
        setRecipe([...recipe, { ingredientId: '', quantity: '' }]);
    };
    const handleUpdateRecipeLine = (idx, field, val) => {
        const updated = [...recipe];
        updated[idx][field] = val;
        setRecipe(updated);
    };

    // --- Image Upload Handler ---
    const [uploading, setUploading] = useState(false);
    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        try {
            const fileRef = storageRef(storage, `product_images/${Date.now()}_${file.name}`);
            await uploadBytes(fileRef, file);
            const url = await getDownloadURL(fileRef);
            setFormData(prev => ({ ...prev, imageUrl: url }));
        } catch (error) {
            console.error("Upload error:", error);
            alert("Fehler beim Upload: " + error.message);
        } finally {
            setUploading(false);
        }
    };

    // --- Helper for Categories ---
    const getCategoryOptions = () => {
        return categories
            .sort((a, b) => (a.level - b.level) || a.name.localeCompare(b.name))
            .map(cat => ({
                id: cat.id,
                name: `${'—'.repeat(cat.level)} ${cat.name}`,
                level: cat.level
            }));
    };

    // --- VIEW: LIST ---
    if (viewMode === 'list') {
        const filteredProducts = products.filter(p => filterCategory === 'all' || p.categoryId === filterCategory);

        return (
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', gap: '15px' }}>
                        <select
                            className="login-input"
                            style={{ minWidth: '200px' }}
                            value={filterCategory}
                            onChange={e => setFilterCategory(e.target.value)}
                        >
                            <option value="all">Alle Kategorien</option>
                            {getCategoryOptions().map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <button onClick={handleStartCreate} className="action-btn">+ Neues Produkt</button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                    {filteredProducts.map(prod => {
                        const cat = categories.find(c => c.id === prod.categoryId);

                        // Inventory Status Logic
                        const min = prod.minStock || 0;
                        const current = prod.currentStock || 0;
                        let statusColor = '#22c55e'; // Green (Safe)

                        if (current < min) {
                            statusColor = '#ef4444'; // Red (Critical)
                        } else if (current < min + 5 || current < min * 1.2) {
                            statusColor = '#eab308'; // Yellow (Warning)
                        }

                        // Override for inactive
                        const borderColor = prod.active ? statusColor : 'gray';

                        return (
                            <div key={prod.id} className="glass-panel" style={{
                                padding: '10px',
                                position: 'relative',
                                borderLeft: `6px solid ${borderColor}`,
                                boxShadow: prod.active ? `-2px 0 8px -2px ${borderColor}` : 'none'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                    <h4 style={{ margin: '0 0 3px 0', fontSize: '0.9rem', lineHeight: '1.2' }}>{prod.name}</h4>
                                    <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>€{parseFloat(prod.basePrice).toFixed(2)}</span>
                                </div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {cat ? cat.name : '-'} | {prod.itemNo || ''}
                                </div>

                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', fontSize: '0.7rem', marginBottom: '8px' }}>
                                    <span style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 4px', borderRadius: '3px' }}>MwSt {prod.vat}%</span>
                                    {prod.deposit > 0 && <span style={{ color: '#fbbf24', background: 'rgba(251, 191, 36, 0.1)', padding: '2px 4px', borderRadius: '3px' }}>+€{prod.deposit}</span>}
                                    <span style={{
                                        background: prod.active ? `${statusColor}20` : 'rgba(255,255,255,0.05)',
                                        color: prod.active ? statusColor : 'inherit',
                                        padding: '2px 4px',
                                        borderRadius: '3px',
                                        fontWeight: 'bold'
                                    }}>
                                        Lager: {prod.currentStock || 0}
                                    </span>
                                </div>

                                <div style={{ display: 'flex', gap: '5px' }}>
                                    <button onClick={() => handleStartEdit(prod)} title="Bearbeiten" style={{ flex: 1, padding: '4px', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>✏️</button>
                                    <button onClick={() => handleDelete(prod.id)} title="Löschen" style={{ padding: '4px 8px', background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#ef4444', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>🗑️</button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    // --- VIEW: CREATE / EDIT ---
    return (
        <div className="glass-panel" style={{ padding: '25px', maxWidth: '800px', margin: '0 auto' }}>
            <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '15px', marginTop: 0 }}>
                {viewMode === 'create' ? 'Neues Produkt anlegen' : `Produkt bearbeiten: ${currentProduct?.name}`}
            </h3>

            <form onSubmit={handleSave}>
                {/* 1. Basic Info */}
                <h4 style={{ color: 'var(--primary)', marginBottom: '15px' }}>📦 Basisdaten</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', marginBottom: '20px' }}>
                    <div>
                        <label>Artikel-Nummer</label>
                        <input className="login-input" value={formData.itemNo} onChange={e => setFormData({ ...formData, itemNo: e.target.value })} placeholder="z.B. A-101" />
                    </div>
                    <div>
                        <label>Produkt Name *</label>
                        <input className="login-input" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required placeholder="z.B. Wiener Schnitzel" />
                    </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <label>Kategorie *</label>
                    <select className="login-input" value={formData.categoryId} onChange={e => setFormData({ ...formData, categoryId: e.target.value })} required>
                        <option value="">-- Wählen --</option>
                        {getCategoryOptions().map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <label>Beschreibung</label>
                    <textarea className="login-input" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows="2" />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                    <div>
                        <label>Menge (für Karte)</label>
                        <input type="number" step="0.01" className="login-input" value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: e.target.value })} placeholder="z.B. 0.5" />
                    </div>
                    <div>
                        <label>Einheit</label>
                        <select className="login-input" value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })}>
                            <option value="">-- Keine --</option>
                            <option value="ml">Milliliter (ml)</option>
                            <option value="l">Liter (l)</option>
                            <option value="g">Gramm (g)</option>
                            <option value="kg">Kilogramm (kg)</option>
                            <option value="stk">Stück</option>
                            <option value="port">Portion</option>
                        </select>
                    </div>
                </div>

                {/* Image Section */}
                <div style={{ marginBottom: '20px' }}>
                    <label>Produktbild</label>

                    {/* Upload & URL Input Container */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '10px' }}>

                        {/* Option A: Upload */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px' }}>
                            <span style={{ fontSize: '1.2rem' }}>📁</span>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                style={{ color: 'var(--text-muted)' }}
                            />
                            {uploading && <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Lade hoch... ⏳</span>}
                        </div>

                        {/* Option B: URL */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '1.2rem' }}>🔗</span>
                            <input
                                className="login-input"
                                value={formData.imageUrl || ''}
                                onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
                                placeholder="oder Bild-URL einfügen..."
                                style={{ flex: 1 }}
                            />
                        </div>
                    </div>

                    {formData.imageUrl && (
                        <div style={{ width: '100%', height: '200px', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', background: '#000', position: 'relative' }}>
                            <img src={formData.imageUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, imageUrl: '' })}
                                style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer' }}
                            >
                                ✕
                            </button>
                        </div>
                    )}
                </div>

                {/* 2. Pricing & Stats */}
                <h4 style={{ color: 'var(--primary)', marginBottom: '15px', marginTop: '30px' }}>💶 Preise & Steuer</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                    <div>
                        <label>Basispreis (Netto) *</label>
                        <input type="number" step="0.01" className="login-input" value={formData.basePrice} onChange={e => setFormData({ ...formData, basePrice: e.target.value })} required />
                    </div>
                    <div>
                        <label>MwSt Satz</label>
                        <select className="login-input" value={formData.vat} onChange={e => setFormData({ ...formData, vat: e.target.value })}>
                            <option value="19">19% (Standard)</option>
                            <option value="7">7% (Ermäßigt)</option>
                            <option value="0">0%</option>
                        </select>
                    </div>
                    <div>
                        <label>Pfand (€)</label>
                        <input type="number" step="0.01" className="login-input" value={formData.deposit} onChange={e => setFormData({ ...formData, deposit: e.target.value })} placeholder="0.00" />
                    </div>
                </div>

                {/* 3. Inventory */}
                <h4 style={{ color: 'var(--primary)', marginBottom: '15px', marginTop: '30px' }}>🏭 Lager & Bestand</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                    <div>
                        <label>Aktueller Bestand</label>
                        <input type="number" className="login-input" value={formData.currentStock} onChange={e => setFormData({ ...formData, currentStock: e.target.value })} />
                    </div>
                    <div>
                        <label>Mindestbestand (Warnung)</label>
                        <input type="number" className="login-input" value={formData.minStock} onChange={e => setFormData({ ...formData, minStock: e.target.value })} />
                    </div>
                </div>

                {/* 4. Recipe */}
                <h4 style={{ color: 'var(--primary)', marginBottom: '15px', marginTop: '30px' }}>🥣 Rezeptur</h4>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '12px', marginBottom: '30px' }}>
                    {recipe.map((line, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                            <select className="login-input" style={{ flex: 2 }} value={line.ingredientId} onChange={e => handleUpdateRecipeLine(idx, 'ingredientId', e.target.value)}>
                                <option value="">Zutat wählen...</option>
                                {ingredients.map(ing => <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>)}
                            </select>
                            <input type="number" step="0.001" className="login-input" style={{ flex: 1 }} value={line.quantity} onChange={e => handleUpdateRecipeLine(idx, 'quantity', e.target.value)} placeholder="Menge" />
                            <button type="button" onClick={() => {
                                const updated = recipe.filter((_, i) => i !== idx);
                                setRecipe(updated);
                            }} style={{ background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '8px', width: '40px', cursor: 'pointer' }}>×</button>
                        </div>
                    ))}
                    <button type="button" onClick={handleAddIngredientToRecipe} style={{ background: 'var(--primary)', border: 'none', borderRadius: '6px', color: 'white', padding: '8px 15px', cursor: 'pointer', fontSize: '0.9rem' }}>+ Zutat hinzufügen</button>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '20px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px' }}>
                    <button type="submit" className="action-btn" style={{ background: 'var(--primary)', flex: 1, padding: '12px' }}>Speichern</button>
                    <button type="button" className="action-btn" onClick={() => setViewMode('list')} style={{ background: 'rgba(255,255,255,0.1)', flex: 1, padding: '12px' }}>Abbrechen</button>
                </div>
            </form >
        </div >
    );
}
