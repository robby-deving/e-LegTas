import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { selectToken } from '../features/auth/authSlice';
import StatCard from './StatCard';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from './ui/table';
import { Pagination } from './ui/pagination';
import LoadingSpinner from './loadingSpinner';

interface UserStats {
    cdrrmo: number;
    cswdo: number;
    campManager: number;
    barangayOfficial: number;
    allUsers: number;
}

interface RecentUser {
    id: number;
    full_name: string;
    email: string;
    role_id: number;
    role_name: string;
    barangay: string;
}

export default function SystemAdminDashboard() {
    
    const token = useSelector(selectToken);
    const navigate = useNavigate();
    
    // Helper function to get role color for borders and text
    const getRoleColor = (roleId: number) => {
        const roleColorMap: { [key: number]: string } = {
            1: '#FBB040', // System Admin
            2: '#038B53', // CDRRMO/Barangay Official
            3: '#038B53', // CDRRMO/Regional Coordinator  
            4: '#0192D4', // CSWDO
            5: '#F15A29', // Camp Manager
            7: '#9747FF'  // Barangay Official
        };
        
        return roleColorMap[roleId] || '#6B7280'; // Default gray color
    };
    
    // State for user statistics
    const [userStats, setUserStats] = useState<UserStats>({
        cdrrmo: 0,
        cswdo: 0,
        campManager: 0,
        barangayOfficial: 0,
        allUsers: 0
    });
    
    // State for recent users
    const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    
    // Helper function to get auth headers
    const getAuthHeaders = (): Record<string, string> => {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json'
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        return headers;
    };
    
    // Fetch user statistics using role-counts endpoint
    const fetchUserStats = async () => {
        try {
            const response = await fetch('/api/v1/users/role-counts', {
                headers: getAuthHeaders()
            });
            if (!response.ok) {
                throw new Error('Failed to fetch user statistics');
            }
            const data = await response.json();
            const roleCounts = data.roleCounts || {};
            
            // Map the role counts to our UserStats interface
            setUserStats({
                cdrrmo: (roleCounts['2'] || 0) + (roleCounts['3'] || 0), // CDRRMO (2) + Regional Coordinator (3)
                cswdo: roleCounts['4'] || 0,
                campManager: roleCounts['5'] || 0,
                barangayOfficial: roleCounts['7'] || 0,
                allUsers: Object.values(roleCounts)
                    .filter((count): count is number => typeof count === 'number')
                    .reduce((sum, count) => sum + count, 0)
            });
        } catch (err) {
            console.error('Error fetching user stats:', err);
        }
    };
    
    // Fetch recent users
    const fetchRecentUsers = async () => {
        try {
            const response = await fetch('/api/v1/users/recent', {
                headers: getAuthHeaders()
            });
            if (!response.ok) {
                throw new Error('Failed to fetch recent users');
            }
            const data = await response.json();
            setRecentUsers(data.data || []);
        } catch (err) {
            console.error('Error fetching recent users:', err);
        }
    };
    
    // Load data on component mount
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            await Promise.all([fetchUserStats(), fetchRecentUsers()]);
            setLoading(false);
        };
        
        loadData();
    }, []);
    
    // Pagination logic
    const totalUsers = recentUsers.length;
    const totalPages = Math.ceil(totalUsers / rowsPerPage);
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const displayedUsers = recentUsers.slice(startIndex, endIndex);
    
    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };
    
    const handleRowsPerPageChange = (rows: number) => {
        setRowsPerPage(rows);
        setCurrentPage(1); // Reset to first page when changing rows per page
    };

    return (
        <div className='h-full flex flex-col text-black p-10'>
            <h1 
                className='font-bold mb-6'
                style={{ 
                    color: '#00824E', 
                    fontSize: '32px' 
                }}
            >
                Dashboard
            </h1>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-6 flex-shrink-0">
                <StatCard
                    title="CDRRMO"
                    value={loading ? '...' : (userStats?.cdrrmo ?? 0)}
                    valueClassName="text-emerald-600"
                    icon={
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 20 20" fill="none">
                            <path fillRule="evenodd" clipRule="evenodd" d="M6.875 7.5C7.37228 7.5 7.84919 7.30246 8.20083 6.95083C8.55246 6.59919 8.75 6.12228 8.75 5.625C8.75 5.12772 8.55246 4.65081 8.20083 4.29917C7.84919 3.94754 7.37228 3.75 6.875 3.75C6.37772 3.75 5.90081 3.94754 5.54917 4.29917C5.19754 4.65081 5 5.12772 5 5.625C5 6.12228 5.19754 6.59919 5.54917 6.95083C5.90081 7.30246 6.37772 7.5 6.875 7.5ZM6.875 9.375C7.86956 9.375 8.82339 8.97991 9.52665 8.27665C10.2299 7.57339 10.625 6.61956 10.625 5.625C10.625 4.63044 10.2299 3.67661 9.52665 2.97335C8.82339 2.27009 7.86956 1.875 6.875 1.875C5.88044 1.875 4.92661 2.27009 4.22335 2.97335C3.52009 3.67661 3.125 4.63044 3.125 5.625C3.125 6.61956 3.52009 7.57339 4.22335 8.27665C4.92661 8.97991 5.88044 9.375 6.875 9.375ZM3.08875 12.9825C2.1175 13.6575 1.875 14.3113 1.875 14.615C1.875 15.1725 2.3275 15.625 2.885 15.625H10.865C11.1327 15.6243 11.3892 15.5177 11.5784 15.3284C11.7677 15.1392 11.8743 14.8827 11.875 14.615C11.875 14.31 11.6325 13.6562 10.6613 12.9825C9.74 12.3438 8.39875 11.875 6.875 11.875C5.35125 11.875 4.01 12.3438 3.08875 12.9825ZM0 14.615C0 12.3075 3.09375 10 6.875 10C8.35 10 9.7225 10.3513 10.8463 10.9175C11.9224 10.3092 13.1389 9.99287 14.375 10C17.4688 10 20 11.9225 20 13.8462C20 14.4838 19.7467 15.0952 19.296 15.546C18.8452 15.9967 18.2338 16.25 17.5962 16.25H13.2425C12.7225 17.005 11.8513 17.5 10.865 17.5H2.885C2.12005 17.4993 1.38663 17.1952 0.845728 16.6543C0.304829 16.1134 0.000662005 15.3799 0 14.615ZM13.7388 14.375H17.5962C17.8888 14.375 18.125 14.1375 18.125 13.8462C18.125 13.7175 18.005 13.2563 17.265 12.7338C16.5725 12.2425 15.5463 11.875 14.375 11.875C13.7288 11.875 13.1263 11.9875 12.6 12.17C13.2575 12.8375 13.6675 13.6025 13.7388 14.375ZM15.625 6.25C15.625 6.58152 15.4933 6.89946 15.2589 7.13388C15.0245 7.3683 14.7065 7.5 14.375 7.5C14.0435 7.5 13.7255 7.3683 13.4911 7.13388C13.2567 6.89946 13.125 6.58152 13.125 6.25C13.125 5.91848 13.2567 5.60054 13.4911 5.36612C13.7255 5.1317 14.0435 5 14.375 5C14.7065 5 15.0245 5.1317 15.2589 5.36612C15.4933 5.60054 15.625 5.91848 15.625 6.25ZM17.5 6.25C17.5 7.0788 17.1708 7.87366 16.5847 8.45971C15.9987 9.04576 15.2038 9.375 14.375 9.375C13.5462 9.375 12.7513 9.04576 12.1653 8.45971C11.5792 7.87366 11.25 7.0788 11.25 6.25C11.25 5.4212 11.5792 4.62634 12.1653 4.04029C12.7513 3.45424 13.5462 3.125 14.375 3.125C15.2038 3.125 15.9987 3.45424 16.5847 4.04029C17.1708 4.62634 17.5 5.4212 17.5 6.25Z" fill="#038B53"/>
                        </svg>
                    }
                />
                <StatCard
                    title="CSWDO"
                    value={loading ? '...' : (userStats?.cswdo ?? 0)}
                    valueClassName="text-sky-500"
                    icon={
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 20 20" fill="none">
                            <path fillRule="evenodd" clipRule="evenodd" d="M6.875 7.5C7.37228 7.5 7.84919 7.30246 8.20083 6.95083C8.55246 6.59919 8.75 6.12228 8.75 5.625C8.75 5.12772 8.55246 4.65081 8.20083 4.29917C7.84919 3.94754 7.37228 3.75 6.875 3.75C6.37772 3.75 5.90081 3.94754 5.54917 4.29917C5.19754 4.65081 5 5.12772 5 5.625C5 6.12228 5.19754 6.59919 5.54917 6.95083C5.90081 7.30246 6.37772 7.5 6.875 7.5ZM6.875 9.375C7.86956 9.375 8.82339 8.97991 9.52665 8.27665C10.2299 7.57339 10.625 6.61956 10.625 5.625C10.625 4.63044 10.2299 3.67661 9.52665 2.97335C8.82339 2.27009 7.86956 1.875 6.875 1.875C5.88044 1.875 4.92661 2.27009 4.22335 2.97335C3.52009 3.67661 3.125 4.63044 3.125 5.625C3.125 6.61956 3.52009 7.57339 4.22335 8.27665C4.92661 8.97991 5.88044 9.375 6.875 9.375ZM3.08875 12.9825C2.1175 13.6575 1.875 14.3113 1.875 14.615C1.875 15.1725 2.3275 15.625 2.885 15.625H10.865C11.1327 15.6243 11.3892 15.5177 11.5784 15.3284C11.7677 15.1392 11.8743 14.8827 11.875 14.615C11.875 14.31 11.6325 13.6562 10.6613 12.9825C9.74 12.3438 8.39875 11.875 6.875 11.875C5.35125 11.875 4.01 12.3438 3.08875 12.9825ZM0 14.615C0 12.3075 3.09375 10 6.875 10C8.35 10 9.7225 10.3513 10.8463 10.9175C11.9224 10.3092 13.1389 9.99287 14.375 10C17.4688 10 20 11.9225 20 13.8462C20 14.4838 19.7467 15.0952 19.296 15.546C18.8452 15.9967 18.2338 16.25 17.5962 16.25H13.2425C12.7225 17.005 11.8513 17.5 10.865 17.5H2.885C2.12005 17.4993 1.38663 17.1952 0.845728 16.6543C0.304829 16.1134 0.000662005 15.3799 0 14.615ZM13.7388 14.375H17.5962C17.8888 14.375 18.125 14.1375 18.125 13.8462C18.125 13.7175 18.005 13.2563 17.265 12.7338C16.5725 12.2425 15.5463 11.875 14.375 11.875C13.7288 11.875 13.1263 11.9875 12.6 12.17C13.2575 12.8375 13.6675 13.6025 13.7388 14.375ZM15.625 6.25C15.625 6.58152 15.4933 6.89946 15.2589 7.13388C15.0245 7.3683 14.7065 7.5 14.375 7.5C14.0435 7.5 13.7255 7.3683 13.4911 7.13388C13.2567 6.89946 13.125 6.58152 13.125 6.25C13.125 5.91848 13.2567 5.60054 13.4911 5.36612C13.7255 5.1317 14.0435 5 14.375 5C14.7065 5 15.0245 5.1317 15.2589 5.36612C15.4933 5.60054 15.625 5.91848 15.625 6.25ZM17.5 6.25C17.5 7.0788 17.1708 7.87366 16.5847 8.45971C15.9987 9.04576 15.2038 9.375 14.375 9.375C13.5462 9.375 12.7513 9.04576 12.1653 8.45971C11.5792 7.87366 11.25 7.0788 11.25 6.25C11.25 5.4212 11.5792 4.62634 12.1653 4.04029C12.7513 3.45424 13.5462 3.125 14.375 3.125C15.2038 3.125 15.9987 3.45424 16.5847 4.04029C17.1708 4.62634 17.5 5.4212 17.5 6.25Z" fill="#0192D4"/>
                        </svg>
                    }
                />
                <StatCard
                    title="Camp Manager"
                    value={loading ? '...' : (userStats?.campManager ?? 0)}
                    valueClassName="text-amber-500"
                    icon={
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 20 20" fill="none">
                            <path fillRule="evenodd" clipRule="evenodd" d="M6.875 7.5C7.37228 7.5 7.84919 7.30246 8.20083 6.95083C8.55246 6.59919 8.75 6.12228 8.75 5.625C8.75 5.12772 8.55246 4.65081 8.20083 4.29917C7.84919 3.94754 7.37228 3.75 6.875 3.75C6.37772 3.75 5.90081 3.94754 5.54917 4.29917C5.19754 4.65081 5 5.12772 5 5.625C5 6.12228 5.19754 6.59919 5.54917 6.95083C5.90081 7.30246 6.37772 7.5 6.875 7.5ZM6.875 9.375C7.86956 9.375 8.82339 8.97991 9.52665 8.27665C10.2299 7.57339 10.625 6.61956 10.625 5.625C10.625 4.63044 10.2299 3.67661 9.52665 2.97335C8.82339 2.27009 7.86956 1.875 6.875 1.875C5.88044 1.875 4.92661 2.27009 4.22335 2.97335C3.52009 3.67661 3.125 4.63044 3.125 5.625C3.125 6.61956 3.52009 7.57339 4.22335 8.27665C4.92661 8.97991 5.88044 9.375 6.875 9.375ZM3.08875 12.9825C2.1175 13.6575 1.875 14.3113 1.875 14.615C1.875 15.1725 2.3275 15.625 2.885 15.625H10.865C11.1327 15.6243 11.3892 15.5177 11.5784 15.3284C11.7677 15.1392 11.8743 14.8827 11.875 14.615C11.875 14.31 11.6325 13.6562 10.6613 12.9825C9.74 12.3438 8.39875 11.875 6.875 11.875C5.35125 11.875 4.01 12.3438 3.08875 12.9825ZM0 14.615C0 12.3075 3.09375 10 6.875 10C8.35 10 9.7225 10.3513 10.8463 10.9175C11.9224 10.3092 13.1389 9.99287 14.375 10C17.4688 10 20 11.9225 20 13.8462C20 14.4838 19.7467 15.0952 19.296 15.546C18.8452 15.9967 18.2338 16.25 17.5962 16.25H13.2425C12.7225 17.005 11.8513 17.5 10.865 17.5H2.885C2.12005 17.4993 1.38663 17.1952 0.845728 16.6543C0.304829 16.1134 0.000662005 15.3799 0 14.615ZM13.7388 14.375H17.5962C17.8888 14.375 18.125 14.1375 18.125 13.8462C18.125 13.7175 18.005 13.2563 17.265 12.7338C16.5725 12.2425 15.5463 11.875 14.375 11.875C13.7288 11.875 13.1263 11.9875 12.6 12.17C13.2575 12.8375 13.6675 13.6025 13.7388 14.375ZM15.625 6.25C15.625 6.58152 15.4933 6.89946 15.2589 7.13388C15.0245 7.3683 14.7065 7.5 14.375 7.5C14.0435 7.5 13.7255 7.3683 13.4911 7.13388C13.2567 6.89946 13.125 6.58152 13.125 6.25C13.125 5.91848 13.2567 5.60054 13.4911 5.36612C13.7255 5.1317 14.0435 5 14.375 5C14.7065 5 15.0245 5.1317 15.2589 5.36612C15.4933 5.60054 15.625 5.91848 15.625 6.25ZM17.5 6.25C17.5 7.0788 17.1708 7.87366 16.5847 8.45971C15.9987 9.04576 15.2038 9.375 14.375 9.375C13.5462 9.375 12.7513 9.04576 12.1653 8.45971C11.5792 7.87366 11.25 7.0788 11.25 6.25C11.25 5.4212 11.5792 4.62634 12.1653 4.04029C12.7513 3.45424 13.5462 3.125 14.375 3.125C15.2038 3.125 15.9987 3.45424 16.5847 4.04029C17.1708 4.62634 17.5 5.4212 17.5 6.25Z" fill="#FBB040"/>
                        </svg>
                    }
                />
                <StatCard
                    title="Barangay Official"
                    value={loading ? '...' : (userStats?.barangayOfficial ?? 0)}
                    valueClassName="text-purple-500"
                    icon={
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 20 20" fill="none">
                            <path fillRule="evenodd" clipRule="evenodd" d="M6.875 7.5C7.37228 7.5 7.84919 7.30246 8.20083 6.95083C8.55246 6.59919 8.75 6.12228 8.75 5.625C8.75 5.12772 8.55246 4.65081 8.20083 4.29917C7.84919 3.94754 7.37228 3.75 6.875 3.75C6.37772 3.75 5.90081 3.94754 5.54917 4.29917C5.19754 4.65081 5 5.12772 5 5.625C5 6.12228 5.19754 6.59919 5.54917 6.95083C5.90081 7.30246 6.37772 7.5 6.875 7.5ZM6.875 9.375C7.86956 9.375 8.82339 8.97991 9.52665 8.27665C10.2299 7.57339 10.625 6.61956 10.625 5.625C10.625 4.63044 10.2299 3.67661 9.52665 2.97335C8.82339 2.27009 7.86956 1.875 6.875 1.875C5.88044 1.875 4.92661 2.27009 4.22335 2.97335C3.52009 3.67661 3.125 4.63044 3.125 5.625C3.125 6.61956 3.52009 7.57339 4.22335 8.27665C4.92661 8.97991 5.88044 9.375 6.875 9.375ZM3.08875 12.9825C2.1175 13.6575 1.875 14.3113 1.875 14.615C1.875 15.1725 2.3275 15.625 2.885 15.625H10.865C11.1327 15.6243 11.3892 15.5177 11.5784 15.3284C11.7677 15.1392 11.8743 14.8827 11.875 14.615C11.875 14.31 11.6325 13.6562 10.6613 12.9825C9.74 12.3438 8.39875 11.875 6.875 11.875C5.35125 11.875 4.01 12.3438 3.08875 12.9825ZM0 14.615C0 12.3075 3.09375 10 6.875 10C8.35 10 9.7225 10.3513 10.8463 10.9175C11.9224 10.3092 13.1389 9.99287 14.375 10C17.4688 10 20 11.9225 20 13.8462C20 14.4838 19.7467 15.0952 19.296 15.546C18.8452 15.9967 18.2338 16.25 17.5962 16.25H13.2425C12.7225 17.005 11.8513 17.5 10.865 17.5H2.885C2.12005 17.4993 1.38663 17.1952 0.845728 16.6543C0.304829 16.1134 0.000662005 15.3799 0 14.615ZM13.7388 14.375H17.5962C17.8888 14.375 18.125 14.1375 18.125 13.8462C18.125 13.7175 18.005 13.2563 17.265 12.7338C16.5725 12.2425 15.5463 11.875 14.375 11.875C13.7288 11.875 13.1263 11.9875 12.6 12.17C13.2575 12.8375 13.6675 13.6025 13.7388 14.375ZM15.625 6.25C15.625 6.58152 15.4933 6.89946 15.2589 7.13388C15.0245 7.3683 14.7065 7.5 14.375 7.5C14.0435 7.5 13.7255 7.3683 13.4911 7.13388C13.2567 6.89946 13.125 6.58152 13.125 6.25C13.125 5.91848 13.2567 5.60054 13.4911 5.36612C13.7255 5.1317 14.0435 5 14.375 5C14.7065 5 15.0245 5.1317 15.2589 5.36612C15.4933 5.60054 15.625 5.91848 15.625 6.25ZM17.5 6.25C17.5 7.0788 17.1708 7.87366 16.5847 8.45971C15.9987 9.04576 15.2038 9.375 14.375 9.375C13.5462 9.375 12.7513 9.04576 12.1653 8.45971C11.5792 7.87366 11.25 7.0788 11.25 6.25C11.25 5.4212 11.5792 4.62634 12.1653 4.04029C12.7513 3.45424 13.5462 3.125 14.375 3.125C15.2038 3.125 15.9987 3.45424 16.5847 4.04029C17.1708 4.62634 17.5 5.4212 17.5 6.25Z" fill="#9747FF"/>
                        </svg>
                    }
                />
                <StatCard
                    title="App Users"
                    value={loading ? '...' : (userStats?.allUsers ?? 0)}
                    valueClassName="text-emerald-600"
                    icon={
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 20 20" fill="none">
                            <path fillRule="evenodd" clipRule="evenodd" d="M6.875 7.5C7.37228 7.5 7.84919 7.30246 8.20083 6.95083C8.55246 6.59919 8.75 6.12228 8.75 5.625C8.75 5.12772 8.55246 4.65081 8.20083 4.29917C7.84919 3.94754 7.37228 3.75 6.875 3.75C6.37772 3.75 5.90081 3.94754 5.54917 4.29917C5.19754 4.65081 5 5.12772 5 5.625C5 6.12228 5.19754 6.59919 5.54917 6.95083C5.90081 7.30246 6.37772 7.5 6.875 7.5ZM6.875 9.375C7.86956 9.375 8.82339 8.97991 9.52665 8.27665C10.2299 7.57339 10.625 6.61956 10.625 5.625C10.625 4.63044 10.2299 3.67661 9.52665 2.97335C8.82339 2.27009 7.86956 1.875 6.875 1.875C5.88044 1.875 4.92661 2.27009 4.22335 2.97335C3.52009 3.67661 3.125 4.63044 3.125 5.625C3.125 6.61956 3.52009 7.57339 4.22335 8.27665C4.92661 8.97991 5.88044 9.375 6.875 9.375ZM3.08875 12.9825C2.1175 13.6575 1.875 14.3113 1.875 14.615C1.875 15.1725 2.3275 15.625 2.885 15.625H10.865C11.1327 15.6243 11.3892 15.5177 11.5784 15.3284C11.7677 15.1392 11.8743 14.8827 11.875 14.615C11.875 14.31 11.6325 13.6562 10.6613 12.9825C9.74 12.3438 8.39875 11.875 6.875 11.875C5.35125 11.875 4.01 12.3438 3.08875 12.9825ZM0 14.615C0 12.3075 3.09375 10 6.875 10C8.35 10 9.7225 10.3513 10.8463 10.9175C11.9224 10.3092 13.1389 9.99287 14.375 10C17.4688 10 20 11.9225 20 13.8462C20 14.4838 19.7467 15.0952 19.296 15.546C18.8452 15.9967 18.2338 16.25 17.5962 16.25H13.2425C12.7225 17.005 11.8513 17.5 10.865 17.5H2.885C2.12005 17.4993 1.38663 17.1952 0.845728 16.6543C0.304829 16.1134 0.000662005 15.3799 0 14.615ZM13.7388 14.375H17.5962C17.8888 14.375 18.125 14.1375 18.125 13.8462C18.125 13.7175 18.005 13.2563 17.265 12.7338C16.5725 12.2425 15.5463 11.875 14.375 11.875C13.7288 11.875 13.1263 11.9875 12.6 12.17C13.2575 12.8375 13.6675 13.6025 13.7388 14.375ZM15.625 6.25C15.625 6.58152 15.4933 6.89946 15.2589 7.13388C15.0245 7.3683 14.7065 7.5 14.375 7.5C14.0435 7.5 13.7255 7.3683 13.4911 7.13388C13.2567 6.89946 13.125 6.58152 13.125 6.25C13.125 5.91848 13.2567 5.60054 13.4911 5.36612C13.7255 5.1317 14.0435 5 14.375 5C14.7065 5 15.0245 5.1317 15.2589 5.36612C15.4933 5.60054 15.625 5.91848 15.625 6.25ZM17.5 6.25C17.5 7.0788 17.1708 7.87366 16.5847 8.45971C15.9987 9.04576 15.2038 9.375 14.375 9.375C13.5462 9.375 12.7513 9.04576 12.1653 8.45971C11.5792 7.87366 11.25 7.0788 11.25 6.25C11.25 5.4212 11.5792 4.62634 12.1653 4.04029C12.7513 3.45424 13.5462 3.125 14.375 3.125C15.2038 3.125 15.9987 3.45424 16.5847 4.04029C17.1708 4.62634 17.5 5.4212 17.5 6.25Z" fill="#038B53"/>
                        </svg>
                    }
                />
            </div>

            {/* Title Header - Outside the table container */}
            <div className="flex justify-between items-center mb-4 flex-shrink-0 pt-4">
                <h2 className="text-gray-900 text-lg font-bold leading-6 tracking-tight">
                    Recently Added Users
                </h2>
                
                <div 
                    onClick={() => navigate('/user-management')}
                    className="cursor-pointer flex items-center justify-center p-1 rounded transition-colors hover:bg-gray-100"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M17.5 8.125C17.5 8.29076 17.4342 8.44973 17.3169 8.56694C17.1997 8.68415 17.0408 8.75 16.875 8.75C16.7092 8.75 16.5503 8.68415 16.4331 8.56694C16.3158 8.44973 16.25 8.29076 16.25 8.125V4.63438L11.068 9.81719C10.9507 9.93446 10.7916 10.0003 10.6258 10.0003C10.4599 10.0003 10.3009 9.93446 10.1836 9.81719C10.0663 9.69991 10.0004 9.54085 10.0004 9.375C10.0004 9.20915 10.0663 9.05009 10.1836 8.93281L15.3656 3.75H11.875C11.7092 3.75 11.5503 3.68415 11.4331 3.56694C11.3158 3.44973 11.25 3.29076 11.25 3.125C11.25 2.95924 11.3158 2.80027 11.4331 2.68306C11.5503 2.56585 11.7092 2.5 11.875 2.5H16.875C17.0408 2.5 17.1997 2.56585 17.3169 2.68306C17.4342 2.80027 17.5 2.95924 17.5 3.125V8.125ZM14.375 10C14.2092 10 14.0503 10.0658 13.9331 10.1831C13.8158 10.3003 13.75 10.4592 13.75 10.625V16.25H3.75V6.25H9.375C9.54076 6.25 9.69973 6.18415 9.81694 6.06694C9.93415 5.94973 10 5.79076 10 5.625C10 5.45924 9.93415 5.30027 9.81694 5.18306C9.69973 5.06585 9.54076 5 9.375 5H3.75C3.41848 5 3.10054 5.1317 2.86612 5.36612C2.6317 5.60054 2.5 5.91848 2.5 6.25V16.25C2.5 16.5815 2.6317 16.8995 2.86612 17.1339C3.10054 17.3683 3.41848 17.5 3.75 17.5H13.75C14.0815 17.5 14.3995 17.3683 14.6339 17.1339C14.8683 16.8995 15 16.5815 15 16.25V10.625C15 10.4592 14.9342 10.3003 14.8169 10.1831C14.6997 10.0658 14.5408 10 14.375 10Z" fill="#878787"/>
                    </svg>
                </div>
            </div>

            {/* Recently Added Users Table */}
            <div className="rounded-md border border-input overflow-hidden max-h-[600px] flex flex-col mb-2">
                <div className="relative w-full overflow-auto flex-1">
                    {loading ? (
                        // Loading rows with skeleton animation
                        <Table>
                            <TableHeader className="bg-gray-50">
                                <TableRow>
                                    <TableHead className="text-left whitespace-nowrap">Name</TableHead>
                                    <TableHead className="text-left whitespace-nowrap">Email</TableHead>
                                    <TableHead className="text-left whitespace-nowrap">Role</TableHead>
                                    <TableHead className="text-left whitespace-nowrap">Barangay</TableHead>
                                    <TableHead className="text-left whitespace-nowrap">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {Array.from({ length: rowsPerPage }, (_, index) => (
                                    <TableRow key={`loading-${index}`}>
                                        <TableCell className="py-4">
                                            <div className="flex items-center space-x-2">
                                                <LoadingSpinner size="sm" />
                                                <div className="h-4 bg-gray-200 rounded animate-pulse w-32"></div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="h-4 bg-gray-200 rounded animate-pulse w-48"></div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="h-6 bg-gray-200 rounded-xl animate-pulse w-24"></div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="h-4 bg-gray-200 rounded animate-pulse w-32"></div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="h-4 bg-gray-200 rounded animate-pulse w-16"></div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : displayedUsers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-8 text-center">
                            <div className="text-gray-500 text-lg font-medium mb-2">
                                No recent users found
                            </div>
                            <p className="text-gray-400 text-sm">
                                Recent users will appear here when they are added to the system
                            </p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader className="bg-gray-50">
                                <TableRow>
                                    <TableHead className="text-left whitespace-nowrap">Name</TableHead>
                                    <TableHead className="text-left whitespace-nowrap">Email</TableHead>
                                    <TableHead className="text-left whitespace-nowrap">Role</TableHead>
                                    <TableHead className="text-left whitespace-nowrap">Barangay</TableHead>
                                    <TableHead className="text-left whitespace-nowrap">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {displayedUsers.map((user: RecentUser, index: number) => {
                                    const roleColor = getRoleColor(user.role_id);
                                    return (
                                        <TableRow 
                                            key={user.id || index}
                                            className="hover:bg-gray-50"
                                        >
                                            <TableCell className="text-foreground font-medium">
                                                {user.full_name || 'N/A'}
                                            </TableCell>
                                            <TableCell className="text-foreground">
                                                {user.email || 'N/A'}
                                            </TableCell>
                                            <TableCell>
                                                <span 
                                                    className='inline-flex px-3 py-0.5 text-xs font-extrabold rounded-xl border'
                                                    style={{
                                                        color: roleColor,
                                                        backgroundColor: '#FFFFFF',
                                                        borderColor: roleColor
                                                    }}
                                                >
                                                    {user.role_name || 'N/A'}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-foreground">
                                                {user.barangay && user.barangay !== 'Unknown' ? user.barangay : 'N/A'}
                                            </TableCell>
                                            <TableCell>
                                                <span 
                                                    className='inline-flex px-2 py-0.5 text-xs font-bold rounded-xl border'
                                                    style={{
                                                        color: '#00824E',
                                                        backgroundColor: '#FFFFFF',
                                                        borderColor: '#00824E'
                                                    }}
                                                >
                                                    Active
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </div>

            {/* Pagination Controls */}
            {!loading && totalUsers > 0 && (
                <div className="flex items-center justify-between">
                    <div className="flex-1 text-sm text-muted-foreground">
                        {totalUsers > 0 && (
                            <span>
                                {(currentPage - 1) * rowsPerPage + 1}-
                                {Math.min(currentPage * rowsPerPage, totalUsers)} of {totalUsers} row(s) shown.
                            </span>
                        )}
                    </div>
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={handlePageChange}
                        rowsPerPage={rowsPerPage}
                        totalRows={totalUsers}
                        onRowsPerPageChange={(value: string) => handleRowsPerPageChange(Number(value))}
                    />
                </div>
            )}
        </div>
    );
}
