import React, { useState } from 'react';
import { ref, push, update, remove } from 'firebase/database';
import { db } from '../../firebase';

export default function CategoryManager({ categories }) {
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState(null); // ID of category being edited
    const [parentId, setParentId] = useState(null); // Parent for the new category

    // Drag & Drop State
    const [draggedItem, setDraggedItem] = useState(null);
    const [dragOverItem, setDragOverItem] = useState(null);

    // Form States
    const [formData, setFormData] = useState({ name: '' });

    const handleStartAdd = (pId = null) => {
        setParentId(pId);
        setEditingId(null);
        setFormData({ name: '' });
        setIsAdding(true);
    };

    const handleStartEdit = (cat) => {
        setEditingId(cat.id);
        setParentId(cat.parentId);
        setFormData({ name: cat.name });
        setIsAdding(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!formData.name) return;

        // Determine level logic
        let level = 0;
        if (parentId) {
            const parent = categories.find(c => c.id === parentId);
            level = (parent?.level || 0) + 1;
        }

        if (level > 2) {
            alert("Maximal 2 Unterebenen erlaubt (Haupt -> Unter -> Unter-Unter)");
            return;
        }

        if (editingId) {
            await update(ref(db, `master_data/categories/${editingId}`), {
                name: formData.name,
            });
        } else {
            await push(ref(db, 'master_data/categories'), {
                name: formData.name,
                parentId: parentId || null,
                level,
                createdAt: new Date().toISOString()
            });
        }

        setIsAdding(false);
        setEditingId(null);
        setFormData({ name: '' });
        setParentId(null);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Kategorie löschen? ACHTUNG: Unterkategorien werden unsichtbar!')) {
            await remove(ref(db, `master_data/categories/${id}`));
        }
    }

    // --- Drag & Drop Handlers ---
    const onDragStart = (e, cat) => {
        e.dataTransfer.setData("text/plain", cat.id);
        e.dataTransfer.effectAllowed = "move";
        setDraggedItem(cat);
    };

    const onDragOver = (e, cat) => {
        e.preventDefault(); // Necessary to allow dropping
        e.dataTransfer.dropEffect = "move";
        if (draggedItem && draggedItem.id !== cat.id) {
            setDragOverItem(cat);
        }
    };

    const onDrop = async (e, targetCat) => {
        e.preventDefault();
        const droppedCatId = e.dataTransfer.getData("text/plain");
        setDragOverItem(null);
        setDraggedItem(null);

        if (!droppedCatId) return;
        if (droppedCatId === targetCat.id) return; // Dropped on itself

        // Logic: Dropping Cat A onto Cat B makes A a child of B
        const droppedCat = categories.find(c => c.id === droppedCatId);
        if (!droppedCat) return;

        // Prevent cycles
        let ptr = targetCat;
        while (ptr) {
            if (ptr.id === droppedCat.id) {
                alert("Kann nicht in eigenes Kind verschoben werden!");
                return;
            }
            ptr = categories.find(c => c.id === ptr.parentId);
        }

        const newLevel = targetCat.level + 1;
        if (newLevel > 2) {
            alert("Verschieben nicht möglich: Maximale Tiefe (2) überschritten.");
            return;
        }

        if (window.confirm(`"${droppedCat.name}" in "${targetCat.name}" verschieben?`)) {
            await update(ref(db, `master_data/categories/${droppedCat.id}`), {
                parentId: targetCat.id,
                level: newLevel
            });
            updateChildrenLevels(droppedCat.id, newLevel);
        }
    };

    const updateChildrenLevels = async (parentId, parentLevel) => {
        const children = categories.filter(c => c.parentId === parentId);
        for (const child of children) {
            await update(ref(db, `master_data/categories/${child.id}`), {
                level: parentLevel + 1
            });
            updateChildrenLevels(child.id, parentLevel + 1);
        }
    };

    // --- Manual Reordering Handlers ---
    const handleMove = async (cat, direction) => {
        const siblings = sortedCategories.filter(c =>
            (c.parentId === cat.parentId) ||
            (cat.parentId === undefined && (c.parentId === null || c.parentId === undefined))
        );

        const currentIndex = siblings.findIndex(s => s.id === cat.id);
        if (currentIndex === -1) return;

        let swapTarget = null;
        if (direction === 'up' && currentIndex > 0) {
            swapTarget = siblings[currentIndex - 1];
        } else if (direction === 'down' && currentIndex < siblings.length - 1) {
            swapTarget = siblings[currentIndex + 1];
        }

        if (swapTarget) {
            let order1 = cat.order !== undefined ? cat.order : 0;
            let order2 = swapTarget.order !== undefined ? swapTarget.order : 0;

            if (order1 === order2) {
                // re-index
                const updates = {};
                siblings.forEach((s, idx) => {
                    let newOrder = idx * 10;
                    if (s.id === cat.id && direction === 'up') newOrder -= 15;
                    if (s.id === cat.id && direction === 'down') newOrder += 15;
                    updates[`master_data/categories/${s.id}/order`] = newOrder;
                });
                await update(ref(db), updates);
            } else {
                await update(ref(db), {
                    [`master_data/categories/${cat.id}/order`]: order2,
                    [`master_data/categories/${swapTarget.id}/order`]: order1
                });
            }
        }
    };

    // Sort categories: Order first, then Name
    const sortedCategories = [...categories].sort((a, b) => {
        const orderA = a.order !== undefined ? a.order : 0;
        const orderB = b.order !== undefined ? b.order : 0;
        if (orderA !== orderB) return orderA - orderB;
        return a.name.localeCompare(b.name);
    });

    // Recursive Table Row Renderer
    const renderRows = (pId = null, depth = 0) => {
        const levelCats = sortedCategories.filter(c => pId === null ? (c.parentId === null || c.parentId === undefined) : c.parentId === pId);

        if (levelCats.length === 0) return [];

        return levelCats.map((cat, idx) => (
            <React.Fragment key={cat.id}>
                <div
                    draggable
                    onDragStart={(e) => onDragStart(e, cat)}
                    onDragOver={(e) => onDragOver(e, cat)}
                    onDrop={(e) => onDrop(e, cat)}
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'auto 1fr auto', // 3 columns!
                        padding: '12px 15px',
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        background: dragOverItem?.id === cat.id ? 'rgba(59, 130, 246, 0.3)' : (depth === 0 ? 'rgba(255,255,255,0.02)' : 'transparent'),
                        alignItems: 'center',
                        gap: '15px',
                        borderLeft: dragOverItem?.id === cat.id ? '3px solid #3b82f6' : '3px solid transparent',
                        cursor: 'grab'
                    }}
                >
                    {/* Reorder Arrows */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '20px' }}>
                        <button
                            disabled={idx === 0}
                            onClick={() => handleMove(cat, 'up')}
                            style={{
                                background: 'none', border: 'none', color: idx === 0 ? 'rgba(255,255,255,0.1)' : 'var(--text-muted)',
                                cursor: idx === 0 ? 'default' : 'pointer', fontSize: '0.8rem', padding: 0, lineHeight: 1
                            }}
                        >
                            ▲
                        </button>
                        <button
                            disabled={idx === levelCats.length - 1}
                            onClick={() => handleMove(cat, 'down')}
                            style={{
                                background: 'none', border: 'none', color: idx === levelCats.length - 1 ? 'rgba(255,255,255,0.1)' : 'var(--text-muted)',
                                cursor: idx === levelCats.length - 1 ? 'default' : 'pointer', fontSize: '0.8rem', padding: 0, lineHeight: 1
                            }}
                        >
                            ▼
                        </button>
                    </div>

                    <div style={{ paddingLeft: `${depth * 25}px`, display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>{depth === 0 ? '📂' : '↳'}</span>
                        <span style={{ fontWeight: depth === 0 ? '600' : '400', fontSize: depth === 0 ? '1rem' : '0.9rem' }}>
                            {cat.name}
                        </span>
                        {cat.importedFrom && <span style={{ fontSize: '0.7rem', background: '#3b82f6', padding: '2px 6px', borderRadius: '4px' }}>Import</span>}
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        {cat.level < 2 && (
                            <button
                                onClick={() => handleStartAdd(cat.id)}
                                title="Add Sub"
                                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'var(--primary)', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer' }}
                            >
                                + Sub
                            </button>
                        )}
                        <button
                            onClick={() => handleStartEdit(cat)}
                            title="Edit"
                            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', borderRadius: '6px', padding: '6px', cursor: 'pointer' }}
                        >
                            ✏️
                        </button>
                        <button
                            onClick={() => handleDelete(cat.id)}
                            title="Delete"
                            style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#ef4444', borderRadius: '6px', padding: '6px', cursor: 'pointer' }}
                        >
                            🗑️
                        </button>
                    </div>
                </div>
                {renderRows(cat.id, depth + 1)}
            </React.Fragment>
        ));
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3>Kategorie-Struktur (Verschieben & Sortieren)</h3>
                <button onClick={() => handleStartAdd(null)} className="action-btn">+ Hauptkategorie</button>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '-15px', marginBottom: '20px' }}>
                <span style={{ marginRight: '15px' }}>↕️ <b>Sortieren:</b> Nutze die Pfeile links.</span>
                <span>🖱️ <b>Unterkategorie:</b> Kategorie auf eine andere ziehen (Drop).</span>
            </p>

            {isAdding && (
                <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px', border: '1px solid var(--primary)' }}>
                    <h4 style={{ margin: '0 0 15px 0' }}>
                        {editingId ? 'Kategorie bearbeiten' : (parentId ? 'Neue Unterkategorie' : 'Neue Hauptkategorie')}
                    </h4>
                    <form onSubmit={handleSave} style={{ display: 'flex', gap: '10px' }}>
                        <input
                            className="login-input"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Name der Kategorie"
                            autoFocus
                            style={{ flex: 1 }}
                        />
                        <button type="submit" className="action-btn" style={{ background: 'var(--primary)' }}>Speichern</button>
                        <button type="button" className="action-btn" onClick={() => setIsAdding(false)}>Abbrechen</button>
                    </form>
                </div>
            )}

            <div className="glass-panel" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', padding: '15px', background: 'rgba(255,255,255,0.05)', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ width: '20px' }}></div>
                    <div>Name</div>
                    <div>Aktionen</div>
                </div>

                <div style={{ overflowY: 'auto', flex: 1 }}>
                    {renderRows(null, 0)}
                    {categories.length === 0 && <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>Keine Kategorien vorhanden.</div>}
                </div>
            </div>
        </div>
    );
}
