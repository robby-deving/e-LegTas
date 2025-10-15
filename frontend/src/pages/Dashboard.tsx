import { usePageTitle } from '../hooks/usePageTitle';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../features/auth/authSlice';
import SystemAdminDashboard from '../components/SystemAdminDashboard';
import MainDashboard from '../components/Dashboard/Dashboard';
import CampManagerDashboard from '../components/Dashboard/CampManagerDashboard';
// import BarangayDashboard from '../components/Dashboard/BarangayDashboard';

export default function Dashboard(){
	usePageTitle('Dashboard');
	const user = useSelector(selectCurrentUser);
	
	return(
		<div className='text-black h-full'>
			{/* System Admin Dashboard */}
			{user?.role_id === 1 ? <SystemAdminDashboard /> : 
			 user?.role_id === 5 || user?.role_id === 7 ? <CampManagerDashboard /> : 
			 <MainDashboard />}
			{/* {user?.role_id === 1 ? <SystemAdminDashboard /> : 
			user?.role_id === 5 ? <CampManagerDashboard /> : 
			user?.role_id === 7 ? <BarangayDashboard /> : 
			<MainDashboard />} */}
			
			{/* Other role dashboards can be added here */}
			{/* {user?.role_id === 2 && <CDRRMODashboard />} */}
			{/* {user?.role_id === 3 && <CSWDODashboard />} */}
			{/* {user?.role_id === 4 && <CampManagerDashboard />} */}
		</div>
	);
}