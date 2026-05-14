import React, { createContext, useContext, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';

const TenantContext = createContext({
  tenant: null,
  loading: true,
  hasFeature: () => false,
  hasPermission: () => false,
  refresh: () => {},
});

export function TenantProvider({ children }) {
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const queryClient = useQueryClient();

  // Kullanıcının tenant_id'si (impersonate için selected_tenant_id öncelikli)
  const tenantId = user?.selected_tenant_id || user?.tenant_id;

  const { data: tenant = null, isLoading: tenantLoading } = useQuery({
    queryKey: ['tenant', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const results = await base44.entities.Tenant.filter({ tenant_id: tenantId });
      return results[0] || null;
    },
    enabled: !!user && !!tenantId,
    staleTime: 30_000,   // 30 sn cache — çok sık refetch önle
    gcTime: 60_000,
  });

  const loading = userLoading || (!!tenantId && tenantLoading);

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['tenant', tenantId] });
  }, [queryClient, tenantId]);

  const hasFeature = useCallback(
    (featureKey) => tenant?.features_enabled?.[featureKey] === true,
    [tenant]
  );

  const hasPermission = useCallback(
    (permission) => {
      if (!user) return false;
      if (user.is_super_admin || user.role === 'admin') return true;
      return Array.isArray(user.permissions) && user.permissions.includes(permission);
    },
    [user]
  );

  return (
    <TenantContext.Provider value={{ tenant, loading, hasFeature, hasPermission, refresh }}>
      {children}
    </TenantContext.Provider>
  );
}

export const useTenant = () => useContext(TenantContext);