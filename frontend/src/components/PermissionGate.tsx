import type { ReactNode } from 'react';
import { usePermissions } from '../contexts/PermissionContext';

interface PermissionGateProps {
  permission: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({ 
  permission, 
  children, 
  fallback = null 
}) => {
  const { hasPermission } = usePermissions();
  const allowed = hasPermission(permission);
  
  return allowed ? <>{children}</> : <>{fallback}</>;
};
