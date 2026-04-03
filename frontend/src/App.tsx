// @ts-nocheck
import './App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Toaster } from './components/ui/sonner';

// Pages
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import MemberDashboard from './pages/MemberDashboard';
import ProfilePage from './pages/ProfilePage';
import PaymentCallbackPage from './pages/PaymentCallbackPage';
import AdminDashboard from './pages/AdminDashboard';
import AdminMembers from './pages/AdminMembers';
import AdminMemberEdit from './pages/AdminMemberEdit';
import AdminPayments from './pages/AdminPayments';
import AdminSettings from './pages/AdminSettings';
import AdminClubUpdates from './pages/AdminClubUpdates';

const ProtectedRoute = ({
  children,
  adminOnly = false,
  memberOnly = false
}: {
  children: React.ReactNode;
  adminOnly?: boolean;
  memberOnly?: boolean;
}) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505]">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  if (memberOnly && user.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505]">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (user) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />;
  }

  return <>{children}</>;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><SignupPage /></PublicRoute>} />
      
      <Route path="/dashboard" element={<ProtectedRoute memberOnly><MemberDashboard /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute memberOnly><ProfilePage /></ProtectedRoute>} />
      <Route path="/payment/callback" element={<ProtectedRoute memberOnly><PaymentCallbackPage /></ProtectedRoute>} />
      
      <Route path="/admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/members" element={<ProtectedRoute adminOnly><AdminMembers /></ProtectedRoute>} />
      <Route path="/admin/members/:userId/edit" element={<ProtectedRoute adminOnly><AdminMemberEdit /></ProtectedRoute>} />
      <Route path="/admin/payments" element={<ProtectedRoute adminOnly><AdminPayments /></ProtectedRoute>} />
      <Route path="/admin/settings" element={<ProtectedRoute adminOnly><AdminSettings /></ProtectedRoute>} />
      <Route path="/admin/club-updates" element={<ProtectedRoute adminOnly><AdminClubUpdates /></ProtectedRoute>} />
      
      <Route path="/" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
          <Toaster position="top-right" />
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}

export default App;
