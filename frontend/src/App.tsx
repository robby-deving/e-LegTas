import { Routes, Route } from 'react-router-dom';
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

function App() {
  return (
    <Routes>
      {/* Login route - doesn't include navigation components */}
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/forgot-password/verify" element={<ForgotPassword1 />} />
      <Route path="/forgot-password/reset" element={<ForgotPassword2 />} />

      {/* All other routes - include navigation components */}
      <Route path="/*" element={
        <div className="flex h-screen w-screen">
          <SideNav />
          <div className="flex flex-col flex-1">
            <TopNav />
            <div className="flex-1 p-4 overflow-y-auto">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/map" element={<Map/>} />
                <Route path="/evacuee-informations" element={<Evacuees/>} />
                <Route path="/evacuation-centers" element={<EvacuationCenters/>} />
                <Route path="/reports" element={<Reports/>} />
                <Route path="/emergency-hotlines" element={<EmergencyHotlines/>} />
                <Route path="/announcements" element={<Announcements/>} />
                <Route path="/user-management" element={<UserManagement/>} />
                <Route path="/profile" element={<Profile/>} />
              </Routes>
            </div>
          </div>
        </div>
      } />
    </Routes>
  );
}

export default App;
