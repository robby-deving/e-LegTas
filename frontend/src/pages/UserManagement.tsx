import { usePageTitle } from '../hooks/usePageTitle';
import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { selectCurrentUser, selectToken } from '../features/auth/authSlice';
import { usePermissions } from '../contexts/PermissionContext';
import { Search, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AddUserModal } from '@/components/modals/AddUserModal';
import { EditUserModal } from '@/components/modals/EditUserModal';
import { DeleteUserModal } from '@/components/modals/DeleteUserModal';
import type { UserFormData } from '@/components/modals/AddUserModal';
// StatusCodes full-page 403 is now handled at the route level in App.tsx

import { Plus } from 'lucide-react';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Pagination } from '@/components/ui/pagination';
import LoadingSpinner from '../components/loadingSpinner';

interface User {
    user_id: number; // Numeric users table id
    auth_id?: string; // Supabase Auth UUID
    first_name: string;
    middle_name?: string;
    last_name: string;
    suffix?: string;
    sex: string;
    barangay_of_origin: string;
    barangay_of_origin_id?: number;
    employee_number: string;
    birthdate: string;
    email: string;
    role_id: number;
    role_name?: string;
    assigned_evacuation_center?: string;
    assigned_barangay?: string;
    assigned_barangay_id?: number;
}

export default function UserManagement(){
    usePageTitle('User Management');
    
    // All hooks must be called before any conditional logic
    const currentUser = useSelector(selectCurrentUser);
    const token = useSelector(selectToken);
    const { hasPermission, loading: permissionsLoading } = usePermissions();
    const hasAddUser = hasPermission('add_user');
    const hasUpdateUser = hasPermission('update_user');
    const hasDeleteUser = hasPermission('delete_user');
    const hasAssignRole = hasPermission('add_user_role');
    // Evac center capabilities are derived from granular permissions (no single 'manage_evacuation_centers' permission exists)
    const canManageEvacGlobally = hasPermission('create_evacuation_center') || hasPermission('update_evacuation_center') || hasPermission('delete_evacuation_center');
    
    // All useState hooks must be called before any conditional returns
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all'); // Add role filter state
    const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
    const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [users, setUsers] = useState<User[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [barangays, setBarangays] = useState<{id: number; name: string}[]>([]);
    const [evacuationCenters, setEvacuationCenters] = useState<{id: number; name: string}[]>([]);

    const [deleteConfirmUser, setDeleteConfirmUser] = useState<User | null>(null);
    const [roles, setRoles] = useState<{id: number; name: string}[]>([]);
    const [rolesLoading, setRolesLoading] = useState(true);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    
    // Role configuration - Easy to extend for new roles
    // Use "all" for allowedRoleIds/assignableRoleIds to automatically include all roles
    // Use array of specific IDs for restricted access
    const ROLE_CONFIGS = {
        SYSTEM_ADMIN_GROUP: {
            roles: [1],
            canSeeEvacCenter: true,
            canSelectRole: true,
            canManageEvacCenter: true,
            apiEndpoint: '/api/v1/users',
            allowedRoleIds: "all", // Can see all users - automatically includes new roles
            assignableRoleIds: "all", // Can assign any role - automatically includes new roles
            tableColumns: ['user', 'email', 'role', 'evacuation_center', 'actions']
        },
        BARANGAY_GROUP: {
            roles: [2, 3],
            canSeeEvacCenter: false,
            canSelectRole: true, // Changed to true - they can assign roles
            canManageEvacCenter: false, // Cannot manage evacuation centers
            apiEndpoint: '/api/v1/users',
            allowedRoleIds: [2, 3],
            assignableRoleIds: [2, 3], // Can only assign roles 2 & 3
            tableColumns: ['user', 'role', 'actions']
        },
        CSWDO_GROUP: {
            roles: [4, 5],
            canSeeEvacCenter: true,
            canSelectRole: true,
            canManageEvacCenter: true,
            apiEndpoint: '/api/v1/users/cswdo',
            allowedRoleIds: [4, 5],
            assignableRoleIds: [4, 5], // Can only assign roles 4 & 5
            tableColumns: ['user', 'role', 'evacuation_center', 'actions']
        }
    };

    // Get current user's role configuration
    const getCurrentRoleConfig = () => {
        if (!currentUser?.role_id) return null;
        
        for (const [groupName, config] of Object.entries(ROLE_CONFIGS)) {
            if (config.roles.includes(currentUser.role_id)) {
                return { groupName, ...config };
            }
        }
        return null;
    };

    const currentRoleConfig = getCurrentRoleConfig();
    
    // Helper function to get role color for borders and text
    const getRoleColor = (roleId: number) => {
        // Update the role color for Barangay Official (role_id: 7)
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

    // Helper function to determine if evacuation center should be available based on user being edited
    const canManageEvacuationCenterForUser = (targetUserRoleId?: number) => {
        if (!currentRoleConfig) return canManageEvacGlobally;
        
        // Barangay Group (roles 2 & 3) cannot manage evacuation centers at all
        if (currentRoleConfig.roles.includes(2) || currentRoleConfig.roles.includes(3)) {
            return false;
        }
        
        // System Admin (role 1) can only manage evacuation centers for roles 4 & 5, not for roles 2 & 3
        if (currentUser?.role_id === 1 && targetUserRoleId && [2, 3].includes(targetUserRoleId)) {
            return false;
        }
        
        // CSWDO Group (roles 4 & 5) can only manage evacuation centers for their own group
        if (currentRoleConfig.roles.includes(4) || currentRoleConfig.roles.includes(5)) {
            if (targetUserRoleId && ![4, 5].includes(targetUserRoleId)) {
                return false;
            }
        }
        
        return currentRoleConfig.canManageEvacCenter;
    };

    // Helper function to get assignable roles for current user
    const getAssignableRoles = () => {
        if (!currentRoleConfig || !currentRoleConfig.assignableRoleIds) {
            // Exclude System Admin (role_id 1) from all assignable roles
            return roles.filter(role => role.id !== 1);
        }
        
        // If "all" is specified, return all roles except System Admin
        if (currentRoleConfig.assignableRoleIds === "all") {
            return roles.filter(role => role.id !== 1);
        }
        
        // Otherwise, filter by the specified role IDs and exclude System Admin
        return roles.filter(role => 
            role.id !== 1 && // Always exclude System Admin
            Array.isArray(currentRoleConfig.assignableRoleIds) && 
            currentRoleConfig.assignableRoleIds.includes(role.id)
        );
    };

    // Helper function to get headers with authentication
    const getAuthHeaders = () => {
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        return headers;
    };

    // Fetch roles from backend
    const fetchRoles = async () => {
        try {
            setRolesLoading(true);
            const response = await fetch('/api/v1/users/data/roles', {
                headers: getAuthHeaders(),
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch roles');
            }
            
            const result = await response.json();
            setRoles(result.roles || []);
        } catch (error) {
            console.error('Error fetching roles:', error);
            // Fallback to empty array if fetch fails
            setRoles([]);
        } finally {
            setRolesLoading(false);
        }
    };

    // Helper function to get appropriate API endpoint based on user role
    const getUsersApiEndpoint = () => {
        if (!currentRoleConfig) return '/api/v1/users?limit=100';
        return `${currentRoleConfig.apiEndpoint}?limit=100`;
    };

    // Helper function to filter users based on current user's role group
    const filterUsersByRoleGroup = (allUsers: any[]) => {
        if (!currentRoleConfig) {
            return allUsers;
        }
        
        // If "all" is specified, return all users
        if (currentRoleConfig.allowedRoleIds === "all") {
            return allUsers;
        }
        
        // Otherwise, filter by the specified role IDs
        const filteredUsers = allUsers.filter((user: any) => 
            Array.isArray(currentRoleConfig.allowedRoleIds) && 
            currentRoleConfig.allowedRoleIds.includes(user.role_id)
        );
        
        return filteredUsers;
    };

    // ALL useEffect hooks must be called before conditional logic
    // Fetch users and roles from backend
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                setLoading(true);
                const endpoint = getUsersApiEndpoint();
                
                const response = await fetch(endpoint, {
                    headers: getAuthHeaders(),
                });
                
                if (!response.ok) {
                    throw new Error(`Failed to fetch users: ${response.status}`);
                }
                
                const data = await response.json();
                
                // Use backend user shape directly (already matches User interface)
                const allTransformedUsers = data.users;
                
                // Apply role-based filtering
                const filteredUsersByRole = filterUsersByRoleGroup(allTransformedUsers);
                
                setUsers(filteredUsersByRole);
                setFilteredUsers(filteredUsersByRole);
                setError(null);
            } catch (err) {
                console.error('Error fetching users:', err);
                setError(err instanceof Error ? err.message : 'Failed to fetch users');
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
        fetchRoles(); // Fetch roles on component mount
    }, [currentUser?.role_id]); // Add currentUser.role_id as dependency

    // Fetch barangays from backend
    useEffect(() => {
        const fetchBarangays = async () => {
            try {
                const response = await fetch('/api/v1/users/data/barangays', {
                    headers: getAuthHeaders(),
                });
                
                if (!response.ok) {
                    throw new Error(`Failed to fetch barangays: ${response.status}`);
                }
                
                const data = await response.json();
                setBarangays(data.barangays || []);
            } catch (err) {
                console.error('Error fetching barangays:', err);
                // Set empty array if fetch fails - user will see "Select barangay" option only
                setBarangays([]);
            }
        };

        fetchBarangays();
    }, [token]); // Add token as dependency

    // Fetch evacuation centers from backend
    useEffect(() => {
        const fetchEvacuationCenters = async () => {
            try {
                // Add query parameter to only fetch active evacuation centers (where deleted_at IS NULL)
                const response = await fetch('/api/v1/users/data/evacuation-centers?active=true', {
                    headers: getAuthHeaders(),
                });
                
                if (!response.ok) {
                    throw new Error(`Failed to fetch evacuation centers: ${response.status}`);
                }
                
                const data = await response.json();
                // Filter out centers that are unavailable or have deleted_at not null
                const activeCenters = data.centers?.filter((center: any) => 
                    !center.deleted_at && center.status === 'Available'
                ) || [];
                
                setEvacuationCenters(activeCenters.map((center: any) => ({
                    id: center.id,
                    name: center.name
                })));
            } catch (err) {
                console.error('Error fetching evacuation centers:', err);
                // Set some default evacuation centers if fetch fails
                setEvacuationCenters([
                    { id: 1, name: 'Legazpi Elementary School' },
                    { id: 2, name: 'Legazpi High School' },
                    { id: 3, name: 'Bicol University Gymnasium' }
                ]);
            }
        };

        fetchEvacuationCenters();
    }, [token]); // Add token as dependency

    // Filter users based on search term and role filter
    useEffect(() => {
        let filtered = users;
        
        // Always exclude System Admin users (role_id 1) from the table
        filtered = filtered.filter(user => user.role_id !== 1);
        
        // Apply role filter first
        if (selectedRoleFilter !== 'all') {
            const roleId = parseInt(selectedRoleFilter);
            filtered = filtered.filter(user => user.role_id === roleId);
        }
        
        // Then apply search term filter
        if (searchTerm.trim()) {
            filtered = filtered.filter(user => {
                const fullName = `${user.first_name} ${user.middle_name || ''} ${user.last_name}`.toLowerCase();
                const email = user.email.toLowerCase();
                const role = (user.role_name || '').toLowerCase();
                const searchLower = searchTerm.toLowerCase();
                
                return fullName.includes(searchLower) || 
                       email.includes(searchLower) || 
                       role.includes(searchLower);
            });
        }
        
        setFilteredUsers(filtered);
        setCurrentPage(1); // Reset to first page when filtering
    }, [searchTerm, selectedRoleFilter, users]);


    
    // Permission checks based on role and permission - Now using currentRoleConfig directly
    
    // Show loading while permissions are being fetched
    if (permissionsLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00824E] mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading permissions...</p>
                </div>
            </div>
        );
    }
    
    // If user doesn't have permission, show access denied
    // Access control handled by router-level PermissionGate

    // Get the display name for a user
    const getDisplayName = (user: User) => {
        const parts = [user.first_name];
        if (user.middle_name) {
            parts.push(user.middle_name);
        }
        parts.push(user.last_name);
        if (user.suffix) {
            parts.push(user.suffix);
        }
        return parts.join(' ');
    };

    // Get role display name - now uses dynamic roles from backend
    const getRoleDisplayName = (roleId: number, roleName: string | undefined) => {
        // First try to use the roleName if available
        if (roleName) {
            return roleName.toUpperCase();
        }
        
        // If no roleName, look up from fetched roles
        const role = roles.find(r => r.id === roleId);
        if (role) {
            return role.name.toUpperCase();
        }
        
        // Final fallback to role ID based mapping (for backward compatibility)
        const roleMap: { [key: number]: string } = {
            1: 'System Admin',
            2: 'Barangay Official',
            3: 'Regional Coordinator',
            4: 'CSWDO',
            5: 'Camp Manager'
        };
        
        return roleMap[roleId] || 'UNKNOWN ROLE';
    };

    // Helper function to render table headers dynamically
    const renderTableHeaders = () => {
        const headers: React.ReactNode[] = [];
        // Columns are role-driven via currentRoleConfig
        const columns = currentRoleConfig?.tableColumns || ['user', 'email', 'role'];
        
        if (columns.includes('user')) {
            headers.push(
                <TableHead key="user" className="text-left whitespace-nowrap">
                    User
                </TableHead>
            );
        }
        
        if (columns.includes('email')) {
            headers.push(
                <TableHead key="email" className="text-left whitespace-nowrap">
                    Email
                </TableHead>
            );
        }
        
        if (columns.includes('role')) {
            headers.push(
                <TableHead key="role" className="text-left whitespace-nowrap">
                    Role
                </TableHead>
            );
        }
        
        if (columns.includes('evacuation_center')) {
            headers.push(
                <TableHead key="evacuation_center" className="text-left whitespace-nowrap">
                    Assigned Evacuation Center/Barangay
                </TableHead>
            );
        }
        
        if (columns.includes('actions')) {
            headers.push(
                <TableHead key="actions" className="text-center w-12 whitespace-nowrap">
                    {/* Empty header for actions column */}
                </TableHead>
            );
        }
        
        return headers;
    };

    // Helper function to render table cells dynamically
    const renderTableCells = (user: User) => {
        const cells: React.ReactNode[] = [];
        // Columns are role-driven via currentRoleConfig
        const columns = currentRoleConfig?.tableColumns || ['user', 'email', 'role'];
        
        if (columns.includes('user')) {
            cells.push(
                <TableCell key="user" className="text-foreground font-medium">
                    {getDisplayName(user)}
                </TableCell>
            );
        }
        
        if (columns.includes('email')) {
            cells.push(
                <TableCell key="email" className="text-foreground">
                    {user.email}
                </TableCell>
            );
        }
        
        if (columns.includes('role')) {
            const roleColor = getRoleColor(user.role_id);
            cells.push(
                <TableCell key="role">
                    <span 
                        className='inline-flex px-3 py-1 text-xs font-extrabold rounded-xl border'
                        style={{
                            color: roleColor,
                            backgroundColor: '#FFFFFF',
                            borderColor: roleColor
                        }}
                    >
                        {getRoleDisplayName(user.role_id, user.role_name)}
                    </span>
                </TableCell>
            );
        }
        
        if (columns.includes('evacuation_center')) {
            cells.push(
                <TableCell key="evacuation_center" className="text-foreground">
                    {user.role_id === 7 ? (user.assigned_barangay || 'N/A') : (user.assigned_evacuation_center || 'N/A')}
                </TableCell>
            );
        }
        
        if (columns.includes('actions')) {
            cells.push(
                <TableCell key="actions" className="text-center">
                    {(hasUpdateUser || hasDeleteUser) && (
                        <div className="flex justify-end">
                            <div className="relative">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                            <MoreHorizontal className="w-4 h-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        {hasUpdateUser && (
                                            <DropdownMenuItem 
                                                onClick={() => handleEditUser(user)}
                                                className="cursor-pointer"
                                            >
                                                <Edit className="w-4 h-4 mr-2" />
                                                Edit
                                            </DropdownMenuItem>
                                        )}
                                        {hasDeleteUser && (
                                            <DropdownMenuItem 
                                                onClick={() => setDeleteConfirmUser(user)}
                                                className="cursor-pointer text-red-600"
                                            >
                                                <Trash2 className="w-4 h-4 mr-2" />
                                                Delete
                                            </DropdownMenuItem>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                    )}
                </TableCell>
            );
        }
        
        return cells;
    };

    // Get total column count for table spanning
    const getColumnCount = () => {
        return (currentRoleConfig?.tableColumns || ['user', 'email', 'role']).length;
    };

    const totalRows = filteredUsers.length;
    const totalPages = Math.ceil(totalRows / rowsPerPage);
    
    // Get paginated users
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

    // Function to clear all filters
    const clearAllFilters = () => {
        setSearchTerm('');
        setSelectedRoleFilter('all');
        setCurrentPage(1);
    };

    // Handle form submission
    const handleSubmit = async (formData: UserFormData) => {
        setError(null); // Clear any previous errors
        setSuccessMessage(null); // Clear any previous success messages
        
        try {
            // Set role and evacuation center based on permission and role group
            const targetRoleId = (currentRoleConfig?.canSelectRole && hasAssignRole)
                ? parseInt(formData.role_id)
                : (currentUser?.role_id || 3);
            
            const submitData = {
                firstName: formData.first_name,
                middleName: formData.middle_name,
                lastName: formData.last_name,
                suffix: formData.suffix,
                sex: formData.sex,
                birthdate: formData.birthdate,
                barangayOfOrigin: formData.barangay_of_origin,
                employeeNumber: formData.employee_number,
                email: formData.email,
                password: formData.password,
                roleId: targetRoleId,
                assignedEvacuationCenter: canManageEvacuationCenterForUser(targetRoleId) ? formData.assigned_evacuation_center : '',
                assignedBarangay: targetRoleId === 7 ? formData.assigned_barangay : ''
            };

            const response = await fetch('/api/v1/users', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(submitData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to create user');
            }

            // Close modal
            setIsAddUserModalOpen(false);

            // Refresh users list with role-based filtering
            const endpoint = getUsersApiEndpoint();
            const usersResponse = await fetch(endpoint, {
                headers: getAuthHeaders(),
            });
            const usersData = await usersResponse.json();
            const allTransformedUsers = usersData.users;
            // Apply role-based filtering
            const filteredUsersByRole = filterUsersByRoleGroup(allTransformedUsers);
            setUsers(filteredUsersByRole);
            setFilteredUsers(filteredUsersByRole);
            setSuccessMessage('User added successfully!');
            
            // Auto-clear success message after 5 seconds
            setTimeout(() => setSuccessMessage(null), 5000);
            
        } catch (err) {
            console.error('Error creating user:', err);
            setError(err instanceof Error ? err.message : 'Failed to create user');
            throw err; // Re-throw to let modal handle the error
        }
    };

    // Handle opening edit modal
    const handleEditUser = (user: User) => {
        setEditingUser(user);
        setIsEditUserModalOpen(true);
    };

    // Handle edit form submission
    const handleEditSubmit = async (formData: UserFormData) => {
        if (!editingUser) return;
        
        setError(null); // Clear any previous errors
        setSuccessMessage(null); // Clear any previous success messages
        
        try {
            // Handle role and evacuation center based on permission and role group
            const targetRoleId = (currentRoleConfig?.canSelectRole && hasAssignRole)
                ? parseInt(formData.role_id)
                : editingUser.role_id;
            
            const submitData = {
                firstName: formData.first_name,
                middleName: formData.middle_name,
                lastName: formData.last_name,
                suffix: formData.suffix,
                sex: formData.sex,
                birthdate: formData.birthdate,
                barangayOfOrigin: formData.barangay_of_origin,
                employeeNumber: formData.employee_number,
                email: formData.email,
                roleId: targetRoleId,
                assignedEvacuationCenter: canManageEvacuationCenterForUser(targetRoleId) ? formData.assigned_evacuation_center : editingUser.assigned_evacuation_center,
                assignedBarangay: targetRoleId === 7 ? formData.assigned_barangay : (editingUser.assigned_barangay || ''),
                // Only include password if it's provided
                ...(formData.password && { password: formData.password })
            };

            const response = await fetch(`/api/v1/users/${editingUser.user_id}`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify(submitData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to update user');
            }

            // Close modal
            setIsEditUserModalOpen(false);
            setEditingUser(null);
            
            // Refresh users list with role-based filtering
            const endpoint = getUsersApiEndpoint();
            const usersResponse = await fetch(endpoint, {
                headers: getAuthHeaders(),
            });
            const usersData = await usersResponse.json();
            const allTransformedUsers = usersData.users;
            // Apply role-based filtering
            const filteredUsersByRole = filterUsersByRoleGroup(allTransformedUsers);
            setUsers(filteredUsersByRole);
            setFilteredUsers(filteredUsersByRole);
            setSuccessMessage('User updated successfully!');
            
            // Auto-clear success message after 5 seconds
            setTimeout(() => setSuccessMessage(null), 5000);
            
        } catch (err) {
            console.error('Error updating user:', err);
            setError(err instanceof Error ? err.message : 'Failed to update user');
            throw err; // Re-throw to let modal handle the error
        }
    };



    // Handle delete user
    const handleDeleteUser = async (userId: number) => {
        try {
            const response = await fetch(`/api/v1/users/${userId}`, {
                method: 'DELETE',
                headers: getAuthHeaders(),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to delete user');
            }

            // Refresh users list with role-based filtering
            const endpoint = getUsersApiEndpoint();
            const usersResponse = await fetch(endpoint, {
                headers: getAuthHeaders(),
            });
            const usersData = await usersResponse.json();
            
            // Use backend user shape directly
            const allTransformedUsers = usersData.users;
            // Apply role-based filtering
            const filteredUsersByRole = filterUsersByRoleGroup(allTransformedUsers);
            setUsers(filteredUsersByRole);
            setFilteredUsers(filteredUsersByRole);
            setDeleteConfirmUser(null);
            setSuccessMessage('User deleted successfully!');
            
            // Auto-clear success message after 5 seconds
            setTimeout(() => setSuccessMessage(null), 5000);
            
        } catch (err) {
            console.error('Error deleting user:', err);
            setError(err instanceof Error ? err.message : 'Failed to delete user');
        }
    };

    // Update the role filter dropdown to exclude System Administrator (role_id: 1)
    const renderRoleFilterDropdown = () => {
        return (
            <Select
                value={selectedRoleFilter}
                onValueChange={(value) => setSelectedRoleFilter(value)}
            >
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    {!rolesLoading && roles
                        .filter(role => currentRoleConfig?.allowedRoleIds === "all" || (Array.isArray(currentRoleConfig?.allowedRoleIds) && currentRoleConfig.allowedRoleIds.includes(role.id)))
                        .filter(role => role.id !== 1) // Exclude System Administrator
                        .map(role => (
                            <SelectItem key={role.id} value={role.id.toString()}>
                                {role.name.toUpperCase()}
                            </SelectItem>
                        ))
                    }
                    {rolesLoading && (
                        <SelectItem value="loading" disabled>Loading roles...</SelectItem>
                    )}
                </SelectContent>
            </Select>
        );
    };

    return(
        <div className='h-full flex flex-col text-black p-10'>
            {/* Title */}
            <h1 
                className='font-bold mb-6 flex-shrink-0'
                style={{ 
                    color: '#00824E', 
                    fontSize: '32px' 
                }}
            >
                User Management
            </h1>
            
            {/* Accounts Tab */}
            <div className="flex-1 min-h-0 flex flex-col">    
                {/* Search Box and Add User Button */}
                <div className='mt-4 mb-4 flex justify-between items-center flex-shrink-0'>
                    <div className='flex items-center gap-4'>
                        {/* Search Box */}
                        <div className='relative w-72'>
                            <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                                <Search className='h-5 w-5 text-gray-400' />
                            </div>
                            <Input
                                type='text'
                                placeholder='Search users...'
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className='pl-10 w-full'
                            />
                        </div>
                        
                        {/* Role Filter Dropdown */}
                        <div className='flex items-center gap-2'>
                            <label className='text-sm font-medium text-gray-700 whitespace-nowrap'>Filter by Role:</label>
                            {renderRoleFilterDropdown()}
                            
                            {/* Clear Filters Button */}
                            {(searchTerm || selectedRoleFilter !== 'all') && (
                                <Button
                                    onClick={clearAllFilters}
                                    variant="outline"
                                    className='whitespace-nowrap'
                                >
                                    Clear Filters
                                </Button>
                            )}
                        </div>
                    </div>
                    
                    {/* Add User Button - Show for users with add_user permission (independent of role group) */}
                    {hasAddUser && (
                        <Button
                            onClick={() => setIsAddUserModalOpen(true)}
                            className="bg-green-700 hover:bg-green-800 text-white px-6 flex gap-2 items-center disabled:opacity-50"
                        >
                            <Plus className="w-4 h-4" />
                            Add User
                        </Button>
                    )}
                </div>
                
                {/* Users Table */}
                {/* Success Message - Show above table if there's a success message */}
                {successMessage && (
                    <div className='mb-4 p-4 bg-green-50 border border-green-200 rounded-md flex-shrink-0'>
                        <div className='flex items-center justify-between'>
                            <div className='flex items-center'>
                                <svg className='w-5 h-5 text-green-400 mr-2' fill='currentColor' viewBox='0 0 20 20'>
                                    <path fillRule='evenodd' d='M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z' clipRule='evenodd' />
                                </svg>
                                <span className='text-green-800 font-medium'>{successMessage}</span>
                            </div>
                            <button
                                onClick={() => setSuccessMessage(null)}
                                className='text-green-400 hover:text-green-600 focus:outline-none'
                            >
                                <svg className='w-4 h-4' fill='currentColor' viewBox='0 0 20 20'>
                                    <path fillRule='evenodd' d='M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z' clipRule='evenodd' />
                                </svg>
                            </button>
                        </div>
                    </div>
                )}
                
                {/* Error Message - Show above table if there's an error */}
                {error && (
                    <div className='mb-4 p-4 bg-red-50 border border-red-200 rounded-md flex-shrink-0'>
                        <div className='flex items-center justify-between'>
                            <div className='flex items-center'>
                                <svg className='w-5 h-5 text-red-400 mr-2' fill='currentColor' viewBox='0 0 20 20'>
                                    <path fillRule='evenodd' d='M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z' clipRule='evenodd' />
                                </svg>
                                <span className='text-red-800 font-medium'>Error: {error}</span>
                            </div>
                            <button
                                onClick={() => setError(null)}
                                className='text-red-400 hover:text-red-600 focus:outline-none'
                            >
                                <svg className='w-4 h-4' fill='currentColor' viewBox='0 0 20 20'>
                                    <path fillRule='evenodd' d='M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z' clipRule='evenodd' />
                                </svg>
                            </button>
                        </div>
                    </div>
                )}
                
                {/* Table Container */}
                <div className="rounded-md border border-input overflow-hidden max-h-[600px] flex flex-col my-2">
                    <div className="relative w-full overflow-auto flex-1">
                        <Table>
                            <TableHeader className="bg-gray-50">
                                <TableRow>
                                    {renderTableHeaders()}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    Array.from({ length: rowsPerPage }, (_, index) => (
                                        <TableRow key={`loading-${index}`}>
                                            {Array.from({ length: getColumnCount() }, (_, colIndex) => (
                                                <TableCell key={`loading-cell-${colIndex}`} className="py-4 text-foreground">
                                                    <div className="flex items-center space-x-2">
                                                        {colIndex === 0 && <LoadingSpinner size="sm" />}
                                                        <div className="h-4 bg-gray-200 rounded animate-pulse w-32"></div>
                                                    </div>
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))
                                ) : paginatedUsers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={getColumnCount()} className="text-center py-8 text-foreground">
                                            <div className="text-gray-500 text-lg font-medium mb-2">
                                                {searchTerm ? 'No users found matching your search.' : 'No users found.'}
                                            </div>
                                            <p className="text-gray-400 text-sm">
                                                {searchTerm ? 'Try adjusting your search criteria' : 'Add users to get started'}
                                            </p>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedUsers.map((user) => (
                                        <TableRow 
                                            key={user.user_id} 
                                            className="hover:bg-gray-50"
                                        >
                                            {renderTableCells(user)}
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
                
                {/* Pagination */}
                {!loading && totalRows > 0 && (
                    <div className="flex items-center justify-between">
                        <div className="flex-1 text-sm text-muted-foreground">
                            <span>
                                {(currentPage - 1) * rowsPerPage + 1}-
                                {Math.min(currentPage * rowsPerPage, totalRows)} of {totalRows} row(s) shown.
                            </span>
                        </div>
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={(page) => setCurrentPage(page)}
                            rowsPerPage={rowsPerPage}
                            totalRows={totalRows}
                            onRowsPerPageChange={(value: string) => {
                                setRowsPerPage(Number(value));
                                setCurrentPage(1);
                            }}
                        />
                    </div>
                )}

                {/* Add User Modal */}
                <AddUserModal
                    isOpen={isAddUserModalOpen}
                    onClose={() => setIsAddUserModalOpen(false)}
                    onSubmit={handleSubmit}
                    barangays={barangays}
                    evacuationCenters={evacuationCenters}
                    roles={roles}
                    rolesLoading={rolesLoading}
                    canSelectRole={currentRoleConfig?.canSelectRole || false}
                    hasAssignRole={hasAssignRole}
                    currentUserRoleId={currentUser?.role_id}
                    getAssignableRoles={getAssignableRoles}
                    canManageEvacuationCenterForUser={canManageEvacuationCenterForUser}
                />

                {/* Edit User Modal */}
                <EditUserModal
                    isOpen={isEditUserModalOpen}
                    onClose={() => {
                        setIsEditUserModalOpen(false);
                        setEditingUser(null);
                    }}
                    onSubmit={handleEditSubmit}
                    user={editingUser}
                    barangays={barangays}
                    evacuationCenters={evacuationCenters}
                    roles={roles}
                    rolesLoading={rolesLoading}
                    canSelectRole={currentRoleConfig?.canSelectRole || false}
                    hasAssignRole={hasAssignRole}
                    getAssignableRoles={getAssignableRoles}
                    canManageEvacuationCenterForUser={canManageEvacuationCenterForUser}
                />

                {/* Delete Confirmation Modal */}
                <DeleteUserModal
                    isOpen={!!deleteConfirmUser}
                    onClose={() => setDeleteConfirmUser(null)}
                    onConfirm={() => deleteConfirmUser && handleDeleteUser(deleteConfirmUser.user_id)}
                    user={deleteConfirmUser}
                />
            </div>
        </div>
    );
}