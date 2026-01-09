import React, { useState } from 'react';
import { ref, push, remove } from 'firebase/database';
import { db } from '../../firebase';

export default function IngredientsManager({ ingredients }) {
    const [isAdding, setIsAdding] = useState(false);
    const [newIng, setNewIng] = useState({ name: '', unit: 'kg', minStock: '' });

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!newIng.name) return;
        await push(ref(db, 'master_data/ingredients'), {
            ...newIng,
            createdAt: new Date().toISOString()
        });
        setIsAdding(false);
        setNewIng({ name: '', unit: 'kg', minStock: '' });
    };

    const handleDelete = async (id) => {
        if (window.confirm('Zutat unwiderruflich löschen?')) {
            await remove(ref(db, `master_data/ingredients/${id}`));
        }
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3>Zutaten & Rohstoffe</h3>
                <button
                    onClick={() => setIsAdding(true)}
                    className="action-btn"
                >
                    + Neue Zutat
                </button>
            </div>

            {isAdding && (
                <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px' }}>
                    <form onSubmit={handleAdd} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '10px', alignItems: 'end' }}>
                        <div>
                            <label>Name</label>
                            <input autoFocus className="login-input" value={newIng.name} onChange={e => setNewIng({ ...newIng, name: e.target.value })} placeholder="z.B. Mehl Typ 405" />
                        </div>
                        <div>
                            <label>Einheit</label>
                            <select className="login-input" value={newIng.unit} onChange={e => setNewIng({ ...newIng, unit: e.target.value })}>
                                <option value="kg">Kilogramm (kg)</option>
                                <option value="l">Liter (l)</option>
                                <option value="g">Gramm (g)</option>
                                <option value="ml">Milliliter (ml)</option>
                                <option value="stk">Stück</option>
                            </select>
                        </div>
                        <div>
                            <label>Min. Bestand</label>
                            <input type="number" className="login-input" value={newIng.minStock} onChange={e => setNewIng({ ...newIng, minStock: e.target.value })} placeholder="0" />
                        </div>
                        <div style={{ display: 'flex', gap: '5px' }}>
                            <button type="submit" className="action-btn" style={{ background: 'var(--primary)' }}>Speichern</button>
                            <button type="button" className="action-btn" onClick={() => setIsAdding(false)} style={{ background: 'rgba(255,255,255,0.1)' }}>X</button>
                        </div>
                    </form>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                {ingredients.map(ing => (
                    <div key={ing.id} className="glass-panel" style={{ padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontWeight: '600' }}>{ing.name}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{ing.minStock} {ing.unit} Min.</div>
                        </div>
                        <button onClick={() => handleDelete(ing.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>🗑️</button>
                    </div>
                ))}
            </div>
        </div>
    );
}
