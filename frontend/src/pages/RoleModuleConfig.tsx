// Custom CSS for green checkboxes
const checkboxGreenStyle = `
.brand-checkbox {
    appearance: none;
    -webkit-appearance: none;
    width: 1.1em;
    height: 1.1em;
    border: 2px solid #00824E;
    border-radius: 0.25em;
    background: #fff;
    cursor: pointer;
    position: relative;
    margin-right: 0.75rem;
    transition: border-color 0.2s, box-shadow 0.2s;
}
.brand-checkbox:checked {
    background-color: #00824E;
    border-color: #00824E;
}
.brand-checkbox:checked:after {
    content: '';
    position: absolute;
    left: 0.28em;
    top: 0.05em;
    width: 0.35em;
    height: 0.7em;
    border: solid #fff;
    border-width: 0 0.18em 0.18em 0;
    transform: rotate(45deg);
    pointer-events: none;
    display: block;
}
.brand-checkbox:indeterminate {
    background-color: #00824E;
    border-color: #00824E;
}
.brand-checkbox:indeterminate:after {
    content: '';
    position: absolute;
    left: 50%;
    top: 50%;
    width: 0.6em;
    height: 0.13em;
    background: #fff;
    border-radius: 1px;
    display: block;
    transform: translate(-50%, -50%);
}
`;
    // Inject custom CSS for green checkboxes at the top of the component
    // ...existing code...
import { usePageTitle } from '../hooks/usePageTitle';
import { useSelector } from 'react-redux';
import { selectCurrentUser, selectToken } from '../features/auth/authSlice';
import { Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { Button } from '../components/ui/button';
import { usePermissions } from '../contexts/PermissionContext';

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
    const { hasPermission } = usePermissions();
    const canCreateRole = hasPermission('create_role');
    const canAddUserPermission = hasPermission('add_user_permission');
    const canEditUserPermission = hasPermission('edit_user_permission');
    
    // State for roles data
    const [roles, setRoles] = useState<Role[]>([]);
    const [permissions, setPermissions] = useState<Permission[]>([]);

    // New: user counts by roleId
    const [userCountsByRole, setUserCountsByRole] = useState<Record<number, number>>({});
    const [rolePermissions, setRolePermissions] = useState<Record<number, number>>({});
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [selectedRows] = useState(0);
    const [isAddRoleModalOpen, setIsAddRoleModalOpen] = useState(false);
    const [isEditRoleModalOpen, setIsEditRoleModalOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [formLoading, setFormLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        permissions: [] as string[]
    });
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
    // Dropdown state no longer needed with shadcn/ui DropdownMenu
    const [deleteConfirmRole, setDeleteConfirmRole] = useState<Role | null>(null);
    // Toast notification state
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        setToast({ message, type });
        window.setTimeout(() => setToast(null), 3000);
    };
    
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
    
    // Exclude specific permissions from modal
    const EXCLUDED_PERMISSION_LABELS = new Set<string>([
        'Delete Evacuee Information',
        'Delete Family Member Information',
        'Edit Existing Report',
    ]);

    // Add group to permissions (after filtering out excluded labels)
    const permissionsWithGroups = permissions
        .filter(permission => !EXCLUDED_PERMISSION_LABELS.has(permission.label))
        .map(permission => ({
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
            return filteredRoles as Role[];
        } catch (err) {
            console.error('Error fetching roles:', err);
            return [] as Role[];
        }
    };
    
    // Fetch user statistics (legacy, can be removed if not used elsewhere)
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

    // Fetch user counts by role from backend
    const fetchUserCountsByRole = async () => {
        try {
            const response = await fetch('/api/v1/users/role-counts', {
                headers: getAuthHeaders()
            });
            if (!response.ok) {
                throw new Error('Failed to fetch user counts by role');
            }
            const data = await response.json();
            setUserCountsByRole(data.roleCounts || {});
        } catch (err) {
            console.error('Error fetching user counts by role:', err);
            setUserCountsByRole({});
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

            // Load roles first to know which permission counts to fetch
            const loadedRoles = await fetchRoles();

            // Load other data in parallel
            await Promise.all([
                fetchUserStats(),
                fetchPermissions(),
                fetchUserCountsByRole()
            ]);

            // Fetch permission counts per role in parallel before rendering
            if (loadedRoles && loadedRoles.length > 0) {
                const counts = await Promise.all(
                    loadedRoles.map((role) => fetchRolePermissions(role.id))
                );
                const permissionsMap: Record<number, number> = {};
                loadedRoles.forEach((role, idx) => {
                    permissionsMap[role.id] = counts[idx] || 0;
                });
                setRolePermissions(permissionsMap);
            }

            setLoading(false);
        };
        loadData();
    }, []);
    
    // Update role permissions when roles are loaded
    useEffect(() => {
        const loadRolePermissions = async () => {
            if (roles.length > 0) {
                // If all current roles already have counts, skip reloading
                const hasAllCounts = roles.every((r) => rolePermissions[r.id] !== undefined);
                if (hasAllCounts) return;

                const entries = await Promise.all(
                    roles.map(async (role) => [role.id, await fetchRolePermissions(role.id)] as [number, number])
                );
                setRolePermissions(Object.fromEntries(entries));
            }
        };

        loadRolePermissions();
    }, [roles, rolePermissions]);
    
    // No-op: dropdown handled by DropdownMenu
    
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
            // Ensure the permission catalog is available so modal can reflect selections
            if (permissions.length === 0) {
                await fetchPermissions();
            }
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
                    permissions: canAddUserPermission ? formData.permissions : []
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
            // 1) Update role name if it changed
            if (formData.name && formData.name.trim() && formData.name.trim() !== editingRole.name) {
                const renameResponse = await fetch(`/api/v1/roles/${editingRole.id}`, {
                    method: 'PUT',
                    headers: getAuthHeaders(),
                    body: JSON.stringify({ role_name: formData.name.trim() })
                });

                if (!renameResponse.ok) {
                    const errText = await renameResponse.text().catch(() => '');
                    console.error('Failed to rename role:', errText);
                    showToast('Failed to update role name', 'error');
                    setFormLoading(false);
                    return;
                }
            }

            // Convert permission names to permission IDs
            const permissionIds = formData.permissions.map(permissionName => {
                const permission = permissions.find(p => p.permission_name === permissionName);
                console.log(`Permission: ${permissionName} -> ID: ${permission?.id}`);
                return permission?.id;
            }).filter(id => id !== undefined);

            console.log('Sending permission IDs:', permissionIds);
            console.log('All available permissions:', permissions);

            const roleId = editingRole.id;
            if (canEditUserPermission) {
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
            }

            // Reset form and close modal
            handleCloseModal();
            
            // Refresh roles list
            await fetchRoles();
            // Refresh permission count for this role
            const updatedCount = await fetchRolePermissions(roleId);
            setRolePermissions(prev => ({ ...prev, [roleId]: updatedCount }));
            showToast('Role updated successfully', 'success');
            
        } catch (err) {
            console.error('Error updating role:', err);
            showToast('An error occurred while updating the role.', 'error');
        } finally {
            setFormLoading(false);
        }
    };
    
    // Handle delete role with user-friendly error
    const handleDeleteRole = async (roleId: number) => {
        try {
            const response = await fetch(`/api/v1/roles/${roleId}`, {
                method: 'DELETE',
                headers: getAuthHeaders(),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                let errorMsg = 'Failed to delete role';
                if (errorData && errorData.message) {
                    errorMsg = errorData.message;
                }
                showToast(errorMsg, 'error');
                return;
            }

            // Refresh roles list
            await fetchRoles();
            setDeleteConfirmRole(null);
            showToast('Role deleted successfully', 'success');
        } catch (err) {
            console.error('Error deleting role:', err);
            showToast('An error occurred while deleting the role.', 'error');
        }
    };
    
    // Dropdown positioning handled by DropdownMenu
    
    // Get user count by role (from backend mapping)
    const getUserCountByRole = (roleId: number) => {
        return userCountsByRole[roleId] ?? 0;
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
        <>
            <style>{checkboxGreenStyle}</style>
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
                {canCreateRole && (
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
                )}
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
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Actions">
                                                            <MoreHorizontal className="w-4 h-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem 
                                                            onClick={() => handleEditRole(role)}
                                                            className="cursor-pointer"
                                                        >
                                                            <Edit className="w-4 h-4 mr-2" />
                                                            Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem 
                                                            onClick={() => setDeleteConfirmRole(role)}
                                                            className="cursor-pointer text-red-600"
                                                        >
                                                            <Trash2 className="w-4 h-4 mr-2" />
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
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
                                    {/* Determine if user can modify permissions in this modal context */}
                                    { /* no-op for layout; computed below in controls */ }
                                    {permissionGroups.map((group) => {
                                        const groupPermissions = permissionsWithGroups.filter(p => p.group === group);
                                        const isExpanded = expandedGroups[group];
                                        const isFullySelected = isCategoryFullySelected(group);
                                        const isPartiallySelected = isCategoryPartiallySelected(group);
                                        const canModifyRolePermissions = isAddRoleModalOpen ? canAddUserPermission : canEditUserPermission;
                                        
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
                                                        className="brand-checkbox"
                                                        disabled={!canModifyRolePermissions}
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
                                                                    className="brand-checkbox"
                                                                    disabled={!canModifyRolePermissions}
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
                                {! (isAddRoleModalOpen ? canAddUserPermission : canEditUserPermission) && (
                                    <p className="mt-2 text-xs text-gray-500">You don't have permission to {isAddRoleModalOpen ? 'assign' : 'edit'} user permissions.</p>
                                )}
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

            {/* Toast Notification */}
            {toast && (
                <div
                    className={`fixed bottom-4 right-4 z-[10000] px-4 py-3 rounded-md shadow-lg text-white ${
                        toast.type === 'success' ? 'bg-green-600' : toast.type === 'error' ? 'bg-red-600' : 'bg-gray-800'
                    }`}
                >
                    <span className="text-sm font-medium">{toast.message}</span>
                </div>
            )}
        </div>
        </>
    );
}