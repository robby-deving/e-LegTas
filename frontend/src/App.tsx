import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated } from './features/auth/authSlice';
import { PermissionProvider } from './contexts/PermissionContext';
import { useAutoLogoutOnTokenExpiry } from './features/auth/useAutoLogoutOnTokenExpiry';
import { useAutoRefreshToken } from './features/auth/useAutoRefreshToken';
import TopNav from './components/TopNav';
import SideNav from './components/SideNav';
import { PermissionGate } from './components/PermissionGate';
import StatusCodes from './components/StatusCodes';
import Dashboard from './pages/Dashboard';
import Map from './pages/Map';
import EvacuationCenters from './pages/EvacuationCenters';
import Announcements from './pages/Announcements';
import UserManagement from './pages/UserManagement';
import RoleModuleConfig from './pages/RoleModuleConfig';
import Reports from './pages/Reports';
import EvacuationInfo from './pages/EvacuationInfo'; 
import Profile from './pages/Profile';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ForgotPassword1 from './pages/ForgotPassword1';
import ForgotPassword2 from './pages/ForgotPassword2';
import DisasterDetail from './pages/DisasterDetail';
import EvacuationCenterDetail from './pages/EvacuationCenterDetail';

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
    <div className="flex h-screen w-screen overflow-hidden md:flex-row">
      <SideNav />
      <div className="flex flex-col flex-1 overflow-hidden">
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
  useAutoLogoutOnTokenExpiry();
  useAutoRefreshToken();

  return (
    <PermissionProvider>
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
            <PermissionGate 
              permission={["view_dashboard", "view_dashboard_specific"]} 
              fallback={<StatusCodes code={403} /> }
            >
              <AppLayout>
                <Dashboard />
              </AppLayout>
            </PermissionGate>
          </ProtectedRoute>
        } />
        
        <Route path="/map" element={
          <ProtectedRoute>
            <PermissionGate permission="view_map" fallback={<StatusCodes code={403} /> }>
              <AppLayout>
                <Map />
              </AppLayout>
            </PermissionGate>
          </ProtectedRoute>
        } />
        
        <Route path="/evacuation-information" element={
          <ProtectedRoute>
            <PermissionGate permission="view_disaster" fallback={<StatusCodes code={403} />}>
              <AppLayout>
                <EvacuationInfo />
              </AppLayout>
            </PermissionGate>
          </ProtectedRoute>
        } />
        
        <Route path="/evacuation-centers" element={
          <ProtectedRoute>
            <PermissionGate permission="view_evacuation_centers" fallback={<StatusCodes code={403} /> }>
              <AppLayout>
                <EvacuationCenters />
              </AppLayout>
            </PermissionGate>
          </ProtectedRoute>
        } />
        
        <Route path="/reports" element={
          <ProtectedRoute>
            <AppLayout>
              <Reports />
            </AppLayout>
          </ProtectedRoute>
        } />
        

        
        <Route path="/announcements" element={
          <ProtectedRoute>
            <PermissionGate permission="view_announcement_page" fallback={<StatusCodes code={403} /> }>
              <AppLayout>
                <Announcements />
              </AppLayout>
            </PermissionGate>
          </ProtectedRoute>
        } />
        
        <Route path="/user-management" element={
          <ProtectedRoute>
            <PermissionGate permission="view_user_management" fallback={<StatusCodes code={403} /> }>
              <AppLayout>
                <UserManagement />
              </AppLayout>
            </PermissionGate>
          </ProtectedRoute>
        } />
        
        <Route path="/role-module-config" element={
          <ProtectedRoute>
            <AppLayout>
              <RoleModuleConfig />
            </AppLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/profile" element={
          <ProtectedRoute>
            <PermissionGate permission="view_profile" fallback={<StatusCodes code={403} />}>
              <AppLayout>
                <Profile />
              </AppLayout>
            </PermissionGate>
          </ProtectedRoute>
        } />
        

        <Route path="/evacuation-information/:id" element={
          <ProtectedRoute>
            <PermissionGate permission="view_disaster" fallback={<StatusCodes code={403} />}>
              <AppLayout>
                <DisasterDetail />
              </AppLayout>
            </PermissionGate>
          </ProtectedRoute>
        } />
        <Route path="/evacuation-information/:id/:disasterEvacuationEventId" element={
          <ProtectedRoute>
            <PermissionGate permission="view_evacuee_information" fallback={<StatusCodes code={403} />}>
              <AppLayout>
                <EvacuationCenterDetail />
              </AppLayout>
            </PermissionGate>
          </ProtectedRoute>
        } />

        {/* Temporary testing route */}
      </Routes>
    </PermissionProvider>
  );
}

export default App;
