import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Tooltip, TooltipTrigger, TooltipContent } from '../ui/Tooltip';

interface Permission {
    id: number;
    permission_name: string;
    label: string;
    group?: string;
    description?: string;
}

interface Role {
    id: number;
    name: string;
    is_active?: boolean;
    created_at?: string;
}

interface EditRoleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (formData: RoleFormData, role: Role) => Promise<void>;
    role: Role | null;
    permissions: Permission[];
    permissionGroups: string[];
    canEditUserPermission: boolean;
    token: string | null;
}

export interface RoleFormData {
    name: string;
    permissions: string[];
}

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

export const EditRoleModal = ({
    isOpen,
    onClose,
    onSubmit,
    role,
    permissions,
    permissionGroups,
    canEditUserPermission,
    token
}: EditRoleModalProps) => {
    const [formLoading, setFormLoading] = useState(false);
    const [formData, setFormData] = useState<RoleFormData>({
        name: '',
        permissions: []
    });
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

    // Load role data when modal opens
    useEffect(() => {
        if (isOpen && role) {
            loadRoleData(role);
        }
    }, [isOpen, role]);

    const loadRoleData = async (roleToEdit: Role) => {
        try {
            // Fetch current role permissions
            const response = await fetch(`/api/v1/permissions/role/${roleToEdit.id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                const rolePermissionNames = (data.permissions || []).map((p: any) => p.permission_name);
                
                setFormData({
                    name: roleToEdit.name,
                    permissions: rolePermissionNames
                });
            } else {
                console.warn(`Failed to fetch permissions for role ${roleToEdit.id}`);
                setFormData({
                    name: roleToEdit.name,
                    permissions: []
                });
            }
        } catch (error) {
            console.error('Error fetching role permissions:', error);
            setFormData({
                name: roleToEdit.name,
                permissions: []
            });
        }
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handlePermissionChange = (permissionName: string) => {
        setFormData(prev => ({
            ...prev,
            permissions: prev.permissions.includes(permissionName)
                ? prev.permissions.filter(p => p !== permissionName)
                : [...prev.permissions, permissionName]
        }));
    };

    const handleCategoryToggle = (groupName: string) => {
        const groupPermissions = permissions.filter(p => p.group === groupName);
        const groupPermissionNames = groupPermissions.map(p => p.permission_name);
        const allSelected = groupPermissionNames.every(name => formData.permissions.includes(name));
        
        setFormData(prev => ({
            ...prev,
            permissions: allSelected
                ? prev.permissions.filter(p => !groupPermissionNames.includes(p))
                : [...new Set([...prev.permissions, ...groupPermissionNames])]
        }));
    };

    const isCategoryFullySelected = (groupName: string) => {
        const groupPermissions = permissions.filter(p => p.group === groupName);
        return groupPermissions.length > 0 && groupPermissions.every(p => formData.permissions.includes(p.permission_name));
    };

    const isCategoryPartiallySelected = (groupName: string) => {
        const groupPermissions = permissions.filter(p => p.group === groupName);
        const selectedCount = groupPermissions.filter(p => formData.permissions.includes(p.permission_name)).length;
        return selectedCount > 0 && selectedCount < groupPermissions.length;
    };

    const toggleGroup = (groupName: string) => {
        setExpandedGroups(prev => ({
            ...prev,
            [groupName]: !prev[groupName]
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!role) return;
        
        setFormLoading(true);
        try {
            await onSubmit(formData, role);
            // Reset form on success
            setFormData({
                name: '',
                permissions: []
            });
            setExpandedGroups({});
        } finally {
            setFormLoading(false);
        }
    };

    const handleClose = () => {
        // Reset form when closing
        setFormData({
            name: '',
            permissions: []
        });
        setExpandedGroups({});
        onClose();
    };

    return (
        <>
            <style>{checkboxGreenStyle}</style>
            <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
                <DialogContent size="large" showCloseButton={true} className="max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold" style={{ color: '#00824E' }}>
                            Edit Role
                        </DialogTitle>
                    </DialogHeader>
                    
                    <form onSubmit={handleSubmit}>
                        <div className="mb-6">
                            <Label htmlFor="name" className="block text-base font-bold text-gray-700 mb-3">
                                Role Name
                            </Label>
                            <Input
                                type="text"
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleFormChange}
                                className="w-full px-4 py-3 text-base"
                                placeholder="Enter role name"
                                required
                            />
                        </div>
                        
                        <div className="mb-8">
                            <Label className="block text-base font-bold text-gray-700 mb-3">
                                Permissions
                            </Label>
                            <div className="border border-gray-300 rounded-md p-6 py-2 max-h-80 overflow-y-auto">
                                {permissionGroups.map((group) => {
                                    const groupPermissions = permissions.filter(p => p.group === group);
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
                                                    className="brand-checkbox"
                                                    disabled={!canEditUserPermission}
                                                />
                                                <span className="font-bold text-base">{group}</span>
                                            </div>
                                            
                                            {isExpanded && (
                                                <div className="ml-16 mt-3 space-y-3">
                                                    {groupPermissions.map((permission) => (
                                                        <label key={permission.permission_name} className="flex items-center gap-2">
                                                            <input
                                                                type="checkbox"
                                                                checked={formData.permissions.includes(permission.permission_name)}
                                                                onChange={() => handlePermissionChange(permission.permission_name)}
                                                                className="brand-checkbox"
                                                                disabled={!canEditUserPermission}
                                                            />
                                                            <span className="text-base">{permission.label}</span>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <button
                                                                        type="button"
                                                                        className="ml-2 text-sm text-gray-500 hover:text-gray-700"
                                                                        onClick={(e) => e.preventDefault()}
                                                                    >
                                                                        <span style={{ display: 'inline-block', width: 16, height: 16, lineHeight: '16px', textAlign: 'center', borderRadius: 8, border: '1px solid #cbd5e1' }}>?</span>
                                                                    </button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <div>{permission.description || permission.label}</div>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </label>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            {!canEditUserPermission && (
                                <p className="mt-2 text-xs text-gray-500">You don't have permission to edit user permissions.</p>
                            )}
                        </div>
                        
                        <DialogFooter>
                            <Button
                                type="button"
                                onClick={handleClose}
                                variant="outline"
                                disabled={formLoading}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="text-white"
                                style={{ backgroundColor: '#00824E' }}
                                disabled={formLoading}
                            >
                                {formLoading ? 'Updating...' : 'Update Role'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
};
