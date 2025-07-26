import { NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useDispatch } from 'react-redux'; 
import { logout as logoutAction } from '../features/auth/authSlice'; 
import { supabase } from '../lib/supabase'; 
import { useUserProfile } from '../hooks/useUserProfile';

import SideItem from "./SideItem";
import dashboardIcon from '../assets/dashboardIcon.svg';
import mapIcon from '../assets/GISIcon.svg';
import reportIcon from '../assets/reportsIcon.svg';
import emergencyHotlineIcon from '../assets/hotlineIcon.svg';
import announcementIcon from '../assets/announcementIcon.svg';
import userManagementIcon from '../assets/usersIcon.svg';
import evacuationCenterIcon from '../assets/evacuationIcon.svg';
import evacueeIcon from '../assets/evacueeIcon.svg';
import logo from '../assets/logo.svg';
import logout from '../assets/logout.svg';

import { ChevronLeft, ChevronRight } from 'lucide-react'; 

export default function SideNav() {
  const [collapsed, setCollapsed] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate(); 
  const { userProfile, loading } = useUserProfile(); // Add this hook

  const handleLogout = async () => {
    try {
      // Sign out from Supabase Auth
      await supabase.auth.signOut();
      
      // Clear Redux state
      dispatch(logoutAction());
      
      // Redirect to login page
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Even if Supabase logout fails, clear local state and redirect
      dispatch(logoutAction());
      navigate('/login');
    }
  };

  // Helper functions to get display values
  const getDisplayName = () => {
    if (loading) return 'Loading...';
    if (!userProfile) return 'Admin';
    
    const fullName = `${userProfile.firstName} ${userProfile.lastName}`.trim();
    return fullName || 'Admin';
  };

  const getDisplayEmail = () => {
    if (loading) return 'Loading...';
    return userProfile?.email || 'administrator@e-legtas.com';
  };

  const getUserInitials = () => {
    if (!userProfile || loading) return 'A';
    
    const firstInitial = userProfile.firstName?.charAt(0)?.toUpperCase() || '';
    const lastInitial = userProfile.lastName?.charAt(0)?.toUpperCase() || '';
    
    return firstInitial + lastInitial || 'A';
  };

  return (
    <div className={`relative h-full border-r-2 border-gray-200 bg-white py-5 flex flex-col transition-all duration-300
     ${collapsed ? 'w-20 px-2' : 'w-[20rem] px-5'}`}>

      {/* Toggle Button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute top-4 right-[-12px] z-10 bg-white border border-gray-300 shadow rounded-full p-1 transition-transform"
      >
        {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
      </button>

      {/* Logo */}
      <div className={`flex items-center gap-3 mb-7 px-3 ${collapsed ? 'justify-center' : ''}`}>
        <img src={logo} alt="Logo" className={`transition-all duration-300 ${collapsed ? 'h-12 w-12' : 'h-12 w-12'}`} />
        {!collapsed && (
          <h2 className="font-black text-3xl whitespace-nowrap">
            <span className="text-gray-500">e-</span>
            <span className="text-[#2BB673]">Leg</span>
            <span className="text-[#038B53]">Tas</span>
          </h2>
        )}
      </div>

      {/* Menu Items */}
      <SideItem collapsed={collapsed} icon={dashboardIcon} label="Dashboard" to="/dashboard" />
      <SideItem collapsed={collapsed} icon={mapIcon} label="Map" to="/map" />
      <SideItem collapsed={collapsed} icon={evacueeIcon} label="Evacuee Informations" to="/evacuee-informations" />
      <SideItem collapsed={collapsed} icon={evacuationCenterIcon} label="Evacuation Centers" to="/evacuation-centers" />
      <SideItem collapsed={collapsed} icon={reportIcon} label="Reports" to="/reports" />
      <SideItem collapsed={collapsed} icon={emergencyHotlineIcon} label="Emergency Hotlines" to="/emergency-hotlines" />
      <SideItem collapsed={collapsed} icon={announcementIcon} label="Announcements" to="/announcements" />
      <SideItem collapsed={collapsed} icon={userManagementIcon} label="User Management" to="/user-management" />

      <div className="flex flex-1" />

      {/* Logout */}
      <div 
        onClick={handleLogout}
        className={`flex items-center gap-3 px-5 py-2 rounded-sm text-black hover:bg-gray-100 cursor-pointer transition-colors font-medium
        ${collapsed ? 'justify-center' : ''}`}
      >
        <img className="h-5" src={logout} alt="Logout" />
        {!collapsed && <h2>Logout</h2>}
      </div>

      {/* Profile */}
      <NavLink to="/profile" className={`flex items-center mt-3 px-5 border-t-2 border-gray-100 pt-3
        ${collapsed ? 'justify-center' : 'gap-3'}`}>
        <div className={`bg-green-100 ${collapsed ? ' h-6 w-6' : "h-10 w-10"} rounded-full flex items-center justify-center`}>
          {!collapsed && (
            <span className="text-sm font-semibold text-green-700">
              {getUserInitials()}
            </span>
          )}
        </div>
        {!collapsed && (
          <div>
            <h2 className="text-sm text-black font-bold">{getDisplayName()}</h2>
            <p className="text-sm text-gray-500 whitespace-nowrap">{getDisplayEmail()}</p>
          </div>
        )}
      </NavLink>
    </div>
  );
}