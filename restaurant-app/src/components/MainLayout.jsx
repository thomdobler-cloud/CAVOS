import React from 'react';

const MainLayout = ({
    children,
    title = 'CAVOS Manager',
    subtitle,
    onBack,
    showLogout = false,
    handleLogout,
    dockItems = []
}) => {

    // Top Header Style
    const headerStyle = {
        position: 'fixed',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '90%',
        maxWidth: '1200px',
        height: '60px',
        background: 'rgba(20, 30, 50, 0.6)', // Semi-transparent dark
        backdropFilter: 'blur(15px)',
        WebkitBackdropFilter: 'blur(15px)',
        borderRadius: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
        zIndex: 1000,
        transition: 'all 0.3s ease'
    };

    // Bottom Dock Style
    const dockStyle = {
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(20, 30, 50, 0.8)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: '30px',
        display: 'flex',
        alignItems: 'center',
        gap: '15px',
        padding: '10px 20px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
        zIndex: 1000
    };

    // Action Button Style (Header)
    const actionButtonStyle = {
        background: 'rgba(255, 255, 255, 0.1)',
        border: 'none',
        borderRadius: '12px',
        width: '40px',
        height: '40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        cursor: 'pointer',
        fontSize: '1.2rem',
        transition: 'all 0.2s ease'
    };

    // Dock Item Style
    const getDockItemStyle = (isActive) => ({
        background: isActive
            ? 'linear-gradient(135deg, rgba(37, 99, 235, 0.3), rgba(37, 99, 235, 0.1))'
            : 'rgba(255, 255, 255, 0.05)',
        border: isActive ? '1px solid rgba(37, 99, 235, 0.3)' : '1px solid transparent',
        borderRadius: '16px',
        padding: '10px 20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: isActive ? '#fff' : 'rgba(255, 255, 255, 0.6)',
        cursor: 'pointer',
        minWidth: '80px',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
    });

    return (
        <div style={{ minHeight: '100vh', padding: '100px 20px 120px 20px', position: 'relative' }}>

            {/* Top Header */}
            <header style={headerStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    {onBack && (
                        <button
                            onClick={onBack}
                            style={actionButtonStyle}
                            onMouseOver={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
                            onMouseOut={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                        >
                            ↩
                        </button>
                    )}
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, letterSpacing: '-0.01em', color: '#fff' }}>
                            {title}
                        </h1>
                        {subtitle && (
                            <span style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.5)' }}>
                                {subtitle}
                            </span>
                        )}
                    </div>
                </div>

                {showLogout && (
                    <button
                        onClick={handleLogout}
                        style={{ ...actionButtonStyle, background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}
                        onMouseOver={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                        onMouseOut={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                        title="Sign Out"
                    >
                        ⏻
                    </button>
                )}
            </header>

            {/* Main Content Area */}
            <main style={{ maxWidth: '1200px', margin: '0 auto' }}>
                {children}
            </main>

            {/* Bottom Dock (Only if items exist) */}
            {dockItems.length > 0 && (
                <div style={dockStyle}>
                    {dockItems.map((item, index) => (
                        <div
                            key={index}
                            onClick={item.onClick}
                            style={{ position: 'relative', ...getDockItemStyle(item.isActive) }}
                            onMouseOver={e => {
                                if (!item.isActive) {
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                                    e.currentTarget.style.transform = 'translateY(-5px)';
                                }
                            }}
                            onMouseOut={e => {
                                if (!item.isActive) {
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                }
                            }}
                        >
                            {item.badge > 0 && (
                                <div style={{
                                    position: 'absolute', top: '-5px', right: '-5px',
                                    background: '#ef4444', color: 'white',
                                    borderRadius: '50%', width: '20px', height: '20px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '0.75rem', fontWeight: 'bold',
                                    boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
                                    zIndex: 10
                                }}>
                                    {item.badge}
                                </div>
                            )}
                            <span style={{ fontSize: '1.5rem', marginBottom: '4px', opacity: item.isActive ? 1 : 0.6 }}>{item.icon}</span>
                            <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>{item.label}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MainLayout;
