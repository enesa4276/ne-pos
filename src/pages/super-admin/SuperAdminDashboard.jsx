import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { Building2, Sparkles, ShieldAlert, Loader2 } from 'lucide-react';

export default function SuperAdminDashboard() {
  const { data: user, isLoading } = useCurrentUser();

  if (isLoading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!user?.is_super_admin && user?.role !== 'admin') {
    return (
      <div className="p-8 text-center max-w-md mx-auto">
        <ShieldAlert className="w-16 h-16 mx-auto text-destructive mb-4" />
        <h2 className="text-xl font-bold mb-2">Erişim engellendi</h2>
        <p className="text-muted-foreground">Bu alan sadece süper admin içindir.</p>
      </div>
    );
  }

  const tiles = [
    {
      to: '/super-admin/tenants',
      icon: Building2,
      title: 'Tenant Yönetimi',
      desc: 'Restoran hesaplarını, özelliklerini ve limitlerini yönetin.',
      color: 'from-blue-500/20 to-blue-500/5',
      iconColor: 'text-blue-500',
    },
    {
      to: '/super-admin/ai-api',
      icon: Sparkles,
      title: 'AI API Yönetimi',
      desc: 'AI özelliklerini sağlayıcı ve modellerle eşleştirin.',
      color: 'from-purple-500/20 to-purple-500/5',
      iconColor: 'text-purple-500',
    },
  ];

  return (
    <ScrollArea className="h-full">
      <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-8">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Süper Admin</p>
          <h1 className="text-3xl md:text-4xl font-bold mt-1">Kontrol Paneli</h1>
          <p className="text-muted-foreground mt-2">Tüm tenant'ları ve global yapay zeka altyapısını buradan yönetin.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tiles.map(({ to, icon: Icon, title, desc, color, iconColor }) => (
            <Link key={to} to={to}>
              <Card className={`p-6 hover:shadow-lg transition-all cursor-pointer bg-gradient-to-br ${color} border-0 backdrop-blur-sm h-full`}>
                <div className={`w-12 h-12 rounded-2xl bg-card flex items-center justify-center mb-4 shadow-sm`}>
                  <Icon className={`w-6 h-6 ${iconColor}`} />
                </div>
                <h3 className="text-lg font-bold">{title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{desc}</p>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}