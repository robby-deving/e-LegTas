import { usePageTitle } from '../hooks/usePageTitle';
import { useSelector } from 'react-redux';
import { selectCurrentUser, selectToken } from '../features/auth/authSlice';
import { Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { MoreHorizontal, Edit, Trash2, Plus } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { Button } from '../components/ui/button';
import { usePermissions } from '../contexts/PermissionContext';
import { AddRoleModal } from '@/components/modals/AddRoleModal';
import { EditRoleModal } from '@/components/modals/EditRoleModal';
import { DeleteRoleModal } from '@/components/modals/DeleteRoleModal';
import type { RoleFormData } from '@/components/modals/AddRoleModal';

import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Pagination } from '@/components/ui/pagination';
import LoadingSpinner from '../components/loadingSpinner';

interface Role {
    id: number;
    name: string;
    is_active?: boolean;
    created_at?: string;
}



interface Permission {
    id: number;
    permission_name: string;
    label: string;
    group?: string;
    description?: string;
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
    const [isAddRoleModalOpen, setIsAddRoleModalOpen] = useState(false);
    const [isEditRoleModalOpen, setIsEditRoleModalOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);
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
        if (permissionName.includes('evacuee') || permissionName.includes('family') || permissionName === 'add_relief_service') return 'Evacuee Management';
        if (permissionName.includes('disaster')) return 'Disaster Management';
    if (permissionName.includes('evacuation_center')) return '(Inside) Evacuation Centers';
        if (permissionName.includes('report')) return 'Reports';
        if (permissionName.includes('announcement')) return 'Announcements';
        if (permissionName.includes('user') || permissionName.includes('role')) return 'User Management';
        if (permissionName.includes('profile') || permissionName.includes('password')) return 'Profile';
    // Category for outside/external evacuation centers
    if (permissionName.includes('outside_ec')) return '(Outside) Evacuation Centers';
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
    
    // Order groups: keep 'Disaster Management' first among these related groups,
    // then place evacuation center groups immediately after it, followed by other groups alphabetically.
    const rawGroups = Array.from(new Set(permissionsWithGroups.map(p => p.group)));
    const preferredOrder = [
        'Announcements',
        'Dashboard',
        'Disaster Management',
        '(Inside) Evacuation Centers',
        '(Outside) Evacuation Centers'
    ];

    const remaining = rawGroups.filter(g => !preferredOrder.includes(g)).sort();
    const permissionGroups = [
        ...preferredOrder.filter(g => rawGroups.includes(g)),
        ...remaining
    ];
    
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
            // User stats are fetched but not stored in state since they're not used in the UI
            console.log('User stats fetched:', data.data);
        } catch (err) {
            console.error('Error fetching user stats:', err);
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
    
    // Handle opening edit modal
    const handleEditRole = (role: Role) => {
        setEditingRole(role);
        setIsEditRoleModalOpen(true);
    };
    
    // Handle opening add modal
    const handleAddRole = () => {
        setIsAddRoleModalOpen(true);
    };
    
    // Handle add form submission
    const handleAddSubmit = async (formData: RoleFormData) => {
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

            // Close modal
            setIsAddRoleModalOpen(false);
            
            // Refresh roles list
            await fetchRoles();
            showToast('Role created successfully', 'success');
            
        } catch (err) {
            console.error('Error creating role:', err);
            showToast('An error occurred while creating the role.', 'error');
            throw err;
        }
    };
    
    // Handle edit form submission
    const handleEditSubmit = async (formData: RoleFormData, role: Role) => {
        try {
            // 1) Update role name if it changed
            if (formData.name && formData.name.trim() && formData.name.trim() !== role.name) {
                const renameResponse = await fetch(`/api/v1/roles/${role.id}`, {
                    method: 'PUT',
                    headers: getAuthHeaders(),
                    body: JSON.stringify({ role_name: formData.name.trim() })
                });

                if (!renameResponse.ok) {
                    const errText = await renameResponse.text().catch(() => '');
                    console.error('Failed to rename role:', errText);
                    showToast('Failed to update role name', 'error');
                    throw new Error('Failed to update role name');
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

            const roleId = role.id;
            if (canEditUserPermission) {
                const response = await fetch(`/api/v1/permissions/role/${role.id}`, {
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

            // Close modal
            setIsEditRoleModalOpen(false);
            setEditingRole(null);
            
            // Refresh roles list
            await fetchRoles();
            // Refresh permission count for this role
            const updatedCount = await fetchRolePermissions(roleId);
            setRolePermissions(prev => ({ ...prev, [roleId]: updatedCount }));
            showToast('Role updated successfully', 'success');
            
        } catch (err) {
            console.error('Error updating role:', err);
            showToast('An error occurred while updating the role.', 'error');
            throw err;
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
        <div className="h-full flex flex-col text-black p-10">
            {/* Title */}
            <h1 
                className='font-bold mb-6 flex-shrink-0'
                style={{ 
                    color: '#00824E', 
                    fontSize: '32px' 
                }}
            >
                User Roles
            </h1>
            
            {/* Add User Roles Button */}
            <div className="mb-4 flex justify-end flex-shrink-0">
                {canCreateRole && (
                    <Button
                        onClick={handleAddRole}
                        className="bg-green-700 hover:bg-green-800 text-white px-6 flex gap-2 items-center disabled:opacity-50"
                    >
                        <Plus className="w-4 h-4" />
                        Add User Roles
                    </Button>
                )}
            </div>
            
            {/* Content */}
            <div className="rounded-md border border-input overflow-hidden max-h-[600px] flex flex-col">
                <div className="relative w-full overflow-auto flex-1">
                    <Table>
                        <TableHeader className="bg-gray-50">
                            <TableRow>
                                <TableHead className="text-left whitespace-nowrap">Name</TableHead>
                                <TableHead className="text-center whitespace-nowrap">Users</TableHead>
                                <TableHead className="text-center whitespace-nowrap">Permissions</TableHead>
                                <TableHead className="text-center w-12 whitespace-nowrap">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array.from({ length: rowsPerPage }, (_, index) => (
                                    <TableRow key={`loading-${index}`}>
                                        <TableCell className="py-4">
                                            <div className="flex items-center space-x-2">
                                                <LoadingSpinner size="sm" />
                                                <div className="h-4 bg-gray-200 rounded animate-pulse w-32"></div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="h-4 bg-gray-200 rounded animate-pulse w-12 mx-auto"></div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="h-4 bg-gray-200 rounded animate-pulse w-12 mx-auto"></div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="h-8 w-8 bg-gray-200 rounded animate-pulse mx-auto"></div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : roles.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8">
                                        <div className="text-gray-500 text-lg font-medium mb-2">
                                            No roles found
                                        </div>
                                        <p className="text-gray-400 text-sm">
                                            Create a role to get started
                                        </p>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedRoles.map((role) => (
                                    <TableRow key={role.id} className="hover:bg-gray-50" style={{ position: 'relative' }}>
                                        <TableCell className="text-foreground font-medium">
                                            {role.name}
                                        </TableCell>
                                        <TableCell className="text-center text-foreground">
                                            {getUserCountByRole(role.id)}
                                        </TableCell>
                                        <TableCell className="text-center text-foreground">
                                            {rolePermissions[role.id] || 0}
                                        </TableCell>
                                        <TableCell className="text-center">
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
                                        </TableCell>
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
            
            {/* Add Role Modal */}
            <AddRoleModal
                isOpen={isAddRoleModalOpen}
                onClose={() => setIsAddRoleModalOpen(false)}
                onSubmit={handleAddSubmit}
                permissions={permissionsWithGroups}
                permissionGroups={permissionGroups}
                canAddUserPermission={canAddUserPermission}
            />

            {/* Edit Role Modal */}
            <EditRoleModal
                isOpen={isEditRoleModalOpen}
                onClose={() => {
                    setIsEditRoleModalOpen(false);
                    setEditingRole(null);
                }}
                onSubmit={handleEditSubmit}
                role={editingRole}
                permissions={permissionsWithGroups}
                permissionGroups={permissionGroups}
                canEditUserPermission={canEditUserPermission}
                token={token}
            />
            
            {/* Delete Confirmation Modal */}
            <DeleteRoleModal
                isOpen={!!deleteConfirmRole}
                onClose={() => setDeleteConfirmRole(null)}
                onConfirm={handleDeleteRole}
                role={deleteConfirmRole}
            />

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
    );
}