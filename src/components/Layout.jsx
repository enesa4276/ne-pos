import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutGrid, ShoppingCart, ClipboardList, Settings, BarChart3, Shield, Tablet as TabletIcon, Package, History } from 'lucide-react';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { cn } from '@/lib/utils';

const NAV = [
  { to: '/',          label: 'Masalar',    icon: LayoutGrid },
  { to: '/pos',       label: 'POS',        icon: ShoppingCart },
  { to: '/orders',    label: 'Anlık',      icon: ClipboardList },
  { to: '/history',   label: 'Geçmiş',     icon: History },
  { to: '/analytics', label: 'Analiz',     icon: BarChart3 },
  { to: '/admin',     label: 'Menü',       icon: Package },
  { to: '/account',   label: 'Ayarlar',    icon: Settings },
];

const SUPER_ADMIN_NAV = [
  { to: '/super-admin',         label: 'Süper Admin', icon: Shield },
  { to: '/super-admin/tenants', label: 'Tenants',     icon: LayoutGrid },
  { to: '/super-admin/ai-api',  label: 'AI API',      icon: Settings },
];

export default function Layout() {
  const location = useLocation();
  const { user } = useCurrentUser();
  const isSuperAdmin = user?.role === 'admin';
  const inSuperArea = location.pathname.startsWith('/super-admin');
  const items = inSuperArea ? SUPER_ADMIN_NAV : NAV;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-border bg-card/50 backdrop-blur-xl">
        <div className="px-5 py-5 border-b border-border">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center shadow-lg">
              <span className="text-white font-bold">N</span>
            </div>
            <div>
              <div className="font-bold text-lg leading-tight">Ne-POS</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                {inSuperArea ? 'Super Admin' : 'Restaurant'}
              </div>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {items.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border space-y-1">
          <Link
            to="/tablet"
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <TabletIcon className="h-3.5 w-3.5" />
            Tablet Modu
          </Link>
          {isSuperAdmin && !inSuperArea && (
            <Link
              to="/super-admin"
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <Shield className="h-3.5 w-3.5" />
              Süper Admin
            </Link>
          )}
          {isSuperAdmin && inSuperArea && (
            <Link
              to="/"
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Tenant Görünümüne Dön
            </Link>
          )}
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 flex flex-col">
        <Outlet />
      </main>

      {/* Mobile bottom nav — daha çok link sığabilmesi için yatay scroll */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-card/95 backdrop-blur-xl border-t border-border z-40 overflow-x-auto">
        <div className="flex min-w-full">
          {items.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  'flex flex-col items-center gap-0.5 py-2 text-[10px] flex-1 min-w-[64px]',
                  active ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}