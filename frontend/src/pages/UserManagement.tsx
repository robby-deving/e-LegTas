import { usePageTitle } from '../hooks/usePageTitle';
import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { selectCurrentUser, selectToken } from '../features/auth/authSlice';
import { usePermissions } from '../contexts/PermissionContext';
import { Search, MoreHorizontal, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Edit, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { Button } from '../components/ui/button';
// StatusCodes full-page 403 is now handled at the route level in App.tsx

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
    const [selectedRows] = useState(0);
    const [users, setUsers] = useState<User[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [formLoading, setFormLoading] = useState(false);
    const [barangays, setBarangays] = useState<{id: number; name: string}[]>([]);
    const [evacuationCenters, setEvacuationCenters] = useState<{id: number; name: string}[]>([]);

    const [deleteConfirmUser, setDeleteConfirmUser] = useState<User | null>(null);
    const [roles, setRoles] = useState<{id: number; name: string}[]>([]);
    const [rolesLoading, setRolesLoading] = useState(true);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    
    // Form state
    const [formData, setFormData] = useState({
        first_name: '',
        middle_name: '',
        last_name: '',
        suffix: '',
        sex: '',
        barangay_of_origin: '',
        employee_number: '',
        birthdate: '',
        email: '',
        password: '',
        role_id: '',
        assigned_evacuation_center: ''
    });
    
    // Role configuration - Easy to extend for new roles
    // Use "all" for allowedRoleIds/assignableRoleIds to automatically include all roles
    // Use array of specific IDs for restricted access
    const ROLE_CONFIGS = {
        SYSTEM_ADMIN_GROUP: {
            roles: [1],
            canSeeEvacCenter: true,
            canSelectRole: true,
            canManageEvacCenter: true,
            apiEndpoint: 'https://api.e-legtas.tech/api/v1/users',
            allowedRoleIds: "all", // Can see all users - automatically includes new roles
            assignableRoleIds: "all", // Can assign any role - automatically includes new roles
            tableColumns: ['user', 'email', 'role', 'evacuation_center', 'actions']
        },
        BARANGAY_GROUP: {
            roles: [2, 3],
            canSeeEvacCenter: false,
            canSelectRole: true, // Changed to true - they can assign roles
            canManageEvacCenter: false, // Cannot manage evacuation centers
            apiEndpoint: 'https://api.e-legtas.tech/api/v1/users',
            allowedRoleIds: [2, 3],
            assignableRoleIds: [2, 3], // Can only assign roles 2 & 3
            tableColumns: ['user', 'role', 'actions']
        },
        CSWDO_GROUP: {
            roles: [4, 5],
            canSeeEvacCenter: true,
            canSelectRole: true,
            canManageEvacCenter: true,
            apiEndpoint: 'https://api.e-legtas.tech/api/v1/users/cswdo',
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
            const response = await fetch('https://api.e-legtas.tech/api/v1/users/data/roles', {
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
        if (!currentRoleConfig) return 'https://api.e-legtas.tech/api/v1/users?limit=100';
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
                const response = await fetch('https://api.e-legtas.tech/api/v1/users/data/barangays', {
                    headers: getAuthHeaders(),
                });
                
                if (!response.ok) {
                    throw new Error(`Failed to fetch barangays: ${response.status}`);
                }
                
                const data = await response.json();
                setBarangays(data.barangays || []);
            } catch (err) {
                console.error('Error fetching barangays:', err);
                // Set some default barangays if fetch fails
                setBarangays([
                    { id: 1, name: 'Barangay 1' },
                    { id: 2, name: 'Barangay 2' },
                    { id: 3, name: 'Barangay 3' }
                ]);
            }
        };

        fetchBarangays();
    }, [token]); // Add token as dependency

    // Fetch evacuation centers from backend
    useEffect(() => {
        const fetchEvacuationCenters = async () => {
            try {
                // Add query parameter to only fetch active evacuation centers (where deleted_at IS NULL)
                const response = await fetch('https://api.e-legtas.tech/api/v1/users/data/evacuation-centers?active=true', {
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
            1: 'SYSTEM ADMIN',
            2: 'BARANGAY OFFICIAL',
            3: 'REGIONAL COORDINATOR',
            4: 'CSWDO',
            5: 'CAMP MANAGER'
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
                <th key="user" className='px-6 py-3 text-left text-base font-medium text-gray-500'>
                    User
                </th>
            );
        }
        
        if (columns.includes('email')) {
            headers.push(
                <th key="email" className='px-6 py-3 text-left text-base font-medium text-gray-500'>
                    Email
                </th>
            );
        }
        
        if (columns.includes('role')) {
            headers.push(
                <th key="role" className='px-6 py-3 text-left text-base font-medium text-gray-500'>
                    Role
                </th>
            );
        }
        
        if (columns.includes('evacuation_center')) {
            headers.push(
                <th key="evacuation_center" className='px-6 py-3 text-left text-base font-medium text-gray-500'>
                    Assigned Evacuation Center
                </th>
            );
        }
        
        if (columns.includes('actions')) {
            headers.push(
                <th key="actions" className='px-6 py-3 text-right text-base font-medium text-gray-500'>
                    {/* Empty header for actions column */}
                </th>
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
                <td key="user" className='px-6 py-4 whitespace-nowrap'>
                    <div className='text-base font-medium text-gray-900'>
                        {getDisplayName(user)}
                    </div>
                </td>
            );
        }
        
        if (columns.includes('email')) {
            cells.push(
                <td key="email" className='px-6 py-4 whitespace-nowrap'>
                    <div className='text-base text-gray-900'>
                        {user.email}
                    </div>
                </td>
            );
        }
        
        if (columns.includes('role')) {
            const roleColor = getRoleColor(user.role_id);
            cells.push(
                <td key="role" className='px-6 py-4 whitespace-nowrap'>
                    <span 
                        className='inline-flex px-4.5 py-1 text-base font-extrabold rounded-lg border'
                        style={{
                            color: roleColor,
                            backgroundColor: '#FFFFFF',
                            borderColor: roleColor
                        }}
                    >
                        {getRoleDisplayName(user.role_id, user.role_name)}
                    </span>
                </td>
            );
        }
        
        if (columns.includes('evacuation_center')) {
            cells.push(
                <td key="evacuation_center" className='px-6 py-4 whitespace-nowrap text-base text-gray-900'>
                    {user.assigned_evacuation_center || 'N/A'}
                </td>
            );
        }
        
        if (columns.includes('actions')) {
            cells.push(
                <td key="actions" className='px-6 py-4 whitespace-nowrap text-right text-base font-medium'>
                    {(hasUpdateUser || hasDeleteUser) && (
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
                    )}
                </td>
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

    // Handle form input changes
    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormLoading(true);
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
                assignedEvacuationCenter: canManageEvacuationCenterForUser(targetRoleId) ? formData.assigned_evacuation_center : ''
            };

            const response = await fetch('https://api.e-legtas.tech/api/v1/users', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(submitData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to create user');
            }

            // Reset form and close modal
            setFormData({
                first_name: '',
                middle_name: '',
                last_name: '',
                suffix: '',
                sex: '',
                barangay_of_origin: '',
                employee_number: '',
                birthdate: '',
                email: '',
                password: '',
                role_id: '',
                assigned_evacuation_center: ''
            });
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
        } finally {
            setFormLoading(false);
        }
    };

    // Reset form when modal is closed
    const handleCloseModal = () => {
        setFormData({
            first_name: '',
            middle_name: '',
            last_name: '',
            suffix: '',
            sex: '',
            barangay_of_origin: '',
            employee_number: '',
            birthdate: '',
            email: '',
            password: '',
            role_id: '',
            assigned_evacuation_center: ''
        });
        setIsAddUserModalOpen(false);
        setIsEditUserModalOpen(false);
        setEditingUser(null);
        setError(null); // Clear any previous errors
        setSuccessMessage(null); // Clear any previous success messages
        setSelectedRoleFilter('all'); // Reset role filter to show all users
    };

    // Handle opening edit modal
    const handleEditUser = (user: User) => {
        setEditingUser(user);
        setFormData({
            first_name: user.first_name,
            middle_name: user.middle_name || '',
            last_name: user.last_name,
            suffix: user.suffix || '',
            sex: user.sex,
            barangay_of_origin: user.barangay_of_origin_id ? user.barangay_of_origin_id.toString() : '',
            employee_number: user.employee_number,
            birthdate: user.birthdate,
            email: user.email,
            password: '', // Leave password empty for security
            role_id: user.role_id.toString(),
            assigned_evacuation_center: user.assigned_evacuation_center || ''
        });
        setIsEditUserModalOpen(true);
    };

    // Handle edit form submission
    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;
        
        setFormLoading(true);
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
                // Only include password if it's provided
                ...(formData.password && { password: formData.password })
            };

            const response = await fetch(`https://api.e-legtas.tech/api/v1/users/${editingUser.user_id}`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify(submitData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to update user');
            }

            // Reset form and close modal
            handleCloseModal();
            
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
        } finally {
            setFormLoading(false);
        }
    };



    // Handle delete user
    const handleDeleteUser = async (userId: number) => {
        try {
            const response = await fetch(`https://api.e-legtas.tech/api/v1/users/${userId}`, {
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

    return(
        <div className='p-6'>
            {/* Title */}
            <h1 
                className='font-bold mb-6'
                style={{ 
                    color: '#00824E', 
                    fontSize: '32px' 
                }}
            >
                User Management
            </h1>
            
            {/* Accounts Tab */}
            <div>
                <div className='border-b border-gray-200'>
                    <nav className='-mb-px flex'>
                        <button 
                            className='py-2 px-4 border-b-2 border-[#00824E] text-[#00824E] font-medium text-base focus:outline-none'
                        >
                            Accounts
                        </button>
                    </nav>
                </div>
                
                {/* Search Box and Add User Button */}
                <div className='mt-4 mb-4 flex justify-between items-center'>
                    <div className='flex items-center gap-4'>
                        {/* Search Box */}
                        <div className='relative w-72'>
                            <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                                <Search className='h-5 w-5 text-gray-400' />
                            </div>
                            <input
                                type='text'
                                placeholder='Search'
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className='block w-full pl-10 pr-3 py-2 leading-5 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-[#00824E] focus:border-[#00824E] sm:text-sm'
                                style={{
                                    borderRadius: '6px',
                                    border: '1px solid #E4E4E7',
                                    background: '#FFF',
                                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                                }}
                            />
                        </div>
                        
                        {/* Role Filter Dropdown */}
                        <div className='flex items-center gap-2'>
                            <label className='text-sm font-medium text-gray-700'>Filter by Role:</label>
                            <select
                                value={selectedRoleFilter}
                                onChange={(e) => setSelectedRoleFilter(e.target.value)}
                                className='px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#00824E] focus:border-[#00824E]'
                                style={{
                                    background: '#FFF',
                                    minWidth: '160px'
                                }}
                            >
                                <option value="all">All Roles</option>
                                {!rolesLoading && roles
                                    .filter(role => currentRoleConfig?.allowedRoleIds === "all" || (Array.isArray(currentRoleConfig?.allowedRoleIds) && currentRoleConfig.allowedRoleIds.includes(role.id)))
                                    .map(role => (
                                        <option key={role.id} value={role.id}>
                                            {role.name.toUpperCase()}
                                        </option>
                                    ))
                                }
                                {rolesLoading && (
                                    <option disabled>Loading roles...</option>
                                )}
                            </select>
                            
                            {/* Clear Filters Button */}
                            {(searchTerm || selectedRoleFilter !== 'all') && (
                                <button
                                    onClick={clearAllFilters}
                                    className='px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-[#00824E] focus:border-[#00824E] transition-colors'
                                >
                                    Clear Filters
                                </button>
                            )}
                        </div>
                    </div>
                    
                    {/* Add User Button - Show for users with add_user permission (independent of role group) */}
                    {hasAddUser && (
                        <button
                            onClick={() => setIsAddUserModalOpen(true)}
                            className='inline-flex items-center gap-2 px-4 py-2 text-white font-medium text-base rounded-md hover:opacity-90 transition-opacity focus:outline-none'
                            style={{
                                backgroundColor: '#00824E'
                            }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14" fill="none">
                                <g clipPath="url(#clip0_876_48038)">
                                    <path d="M7.0013 12.8327C10.223 12.8327 12.8346 10.221 12.8346 6.99935C12.8346 3.77769 10.223 1.16602 7.0013 1.16602C3.77964 1.16602 1.16797 3.77769 1.16797 6.99935C1.16797 10.221 3.77964 12.8327 7.0013 12.8327Z" stroke="#F8FAFC" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M7 4.66602V9.33268" stroke="#F8FAFC" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M4.66797 7H9.33464" stroke="#F8FAFC" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                                </g>
                                <defs>
                                    <clipPath id="clip0_876_48038">
                                        <rect width="14" height="14" fill="white"/>
                                    </clipPath>
                                </defs>
                            </svg>
                            Add User
                        </button>
                    )}
                </div>
                
                {/* Users Table */}
                {/* Success Message - Show above table if there's a success message */}
                {successMessage && (
                    <div className='mb-4 p-4 bg-green-50 border border-green-200 rounded-md'>
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
                    <div className='mb-4 p-4 bg-red-50 border border-red-200 rounded-md'>
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
                
                <div 
                    className='overflow-x-auto rounded-md'
                    style={{
                        border: '1px solid #E4E4E7'
                    }}
                >
                    <table className='min-w-full'>
                            <thead className='bg-white border-b border-gray-200'>
                                <tr>
                                    {renderTableHeaders()}
                                </tr>
                            </thead>
                            <tbody className='bg-white'>
                                {loading ? (
                                    <tr>
                                        <td colSpan={getColumnCount()} className='px-6 py-8 text-center text-gray-500'>
                                            Loading users...
                                        </td>
                                    </tr>
                                ) : paginatedUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan={getColumnCount()} className='px-6 py-8 text-center text-gray-500'>
                                            {searchTerm ? 'No users found matching your search.' : 'No users found.'}
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedUsers.map((user, index) => (
                                        <tr 
                                            key={user.user_id} 
                                            className={`hover:bg-gray-50 ${index !== paginatedUsers.length - 1 ? 'border-b border-gray-200' : ''}`}
                                        >
                                            {renderTableCells(user)}
                                        </tr>
                                    ))
                            )}
                        </tbody>
                    </table>
                </div>                {/* Pagination */}
                <div 
                    className='flex items-center justify-between px-6 py-3 pt-5 bg-white'
                    style={{
                        border: '1px solid #E4E4E7',
                        borderTop: 'none',
                        borderBottomLeftRadius: '6px',
                        borderBottomRightRadius: '6px'
                    }}
                >
                    <div className='flex items-center gap-4'>
                        <span className='text-base text-gray-500'>
                            {selectedRows} of {totalRows} row(s) selected.
                        </span>
                    </div>
                    
                    <div className='flex items-center gap-6'>
                        <div className='flex items-center gap-2'>
                            <span className='text-base text-gray-700'>Rows per page</span>
                            <select
                                value={rowsPerPage}
                                onChange={(e) => setRowsPerPage(Number(e.target.value))}
                                className='border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[#00824E] focus:border-[#00824E] gap-20 mr-10'
                            >
                                <option value={5}>5</option>
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                            </select>
                        </div>
                        <span className='text-base text-gray-700'>
                            Page {currentPage} of {totalPages}
                        </span>
                        <div className='flex items-center gap-1'>
                            <button
                                onClick={() => setCurrentPage(1)}
                                disabled={currentPage === 1}
                                className='p-1 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
                            >
                                <ChevronsLeft className='h-4 w-4' />
                            </button>
                            <button
                                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                disabled={currentPage === 1}
                                className='p-1 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
                            >
                                <ChevronLeft className='h-4 w-4' />
                            </button>
                            <button
                                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                disabled={currentPage === totalPages}
                                className='p-1 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
                            >
                                <ChevronRight className='h-4 w-4' />
                            </button>
                            <button
                                onClick={() => setCurrentPage(totalPages)}
                                disabled={currentPage === totalPages}
                                className='p-1 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
                            >
                                <ChevronsRight className='h-4 w-4' />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Add/Edit User Modal */}
                {(isAddUserModalOpen || isEditUserModalOpen) && (
                    <div 
                        className='fixed inset-0 flex items-center justify-center z-50'
                        style={{
                            background: 'rgba(211, 211, 211, 0.80)'
                        }}
                    >
                        <div className='bg-white rounded-lg p-6 w-[700px] shadow-lg max-h-[90vh] overflow-y-auto'>
                            {/* Modal Header */}
                            <div className='flex items-center justify-between mb-6'>
                                <h2 
                                    className='text-xl font-bold'
                                    style={{ color: '#0C955B' }}
                                >
                                    {isEditUserModalOpen ? 'Edit User' : 'Add User'}
                                </h2>
                                <button
                                    onClick={handleCloseModal}
                                    className='hover:bg-gray-100 p-1 rounded'
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="17" viewBox="0 0 16 17" fill="none">
                                        <g opacity="0.7">
                                            <path d="M12 4.5L4 12.5" stroke="#020617" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                                            <path d="M4 4.5L12 12.5" stroke="#020617" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                                        </g>
                                    </svg>
                                </button>
                            </div>
                            
                            {/* Form */}
                            <form className='space-y-4' onSubmit={isEditUserModalOpen ? handleEditSubmit : handleSubmit}>
                                {/* Row 1: First Name | Middle Name */}
                                <div className='grid grid-cols-2 gap-4'>
                                    <div>
                                        <label className='block text-sm font-semibold text-black mb-1'>
                                            First Name
                                        </label>
                                        <input
                                            type='text'
                                            name='first_name'
                                            value={formData.first_name}
                                            onChange={handleFormChange}
                                            className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#00824E] focus:border-[#00824E]'
                                            placeholder='Enter first name'
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className='block text-sm font-medium text-black mb-1'>
                                            Middle Name
                                        </label>
                                        <input
                                            type='text'
                                            name='middle_name'
                                            value={formData.middle_name}
                                            onChange={handleFormChange}
                                            className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#00824E] focus:border-[#00824E]'
                                            placeholder='Enter middle name'
                                        />
                                    </div>
                                </div>

                                {/* Row 2: Last Name | Suffix */}
                                <div className='grid grid-cols-2 gap-4'>
                                    <div>
                                        <label className='block text-sm font-medium text-black mb-1'>
                                            Last Name
                                        </label>
                                        <input
                                            type='text'
                                            name='last_name'
                                            value={formData.last_name}
                                            onChange={handleFormChange}
                                            className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#00824E] focus:border-[#00824E]'
                                            placeholder='Enter last name'
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className='block text-sm font-medium text-black mb-1'>
                                            Suffix
                                        </label>
                                        <input
                                            type='text'
                                            name='suffix'
                                            value={formData.suffix}
                                            onChange={handleFormChange}
                                            className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#00824E] focus:border-[#00824E]'
                                            placeholder='Enter suffix (optional)'
                                        />
                                    </div>
                                </div>

                                {/* Row 3: Sex | Barangay of Origin */}
                                <div className='grid grid-cols-2 gap-4'>
                                    <div>
                                        <label className='block text-sm font-medium text-black mb-1'>
                                            Sex
                                        </label>
                                        <select
                                            name='sex'
                                            value={formData.sex}
                                            onChange={handleFormChange}
                                            className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#00824E] focus:border-[#00824E]'
                                            required
                                        >
                                            <option value=''>Select sex</option>
                                            <option value='Male'>Male</option>
                                            <option value='Female'>Female</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className='block text-sm font-medium text-black mb-1'>
                                            Barangay of Origin
                                        </label>
                                        <select
                                            name='barangay_of_origin'
                                            value={formData.barangay_of_origin}
                                            onChange={handleFormChange}
                                            className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#00824E] focus:border-[#00824E]'
                                            required
                                        >
                                            <option value=''>Select barangay</option>
                                            {barangays.map((barangay) => (
                                                <option key={barangay.id} value={barangay.id}>
                                                    {barangay.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Row 4: Employee Number | Birthdate */}
                                <div className='grid grid-cols-2 gap-4'>
                                    <div>
                                        <label className='block text-sm font-medium text-black mb-1'>
                                            Employee Number
                                        </label>
                                        <input
                                            type='text'
                                            name='employee_number'
                                            value={formData.employee_number}
                                            onChange={handleFormChange}
                                            className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#00824E] focus:border-[#00824E]'
                                            placeholder='Enter employee number'
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className='block text-sm font-medium text-black mb-1'>
                                            Birthdate
                                        </label>
                                        <input
                                            type='date'
                                            name='birthdate'
                                            value={formData.birthdate}
                                            onChange={handleFormChange}
                                            className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#00824E] focus:border-[#00824E]'
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Email */}
                                <div>
                                    <label className='block text-sm font-medium text-black mb-1'>
                                        Email
                                    </label>
                                    <input
                                        type='email'
                                        name='email'
                                        value={formData.email}
                                        onChange={handleFormChange}
                                        className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#00824E] focus:border-[#00824E]'
                                        placeholder='Enter email address'
                                        required
                                    />
                                </div>

                                {/* Password */}
                                <div>
                                    <label className='block text-sm font-medium text-black mb-1'>
                                        Password {isEditUserModalOpen && <span className='text-sm text-gray-500'>(leave empty to keep current password)</span>}
                                    </label>
                                    <input
                                        type='password'
                                        name='password'
                                        value={formData.password}
                                        onChange={handleFormChange}
                                        className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#00824E] focus:border-[#00824E]'
                                        placeholder={isEditUserModalOpen ? 'Enter new password (optional)' : 'Enter password'}
                                        required={!isEditUserModalOpen}
                                    />
                                </div>

                                {/* Role - Show only when allowed by role config AND permission */}
                                {currentRoleConfig?.canSelectRole && hasAssignRole && (
                                    <div>
                                        <label className='block text-sm font-medium text-black mb-1'>
                                            Role
                                        </label>
                                        <select
                                            name='role_id'
                                            value={formData.role_id}
                                            onChange={handleFormChange}
                                            className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#00824E] focus:border-[#00824E]'
                                            required
                                        >
                                            <option value=''>Select a role</option>
                                            {!rolesLoading && getAssignableRoles().map(role => (
                                                <option key={role.id} value={role.id}>
                                                    {role.name.toUpperCase()}
                                                </option>
                                            ))}
                                            {rolesLoading && (
                                                <option disabled>Loading roles...</option>
                                            )}
                                        </select>
                                    </div>
                                )}

                                {/* When not allowed to assign roles, fix role_id via hidden input */}
                                {!(currentRoleConfig?.canSelectRole && hasAssignRole) && (
                                    <input
                                        type='hidden'
                                        name='role_id'
                                        value={isEditUserModalOpen ? (editingUser?.role_id || '') : (currentUser?.role_id || 3)}
                                    />
                                )}

                                {/* Optional note when assignment is restricted */}
                                {currentRoleConfig?.canSelectRole && !hasAssignRole && (
                                    <p className='text-xs text-gray-500'>You don't have permission to assign roles.</p>
                                )}

                                {/* Assigned Evacuation Center - Show based on role configuration and target user */}
                                {(() => {
                                    // Determine target role ID for the user being added/edited
                                    const targetRoleId = isEditUserModalOpen 
                                        ? (currentRoleConfig?.canSelectRole ? parseInt(formData.role_id) || editingUser?.role_id : editingUser?.role_id)
                                        : (currentRoleConfig?.canSelectRole ? parseInt(formData.role_id) : currentUser?.role_id);
                                    
                                    return canManageEvacuationCenterForUser(targetRoleId);
                                })() && (
                                    <div>
                                        <label className='block text-sm font-medium text-black mb-1'>
                                            Assigned Evacuation Center
                                        </label>
                                        <select
                                            name='assigned_evacuation_center'
                                            value={formData.assigned_evacuation_center}
                                            onChange={handleFormChange}
                                            className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#00824E] focus:border-[#00824E]'
                                        >
                                            <option value=''>Select evacuation center (optional)</option>
                                            {evacuationCenters.map((center) => (
                                                <option key={center.id} value={center.name}>
                                                    {center.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {/* Modal Footer - Inside Form */}
                                <div className='flex justify-end gap-3 mt-6 pt-4'>
                                    <button
                                        type='button'
                                        onClick={handleCloseModal}
                                        className='px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none'
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type='submit'
                                        disabled={formLoading}
                                        className='px-4 py-2 text-white rounded-md hover:opacity-90 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed'
                                        style={{ backgroundColor: '#00824E' }}
                                    >
                                        {formLoading 
                                            ? (isEditUserModalOpen ? 'Updating...' : 'Adding...') 
                                            : (isEditUserModalOpen ? 'Edit User' : 'Add User')
                                        }
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Delete Confirmation Modal */}
                {deleteConfirmUser && (
                    <div 
                        className='fixed inset-0 flex items-center justify-center z-50'
                        style={{
                            background: 'rgba(211, 211, 211, 0.80)'
                        }}
                    >
                        <div className='bg-white rounded-lg p-6 w-[400px] shadow-lg'>
                            {/* Modal Header */}
                            <div className='flex items-center justify-between mb-4'>
                                <h2 
                                    className='text-xl font-bold'
                                    style={{ color: '#DC2626' }}
                                >
                                    Delete User
                                </h2>
                                <button
                                    onClick={() => setDeleteConfirmUser(null)}
                                    className='hover:bg-gray-100 p-1 rounded'
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="17" viewBox="0 0 16 17" fill="none">
                                        <g opacity="0.7">
                                            <path d="M12 4.5L4 12.5" stroke="#020617" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                                            <path d="M4 4.5L12 12.5" stroke="#020617" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                                        </g>
                                    </svg>
                                </button>
                            </div>
                            
                            {/* Modal Content */}
                            <div className='mb-6'>
                                <p className='text-gray-700 mb-2'>
                                    Are you sure you want to delete this user?
                                </p>
                                <div className='bg-gray-50 p-3 rounded-md'>
                                    <p className='font-medium text-gray-900'>
                                        {getDisplayName(deleteConfirmUser)}
                                    </p>
                                    <p className='text-sm text-gray-600'>
                                        {deleteConfirmUser.email}
                                    </p>
                                </div>
                                <p className='text-sm text-red-600 mt-2'>
                                    This action cannot be undone. The user will no longer be able to access the system.
                                </p>
                            </div>
                            
                            {/* Modal Footer */}
                            <div className='flex justify-end gap-3'>
                                <button
                                    onClick={() => setDeleteConfirmUser(null)}
                                    className='px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none'
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleDeleteUser(deleteConfirmUser.user_id)}
                                    className='px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none'
                                >
                                    Delete User
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}