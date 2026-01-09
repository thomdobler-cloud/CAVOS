import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, onValue } from 'firebase/database';
import { auth, db } from './firebase';
import Login from './components/Login';
import Register from './components/Register';
import ForgotPassword from './components/ForgotPassword';
import Onboarding from './components/Onboarding';
import EmailVerification from './components/EmailVerification';
import WaitingForApproval from './components/WaitingForApproval';

import AdminDashboard from './components/AdminDashboard';
import Menu from './components/Menu';

function ProtectedRoute({ children, requireAdmin = false }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        // Fetch user data including role and profile status
        const userRef = ref(db, `users/${currentUser.uid}`);
        const unsubscribeDB = onValue(userRef, (snapshot) => {
          const data = snapshot.val();
          setUserData(data);
          setLoading(false);
        });
        return () => unsubscribeDB();
      } else {
        setUserData(null);
        setLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  if (loading) return <div style={{ color: 'white' }}>Loading...</div>;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // --- ONBOARDING LOGIC ---
  const isProfileComplete = userData?.isProfileComplete === true;
  const onboardingStatus = userData?.onboardingStatus;
  const isOnboardingPage = location.pathname === '/onboarding';
  const isMsgPage = location.pathname === '/verify-email' || location.pathname === '/waiting-approval';

  // 1. If not submitted yet -> Force Onboarding
  if (!onboardingStatus && !isOnboardingPage && userData?.role !== 'admin') {
    return <Navigate to="/onboarding" replace />;
  }

  // 2. If submitted but pending verify -> Force Verify Page
  if (onboardingStatus === 'pending_verification') {
    if (location.pathname !== '/verify-email') {
      return <Navigate to="/verify-email" replace />;
    }
    return children; // Explicitly allow rendering children (EmailVerification comp)
  }

  // 3. If verified but not active -> Force Wait Page
  if ((onboardingStatus === 'verified' || onboardingStatus === 'active') && !isProfileComplete && location.pathname !== '/waiting-approval') {
    return <Navigate to="/waiting-approval" replace />;
  }

  // 4. If active (isProfileComplete true) -> Allow Dashboard, Block Onboarding pages
  if (isProfileComplete && (isOnboardingPage || isMsgPage)) {
    return <Navigate to="/dashboard" replace />;
  }
  // ------------------------

  // Check if admin is required
  if (requireAdmin && userData?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Public Onboarding for new registrations */}
        <Route path="/onboarding" element={<Onboarding />} />

        {/* Verification Routes (still protected as they require auth logic or can handle redirect) */}
        <Route path="/verify-email" element={<ProtectedRoute><EmailVerification /></ProtectedRoute>} />
        <Route path="/waiting-approval" element={<ProtectedRoute><WaitingForApproval /></ProtectedRoute>} />

        <Route
          path="/admin"
          element={
            <ProtectedRoute requireAdmin={true}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/menu"
          element={
            <ProtectedRoute>
              <Menu />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/admin" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
