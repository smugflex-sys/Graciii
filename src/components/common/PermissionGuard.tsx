import { useAuth, RolePermissions } from '../../contexts/AuthContext';
import { ReactNode } from 'react';

interface PermissionGuardProps {
  permission?: keyof RolePermissions;
  permissions?: (keyof RolePermissions)[];
  requireAll?: boolean; // If true, requires all permissions; if false, requires any
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Conditionally renders children only if the current user has the specified permission(s).
 */
export function PermissionGuard({ 
  permission, 
  permissions, 
  requireAll = false, 
  children, 
  fallback = null 
}: PermissionGuardProps) {
  const { permissions: userPermissions } = useAuth();

  // Handle single permission (backward compatibility)
  if (permission) {
    if (!userPermissions[permission]) {
      return <>{fallback}</>;
    }
    return <>{children}</>;
  }

  // Handle multiple permissions
  if (permissions && permissions.length > 0) {
    const hasPermissions = requireAll
      ? permissions.every(p => userPermissions[p])
      : permissions.some(p => userPermissions[p]);

    if (!hasPermissions) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
}

/**
 * Higher-order component for wrapping components with permission checks
 */
export function withPermission<P extends object>(
  Component: React.ComponentType<P>,
  permission: keyof RolePermissions,
  fallback?: ReactNode
) {
  return function PermissionWrapper(props: P) {
    return (
      <PermissionGuard permission={permission} fallback={fallback}>
        <Component {...props} />
      </PermissionGuard>
    );
  };
}

/**
 * Hook to check if user has specific permissions
 */
export function usePermissions() {
  const { permissions, user, hasRole } = useAuth();

  const hasPermission = (permission: keyof RolePermissions) => {
    return permissions[permission];
  };

  const hasAnyPermission = (perms: (keyof RolePermissions)[]) => {
    return perms.some(p => permissions[p]);
  };

  const hasAllPermissions = (perms: (keyof RolePermissions)[]) => {
    return perms.every(p => permissions[p]);
  };

  const canAccess = (requiredPermissions: {
    roles?: string[];
    permissions?: (keyof RolePermissions)[];
    requireAll?: boolean;
  }) => {
    let hasAccess = true;

    // Check role requirements
    if (requiredPermissions.roles && requiredPermissions.roles.length > 0) {
      hasAccess = hasRole(requiredPermissions.roles);
    }

    // Check permission requirements
    if (hasAccess && requiredPermissions.permissions && requiredPermissions.permissions.length > 0) {
      hasAccess = requiredPermissions.requireAll
        ? hasAllPermissions(requiredPermissions.permissions)
        : hasAnyPermission(requiredPermissions.permissions);
    }

    return hasAccess;
  };

  return {
    permissions,
    user,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canAccess,
    hasRole,
  };
}
