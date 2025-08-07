import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useSelector } from 'react-redux';
import { selectCurrentUser, selectToken } from '../features/auth/authSlice';

interface Permission {
  id: number;
  permission_name: string;
  label: string;
  permission_group?: string;
}

interface PermissionContextType {
  permissions: Permission[];
  hasPermission: (permissionName: string) => boolean;
  loading: boolean;
  error: string | null;
}

const PermissionContext = createContext<PermissionContextType>({
  permissions: [],
  hasPermission: () => false,
  loading: false,
  error: null,
});

interface PermissionProviderProps {
  children: ReactNode;
}

export const PermissionProvider: React.FC<PermissionProviderProps> = ({ children }) => {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentUser = useSelector(selectCurrentUser);
  const token = useSelector(selectToken);

  useEffect(() => {
    const fetchUserPermissions = async () => {
      if (!currentUser?.role_id || !token) {
        setPermissions([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/v1/permissions/role/${currentUser.role_id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch permissions');
        }

        const data = await response.json();
        setPermissions(data.permissions || []);
      } catch (err) {
        console.error('Error fetching permissions:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch permissions');
        setPermissions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUserPermissions();
  }, [currentUser?.role_id, token]);

  const hasPermission = (permissionName: string): boolean => {
    return permissions.some(permission => permission.permission_name === permissionName);
  };

  const value: PermissionContextType = {
    permissions,
    hasPermission,
    loading,
    error,
  };

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
};

export const usePermissions = (): PermissionContextType => {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return context;
};

export const usePermission = (permissionName: string): boolean => {
  const { hasPermission } = usePermissions();
  return hasPermission(permissionName);
};
