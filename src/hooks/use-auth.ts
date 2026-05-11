import { useContext, useCallback, useEffect, useState } from 'react';
import { AuthContext } from '../contexts/auth-context';

export interface UseAuthReturn {
  user: any;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
}

/**
 * Hook for accessing authentication context
 * Provides user state and auth methods
 */
export function useAuth(): UseAuthReturn {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  
  return context;
}

/**
 * Hook for checking if user has specific permission
 */
export function usePermission(requiredPermission: string): boolean {
  const { hasPermission } = useAuth();
  return hasPermission(requiredPermission);
}

/**
 * Hook for checking if user has specific role
 */
export function useRole(requiredRole: string): boolean {
  const { hasRole } = useAuth();
  return hasRole(requiredRole);
}

/**
 * Hook for protecting routes based on authentication
 */
export function useProtectedRoute(requiredPermission?: string, requiredRole?: string): boolean {
  const { isAuthenticated, hasPermission, hasRole } = useAuth();
  
  if (!isAuthenticated) {
    return false;
  }
  
  if (requiredRole && !hasRole(requiredRole)) {
    return false;
  }
  
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return false;
  }
  
  return true;
}
