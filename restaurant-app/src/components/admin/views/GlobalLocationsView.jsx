import React from 'react';

const GlobalLocationsView = ({ locations, onSelectLocation }) => {
    return (
        <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ margin: 0 }}>Alle Standorte</h2>
                <button
                    onClick={() => onSelectLocation({ id: 'new', name: 'Neuer Standort' })}
                    style={{
                        background: 'var(--primary)',
                        color: 'white',
                        border: 'none',
                        padding: '10px 20px',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        fontWeight: '600'
                    }}
                >
                    + Standort
                </button>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '20px'
            }}>
                {locations.map(loc => (
                    <div
                        key={loc.id}
                        onClick={() => onSelectLocation(loc)}
                        className="location-card"
                        onMouseEnter={e => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.2), 0 4px 10px rgba(0,0,0,0.1)';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.08)';
                        }}
                        style={{
                            background: 'linear-gradient(135deg, rgba(2, 6, 23, 0.95), rgba(15, 23, 42, 0.9))',
                            backdropFilter: 'blur(10px)',
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                            borderRadius: '16px',
                            padding: '18px 15px',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'flex-start',
                            alignItems: 'flex-start',
                            minHeight: '110px',
                            boxShadow: '0 4px 15px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.08)',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            textAlign: 'left',
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                    >
                        <h3 style={{
                            color: '#bfdbfe',
                            fontSize: '1.1rem',
                            lineHeight: '1.3',
                            fontWeight: '700',
                            letterSpacing: '-0.02em',
                            margin: '0 0 6px 0'
                        }}>{loc.name || loc.firmenname}</h3>

                        {loc.strasse && (
                            <p style={{
                                color: 'rgba(255,255,255,0.75)',
                                fontSize: '0.75rem',
                                margin: '0 0 4px 0',
                                fontWeight: '500',
                                width: '100%'
                            }}>
                                {loc.strasse} {loc.hausnummer}
                            </p>
                        )}
                        <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.75rem', margin: 0, fontWeight: '500', width: '100%' }}>
                            {loc.plz} {loc.ort}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default GlobalLocationsView;
