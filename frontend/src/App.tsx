import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated } from './features/auth/authSlice';
import TopNav from './components/TopNav';
import SideNav from './components/SideNav';

import Dashboard from './pages/Dashboard';
import Map from './pages/Map';
import EvacuationCenters from './pages/EvacuationCenters';
import EmergencyHotlines from './pages/EmergencyHotlines';
import Announcements from './pages/Announcements';
import UserManagement from './pages/UserManagement';
import Reports from './pages/Reports';
import Evacuees from './pages/EvacueeInfos'; 
import Profile from './pages/Profile';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ForgotPassword1 from './pages/ForgotPassword1';
import ForgotPassword2 from './pages/ForgotPassword2';

// Protected Route Component
interface ProtectedRouteProps {
  children: React.ReactNode;
}

function ProtectedRoute({ children }: ProtectedRouteProps) {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

// Layout Component for authenticated pages
function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-screen">
      <SideNav />
      <div className="flex flex-col flex-1">
        <TopNav />
        <div className="flex-1 p-4 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

function App() {
  const isAuthenticated = useSelector(selectIsAuthenticated);

  return (
    <Routes>
      {/* Redirect root to appropriate page based on auth status */}
      <Route 
        path="/" 
        element={
          isAuthenticated ? 
            <Navigate to="/dashboard" replace /> : 
            <Navigate to="/login" replace />
        } 
      />
      
      {/* Login routes - redirect to dashboard if already authenticated */}
      <Route 
        path="/login" 
        element={
          isAuthenticated ? 
            <Navigate to="/dashboard" replace /> : 
            <Login />
        } 
      />
      <Route 
        path="/forgot-password" 
        element={
          isAuthenticated ? 
            <Navigate to="/dashboard" replace /> : 
            <ForgotPassword />
        } 
      />
      <Route 
        path="/forgot-password/verify" 
        element={
          isAuthenticated ? 
            <Navigate to="/dashboard" replace /> : 
            <ForgotPassword1 />
        } 
      />
      <Route 
        path="/forgot-password/reset" 
        element={
          isAuthenticated ? 
            <Navigate to="/dashboard" replace /> : 
            <ForgotPassword2 />
        } 
      />

      {/* Protected routes with layout */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <AppLayout>
            <Dashboard />
          </AppLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/map" element={
        <ProtectedRoute>
          <AppLayout>
            <Map />
          </AppLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/evacuee-informations" element={
        <ProtectedRoute>
          <AppLayout>
            <Evacuees />
          </AppLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/evacuation-centers" element={
        <ProtectedRoute>
          <AppLayout>
            <EvacuationCenters />
          </AppLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/reports" element={
        <ProtectedRoute>
          <AppLayout>
            <Reports />
          </AppLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/emergency-hotlines" element={
        <ProtectedRoute>
          <AppLayout>
            <EmergencyHotlines />
          </AppLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/announcements" element={
        <ProtectedRoute>
          <AppLayout>
            <Announcements />
          </AppLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/user-management" element={
        <ProtectedRoute>
          <AppLayout>
            <UserManagement />
          </AppLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/profile" element={
        <ProtectedRoute>
          <AppLayout>
            <Profile />
          </AppLayout>
        </ProtectedRoute>
      } />
    </Routes>
  );
}

export default App;
