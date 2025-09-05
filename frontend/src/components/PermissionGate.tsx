import type { ReactNode } from 'react';
import { usePermissions } from '../contexts/PermissionContext';

interface PermissionGateProps {
  permission: string | string[];
  children: ReactNode;
  fallback?: ReactNode;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({ 
  permission, 
  children, 
  fallback = null 
}) => {
  const { hasPermission, loading } = usePermissions();

  // Avoid flashing fallback (403) while permissions are still loading
  if (loading) return null;

  // Handle both single permission and array of permissions
  const allowed = Array.isArray(permission) 
    ? permission.some(perm => hasPermission(perm))  // Check if user has ANY of the permissions
    : hasPermission(permission);                     // Check single permission

  return allowed ? <>{children}</> : <>{fallback}</>;
};
