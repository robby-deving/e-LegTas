import type { ReactNode } from 'react';
import { usePermission } from '../contexts/PermissionContext';

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
  const hasPermission = usePermission(permission);
  
  return hasPermission ? <>{children}</> : <>{fallback}</>;
};
