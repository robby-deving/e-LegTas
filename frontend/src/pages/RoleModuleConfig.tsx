import { usePageTitle } from '../hooks/usePageTitle';
import { useSelector } from 'react-redux';
import { selectCurrentUser, selectToken } from '../features/auth/authSlice';
import { Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface Role {
    id: number;
    name: string;
    is_active?: boolean;
    created_at?: string;
}

interface UserStats {
    cdrrmo: number;
    cswdo: number;
    campManager: number;
    allUsers: number;
}

interface Permission {
    id: number;
    permission_name: string;
    label: string;
    group?: string;
}

export default function RoleModuleConfig() {
    usePageTitle('User Roles');
    
    const currentUser = useSelector(selectCurrentUser);
    const token = useSelector(selectToken);
    
    // State for roles data
    const [roles, setRoles] = useState<Role[]>([]);
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [userStats, setUserStats] = useState<UserStats>({
        cdrrmo: 0,
        cswdo: 0,
        campManager: 0,
        allUsers: 0
    });
    const [rolePermissions, setRolePermissions] = useState<Record<number, number>>({});
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [selectedRows, setSelectedRows] = useState(0);
    const [isAddRoleModalOpen, setIsAddRoleModalOpen] = useState(false);
    const [isEditRoleModalOpen, setIsEditRoleModalOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [formLoading, setFormLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        permissions: [] as string[]
    });
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
    const [dropdownOpen, setDropdownOpen] = useState<number | null>(null);
    const [dropdownPosition, setDropdownPosition] = useState<{showAbove: boolean; left: number; top: number} | null>(null);
    const [deleteConfirmRole, setDeleteConfirmRole] = useState<Role | null>(null);
    
    // Get unique permission groups - manually map permissions to groups
    const getPermissionGroup = (permissionName: string): string => {
        if (permissionName.includes('dashboard')) return 'Dashboard';
        if (permissionName.includes('map')) return 'Mapping';
        if (permissionName.includes('evacuee') || permissionName.includes('family')) return 'Evacuee Management';
        if (permissionName.includes('disaster')) return 'Disaster Management';
        if (permissionName.includes('evacuation_center')) return 'Evacuation Center Management';
        if (permissionName.includes('report')) return 'Reports';
        if (permissionName.includes('announcement')) return 'Announcements';
        if (permissionName.includes('user') || permissionName.includes('role')) return 'User Management';
        if (permissionName.includes('profile') || permissionName.includes('password')) return 'Profile';
        return 'Other';
    };
    
    // Add group to permissions
    const permissionsWithGroups = permissions.map(permission => ({
        ...permission,
        group: getPermissionGroup(permission.permission_name)
    }));
    
    const permissionGroups = Array.from(new Set(permissionsWithGroups.map(p => p.group))).sort();
    
    // Helper function to get auth headers
    const getAuthHeaders = () => ({
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    });
    
    // Fetch permissions from database
    const fetchPermissions = async () => {
        try {
            const response = await fetch('/api/v1/permissions', {
                headers: getAuthHeaders()
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Permissions fetch failed:', response.status, errorText);
                throw new Error('Failed to fetch permissions');
            }
            
            const data = await response.json();
            console.log('Fetched permissions:', data.permissions);
            setPermissions(data.permissions || []);
        } catch (error) {
            console.error('Error fetching permissions:', error);
        }
    };
    
    // Fetch roles data
    const fetchRoles = async () => {
        try {
            const response = await fetch('/api/v1/users/data/roles', {
                headers: getAuthHeaders()
            });
            if (!response.ok) {
                throw new Error('Failed to fetch roles');
            }
            const data = await response.json();
            // Filter out System Admin role (id: 1)
            const filteredRoles = (data.roles || []).filter((role: Role) => role.id !== 1);
            setRoles(filteredRoles);
        } catch (err) {
            console.error('Error fetching roles:', err);
        }
    };
    
    // Fetch user statistics
    const fetchUserStats = async () => {
        try {
            const response = await fetch('/api/v1/users/stats', {
                headers: getAuthHeaders()
            });
            if (!response.ok) {
                if (response.status === 401) {
                    console.warn('Authentication required for user stats');
                    return; // Don't set error state, just skip loading stats
                }
                throw new Error('Failed to fetch user statistics');
            }
            const data = await response.json();
            setUserStats(data.data);
        } catch (err) {
            console.error('Error fetching user stats:', err);
            // Set default values if stats fail to load
            setUserStats({
                cdrrmo: 0,
                cswdo: 0,
                campManager: 0,
                allUsers: 0
            });
        }
    };
    
    // Fetch role permissions count
    const fetchRolePermissions = async (roleId: number) => {
        try {
            const response = await fetch(`/api/v1/permissions/role/${roleId}`, {
                headers: getAuthHeaders()
            });
            if (!response.ok) {
                console.warn(`Failed to fetch permissions for role ${roleId}`);
                return 0;
            }
            const data = await response.json();
            return data.permissions?.length || 0;
        } catch (err) {
            console.error('Error fetching role permissions:', err);
            return 0;
        }
    };
    
    // Load all data
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            await Promise.all([fetchRoles(), fetchUserStats(), fetchPermissions()]);
            setLoading(false);
        };
        
        loadData();
    }, []);
    
    // Update role permissions when roles are loaded
    useEffect(() => {
        const loadRolePermissions = async () => {
            if (roles.length > 0) {
                const permissions: Record<number, number> = {};
                for (const role of roles) {
                    permissions[role.id] = await fetchRolePermissions(role.id);
                }
                setRolePermissions(permissions);
            }
        };
        
        loadRolePermissions();
    }, [roles]);
    
    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = () => {
            setDropdownOpen(null);
        };

        document.addEventListener('click', handleClickOutside);
        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, []);
    
    // Handle form input changes
    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Handle permission checkbox changes
    const handlePermissionChange = (permissionName: string) => {
        setFormData(prev => ({
            ...prev,
            permissions: prev.permissions.includes(permissionName)
                ? prev.permissions.filter(p => p !== permissionName)
                : [...prev.permissions, permissionName]
        }));
    };

    // Handle category select all/unselect all
    const handleCategoryToggle = (groupName: string) => {
        const groupPermissions = permissionsWithGroups.filter(p => p.group === groupName);
        const groupPermissionNames = groupPermissions.map(p => p.permission_name);
        const allSelected = groupPermissionNames.every(name => formData.permissions.includes(name));
        
        setFormData(prev => ({
            ...prev,
            permissions: allSelected
                ? prev.permissions.filter(p => !groupPermissionNames.includes(p))
                : [...new Set([...prev.permissions, ...groupPermissionNames])]
        }));
    };

    // Check if all permissions in a category are selected
    const isCategoryFullySelected = (groupName: string) => {
        const groupPermissions = permissionsWithGroups.filter(p => p.group === groupName);
        return groupPermissions.length > 0 && groupPermissions.every(p => formData.permissions.includes(p.permission_name));
    };

    // Check if some (but not all) permissions in a category are selected
    const isCategoryPartiallySelected = (groupName: string) => {
        const groupPermissions = permissionsWithGroups.filter(p => p.group === groupName);
        const selectedCount = groupPermissions.filter(p => formData.permissions.includes(p.permission_name)).length;
        return selectedCount > 0 && selectedCount < groupPermissions.length;
    };

    // Toggle group expansion
    const toggleGroup = (groupName: string) => {
        setExpandedGroups(prev => ({
            ...prev,
            [groupName]: !prev[groupName]
        }));
    };
    
    // Reset form when modal is closed
    const handleCloseModal = () => {
        setFormData({
            name: '',
            permissions: []
        });
        setExpandedGroups({});
        setIsAddRoleModalOpen(false);
        setIsEditRoleModalOpen(false);
        setEditingRole(null);
    };
    
    // Handle opening edit modal
    const handleEditRole = async (role: Role) => {
        setEditingRole(role);
        
        try {
            // Fetch current role permissions
            const response = await fetch(`/api/v1/permissions/role/${role.id}`, {
                headers: getAuthHeaders()
            });
            
            if (response.ok) {
                const data = await response.json();
                const rolePermissionNames = (data.permissions || []).map((p: any) => p.permission_name);
                
                setFormData({
                    name: role.name,
                    permissions: rolePermissionNames
                });
            } else {
                // If failed to fetch permissions, just set empty permissions
                console.warn(`Failed to fetch permissions for role ${role.id}`);
                setFormData({
                    name: role.name,
                    permissions: []
                });
            }
        } catch (error) {
            console.error('Error fetching role permissions:', error);
            setFormData({
                name: role.name,
                permissions: []
            });
        }
        
        setIsEditRoleModalOpen(true);
    };
    
    // Handle opening add modal
    const handleAddRole = () => {
        setIsAddRoleModalOpen(true);
    };
    
    // Handle add form submission
    const handleAddSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormLoading(true);
        
        try {
            const response = await fetch('/api/v1/roles', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    role_name: formData.name,
                    permissions: formData.permissions
                })
            });

            if (!response.ok) {
                throw new Error('Failed to create role');
            }

            // Reset form and close modal
            handleCloseModal();
            
            // Refresh roles list
            await fetchRoles();
            
        } catch (err) {
            console.error('Error creating role:', err);
        } finally {
            setFormLoading(false);
        }
    };
    
    // Handle edit form submission
    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingRole) return;
        
        setFormLoading(true);
        
        try {
            // Convert permission names to permission IDs
            const permissionIds = formData.permissions.map(permissionName => {
                const permission = permissions.find(p => p.permission_name === permissionName);
                console.log(`Permission: ${permissionName} -> ID: ${permission?.id}`);
                return permission?.id;
            }).filter(id => id !== undefined);

            console.log('Sending permission IDs:', permissionIds);
            console.log('All available permissions:', permissions);

            const response = await fetch(`/api/v1/permissions/role/${editingRole.id}`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    permissionIds: permissionIds
                })
            });

            if (!response.ok) {
                throw new Error('Failed to update role permissions');
            }

            // Reset form and close modal
            handleCloseModal();
            
            // Refresh roles list
            await fetchRoles();
            
        } catch (err) {
            console.error('Error updating role:', err);
        } finally {
            setFormLoading(false);
        }
    };
    
    // Handle delete role
    const handleDeleteRole = async (roleId: number) => {
        try {
            const response = await fetch(`/api/v1/roles/${roleId}`, {
                method: 'DELETE',
                headers: getAuthHeaders(),
            });

            if (!response.ok) {
                throw new Error('Failed to delete role');
            }

            // Refresh roles list
            await fetchRoles();
            setDeleteConfirmRole(null);
            
        } catch (err) {
            console.error('Error deleting role:', err);
            // You could add error state handling here
        }
    };
    
    // Handle dropdown positioning to avoid clipping
    const getDropdownPosition = (event: React.MouseEvent) => {
        const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const dropdownHeight = 100; // Estimated dropdown height
        
        return {
            showAbove: rect.bottom + dropdownHeight > viewportHeight,
            left: rect.right - 192, // 192px = w-48 (48 * 4px)
            top: rect.bottom + dropdownHeight > viewportHeight ? rect.top - dropdownHeight : rect.bottom + 8
        };
    };
    
    // Get user count by role
    const getUserCountByRole = (roleId: number) => {
        switch (roleId) {
            case 2: return userStats.cdrrmo || 0;
            case 3: return userStats.cswdo || 0;
            case 4: 
            case 5: return userStats.campManager || 0;
            default: return 0;
        }
    };
    
    // Pagination calculations
    const totalRows = roles.length;
    const totalPages = Math.ceil(totalRows / rowsPerPage);
    
    // Get paginated roles
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const paginatedRoles = roles.slice(startIndex, endIndex);
    
    // Only allow access for System Admin (role_id: 1)
    if (!currentUser || currentUser.role_id !== 1) {
        return <Navigate to="/dashboard" replace />;
    }

    return (
        <div className='p-6'>
            {/* Title */}
            <h1 
                className='font-bold mb-6'
                style={{ 
                    color: '#00824E', 
                    fontSize: '32px' 
                }}
            >
                User Roles
            </h1>
            
            {/* Add User Roles Button */}
            <div className="mb-6 flex justify-end">
                <button
                    onClick={handleAddRole}
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
                    Add User Roles
                </button>
            </div>
            
            {/* Content */}
            <div 
                className='rounded-md'
                style={{
                    border: '1px solid #E4E4E7',
                    overflow: 'visible'
                }}
            >
                {/* Table */}
                <div className="overflow-x-auto">
                    <table className='min-w-full'>
                    <thead className='bg-white border-b border-gray-200'>
                        <tr>
                            <th className='px-6 py-3 text-left text-base font-medium text-gray-500'>
                                Name
                            </th>
                            <th className='px-6 py-3 text-center text-base font-medium text-gray-500'>
                                Users
                            </th>
                            <th className='px-6 py-3 text-center text-base font-medium text-gray-500'>
                                Permissions
                            </th>
                            <th className='px-6 py-3'>
                            </th>
                        </tr>
                    </thead>
                    <tbody className='bg-white'>
                        {loading ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-4 text-center text-gray-500 text-base">
                                    Loading roles...
                                </td>
                            </tr>
                        ) : roles.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-4 text-center text-gray-500 text-base">
                                    No roles found
                                </td>
                            </tr>
                        ) : (
                            paginatedRoles.map((role) => (
                                <tr key={role.id} className="hover:bg-gray-50 border-b border-gray-200" style={{ position: 'relative' }}>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 text-base">
                                        {role.name}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 text-base text-center">
                                        {getUserCountByRole(role.id)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 text-base text-center">
                                        {rolePermissions[role.id] || 0}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 text-base">
                                        <div className="flex justify-end">
                                            <div className="relative" data-role-id={role.id}>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const position = getDropdownPosition(e);
                                                        setDropdownOpen(dropdownOpen === role.id ? null : role.id);
                                                        setDropdownPosition(position);
                                                    }}
                                                    className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                                                    title="Actions"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="17" viewBox="0 0 16 17" fill="none">
                                                        <path d="M8.0026 9.16536C8.37079 9.16536 8.66927 8.86689 8.66927 8.4987C8.66927 8.13051 8.37079 7.83203 8.0026 7.83203C7.63441 7.83203 7.33594 8.13051 7.33594 8.4987C7.33594 8.86689 7.63441 9.16536 8.0026 9.16536Z" stroke="#020617" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                                                        <path d="M12.6667 9.16536C13.0349 9.16536 13.3333 8.86689 13.3333 8.4987C13.3333 8.13051 13.0349 7.83203 12.6667 7.83203C12.2985 7.83203 12 8.13051 12 8.4987C12 8.86689 12.2985 9.16536 12.6667 9.16536Z" stroke="#020617" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                                                        <path d="M3.33073 9.16536C3.69892 9.16536 3.9974 8.86689 3.9974 8.4987C3.9974 8.13051 3.69892 7.83203 3.33073 7.83203C2.96254 7.83203 2.66406 8.13051 2.66406 8.4987C2.66406 8.86689 2.96254 9.16536 3.33073 9.16536Z" stroke="#020617" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                                                    </svg>
                                                </button>
                                                
                                                {dropdownOpen === role.id && dropdownPosition && (
                                                    <div 
                                                        className="fixed w-48 bg-white rounded-md shadow-lg border border-gray-200"
                                                        style={{
                                                            zIndex: 9999,
                                                            left: `${dropdownPosition.left}px`,
                                                            top: `${dropdownPosition.top}px`
                                                        }}
                                                    >
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleEditRole(role);
                                                                setDropdownOpen(null);
                                                            }}
                                                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-t-md"
                                                        >
                                                            Edit Role
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setDeleteConfirmRole(role);
                                                                setDropdownOpen(null);
                                                            }}
                                                            className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 rounded-b-md"
                                                        >
                                                            Delete Role
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
                </div>
            </div>

            {/* Pagination */}
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
            
            {/* Role Modal (Add/Edit) */}
            {(isAddRoleModalOpen || isEditRoleModalOpen) && (
                <div 
                    className='fixed inset-0 flex items-center justify-center z-50'
                    style={{
                        background: 'rgba(211, 211, 211, 0.80)'
                    }}
                >
                    
                    {/* Modal content */}
                    <div className="relative bg-white rounded-lg p-8 w-[900px] shadow-lg max-h-[90vh] overflow-y-auto">
                        <h2 className="text-2xl font-bold mb-6" style={{ color: '#00824E' }}>
                            {isAddRoleModalOpen ? 'Add New Role' : 'Edit Role'}
                        </h2>
                        
                        <form onSubmit={isAddRoleModalOpen ? handleAddSubmit : handleEditSubmit}>
                            <div className="mb-6">
                                <label className="block text-base font-bold text-gray-700 mb-3">
                                    Role Name
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleFormChange}
                                    className="w-full px-4 py-3 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                                    placeholder="Enter role name"
                                    required
                                />
                            </div>
                            
                            <div className="mb-8">
                                <label className="block text-base font-bold text-gray-700 mb-3">
                                    Permissions
                                </label>
                                <div className="border border-gray-300 rounded-md p-6 py-2 max-h-80 overflow-y-auto">
                                    {permissionGroups.map((group) => {
                                        const groupPermissions = permissionsWithGroups.filter(p => p.group === group);
                                        const isExpanded = expandedGroups[group];
                                        const isFullySelected = isCategoryFullySelected(group);
                                        const isPartiallySelected = isCategoryPartiallySelected(group);
                                        
                                        return (
                                            <div key={group} className="mb-3">
                                                <div className="flex items-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleGroup(group)}
                                                        className="flex items-center p-0 hover:bg-gray-50 rounded mr-3"
                                                    >
                                                        <svg
                                                            className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                                            fill="none"
                                                            stroke="currentColor"
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                        </svg>
                                                    </button>
                                                    <input
                                                        type="checkbox"
                                                        checked={isFullySelected}
                                                        ref={(el) => {
                                                            if (el) {
                                                                el.indeterminate = isPartiallySelected;
                                                            }
                                                        }}
                                                        onChange={() => handleCategoryToggle(group)}
                                                        className="mr-3 rounded w-4 h-4 accent-black"
                                                    />
                                                    <span className="font-bold text-base">{group}</span>
                                                </div>
                                                
                                                {isExpanded && (
                                                    <div className="ml-16 mt-3 space-y-3">
                                                        {groupPermissions.map((permission) => (
                                                            <label key={permission.permission_name} className="flex items-center">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={formData.permissions.includes(permission.permission_name)}
                                                                    onChange={() => handlePermissionChange(permission.permission_name)}
                                                                    className="mr-3 rounded w-4 h-4 accent-black"
                                                                />
                                                                <span className="text-base">{permission.label}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            
                            <div className="flex justify-end gap-4">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="px-6 py-3 text-base text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                                    disabled={formLoading}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-3 text-base text-white rounded-md hover:opacity-90"
                                    style={{ backgroundColor: '#00824E' }}
                                    disabled={formLoading}
                                >
                                    {formLoading 
                                        ? (isAddRoleModalOpen ? 'Adding...' : 'Updating...')
                                        : (isAddRoleModalOpen ? 'Add Role' : 'Update Role')
                                    }
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            
            {/* Delete Confirmation Modal */}
            {deleteConfirmRole && (
                <div 
                    className='fixed inset-0 flex items-center justify-center z-50'
                    style={{
                        background: 'rgba(211, 211, 211, 0.80)'
                    }}
                >
                    <div className="bg-white rounded-lg p-6 w-[400px] shadow-lg">
                        <h2 className="text-xl font-bold mb-4" style={{ color: '#00824E' }}>
                            Delete Role
                        </h2>
                        <p className="text-gray-600 mb-6">
                            Are you sure you want to delete the role "{deleteConfirmRole.name}"? This action cannot be undone.
                        </p>
                        <div className="flex justify-end gap-4">
                            <button
                                onClick={() => setDeleteConfirmRole(null)}
                                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDeleteRole(deleteConfirmRole.id)}
                                className="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}