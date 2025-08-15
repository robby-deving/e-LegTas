import { NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux'; 
import { logout as logoutAction, selectCurrentUser } from '../features/auth/authSlice'; 
import { supabase } from '../lib/supabase';

import SideItem from "./SideItem";
import dashboardIcon from '../assets/dashboardIcon.svg';
import mapIcon from '../assets/GISIcon.svg';
import reportIcon from '../assets/reportsIcon.svg';
import announcementIcon from '../assets/announcementIcon.svg';
import userManagementIcon from '../assets/usersIcon.svg';
import evacuationCenterIcon from '../assets/evacuationIcon.svg';
import evacueeIcon from '../assets/evacueeIcon.svg';
import roleModuleConfigIcon from '../assets/roleModuleConfigIcon.svg';
import logo from '../assets/logo.svg';
import logout from '../assets/logout.svg';

import { ChevronLeft, ChevronRight } from 'lucide-react'; 
import { usePermissions } from '../contexts/PermissionContext';

export default function SideNav() {
  const [collapsed, setCollapsed] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate(); 
  
  // Get user data using consistent selector pattern
  const user = useSelector(selectCurrentUser);
  const { hasPermission } = usePermissions();
  const canViewMap = hasPermission('view_map');
  const canViewEvacCenters = hasPermission('view_evacuation_centers');
  const canViewUserManagement = hasPermission('view_user_management');
  const canViewAnnouncements = hasPermission('view_announcement_page');

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      dispatch(logoutAction());
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      dispatch(logoutAction());
      navigate('/login');
    }
  };

  // Simplified helper functions using Redux data
  const getDisplayName = () => {
    if (!user) return 'Admin';
    
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
    return fullName || 'Admin';
  };

  const getDisplayEmail = () => {
    return user?.email || 'administrator@e-legtas.com';
  };

  const getUserInitials = () => {
    if (!user) return 'A';
    
    const firstInitial = user.first_name?.charAt(0)?.toUpperCase() || '';
    const lastInitial = user.last_name?.charAt(0)?.toUpperCase() || '';
    
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
          <h2 className="font-black text-3xl whitespace-nowrap ">
            <span className="text-gray-500">e-</span>
            <span className="text-[#2BB673]">Leg</span>
            <span className="text-[#038B53]">Tas</span>
          </h2>
        )}
      </div>

      {/* Menu Items */}
      <SideItem collapsed={collapsed} icon={dashboardIcon} label="Dashboard" to="/dashboard" />
      
      {/* Show different menu items based on role */}
      {user?.role_id === 1 ? (
        // System Admin (role_id: 1) - Only Dashboard, User Management, and Role & Module Configuration
        <>
          {canViewUserManagement && (
            <SideItem collapsed={collapsed} icon={userManagementIcon} label="User Management" to="/user-management" />
          )}
          <SideItem collapsed={collapsed} icon={roleModuleConfigIcon} label="Role & Module Config" to="/role-module-config" />
        </>
      ) : (
        // All other roles - Show all other menu items
        <>
          {canViewMap && (
            <SideItem collapsed={collapsed} icon={mapIcon} label="Map" to="/map" />
          )}
          <SideItem collapsed={collapsed} icon={evacueeIcon} label="Evacuee Information" to="/evacuation-information" />
          {canViewEvacCenters && (
            <SideItem collapsed={collapsed} icon={evacuationCenterIcon} label="Evacuation Centers" to="/evacuation-centers" />
          )}
          <SideItem collapsed={collapsed} icon={reportIcon} label="Reports" to="/reports" />
          {canViewAnnouncements && (
            <SideItem collapsed={collapsed} icon={announcementIcon} label="Announcements" to="/announcements" />
          )}
          {canViewUserManagement && (
            <SideItem collapsed={collapsed} icon={userManagementIcon} label="User Management" to="/user-management" />
          )}
        </>
      )}

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