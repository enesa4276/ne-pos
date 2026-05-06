import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
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
  const { data: user } = useCurrentUser();
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadTenant = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const tenantId = user.is_super_admin
        ? (user.selected_tenant_id || user.tenant_id)
        : user.tenant_id;

      if (!tenantId) {
        setTenant(null);
      } else {
        const tenants = await base44.entities.Tenant.filter({ tenant_id: tenantId });
        setTenant(tenants[0] || null);
      }
    } catch (error) {
      console.error('Tenant yükleme hatası:', error);
      setTenant(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadTenant();
  }, [loadTenant]);

  const hasFeature = useCallback((featureKey) => {
    if (!tenant) return false;
    return tenant.features_enabled?.[featureKey] === true;
  }, [tenant]);

  const hasPermission = useCallback((permission) => {
    if (!user) return false;
    if (user.is_super_admin) return true;
    return Array.isArray(user.permissions) && user.permissions.includes(permission);
  }, [user]);

  return (
    <TenantContext.Provider value={{ tenant, loading, hasFeature, hasPermission, refresh: loadTenant }}>
      {children}
    </TenantContext.Provider>
  );
}

export const useTenant = () => useContext(TenantContext);