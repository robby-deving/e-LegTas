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
function App() {
  return (
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
  );
}

export default App;
