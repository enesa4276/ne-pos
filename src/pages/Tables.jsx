import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { useLang } from '@/lib/LanguageContext';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Package, Loader2, Shield } from 'lucide-react';
import TableGrid from '@/components/pos/TableGrid';

export default function Tables() {
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();
  const { t } = useLang();
  const isAdmin = user?.role === 'admin' || user?.is_super_admin === true;

  const { data: tables = [], isLoading } = useQuery({
    queryKey: ['tables', user?.email],
    queryFn: () => base44.entities.RestaurantTable.filter({ created_by: user?.email }, 'name'),
    enabled: !!user?.email,
  });

  const handleTableClick = (table) => {
    navigate(`/pos?tableId=${table.id}&tableName=${encodeURIComponent(table.name)}`);
  };

  const handleTakeaway = () => {
    navigate('/pos?type=takeaway');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        {/* Admin için belirgin Süper Admin paneli butonu */}
        {isAdmin && (
          <button
            onClick={() => navigate('/super-admin')}
            className="w-full p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-700 text-white shadow-lg hover:shadow-xl transition-all flex items-center gap-3 text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Shield className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-base">Süper Admin Paneli</p>
              <p className="text-xs opacity-80">Tenant ve AI API yönetimine geç</p>
            </div>
            <span className="text-xl">→</span>
          </button>
        )}

        {/* Takeaway Button */}
        <Button
          onClick={handleTakeaway}
          className="w-full h-16 text-lg font-bold rounded-2xl gap-3 bg-accent hover:bg-accent/90 text-accent-foreground"
        >
          <Package className="h-6 w-6" />
          {t('quickOrder')}
        </Button>

        {/* Tables */}
        <div>
          <h2 className="text-lg font-bold mb-4">{t('tables')}</h2>
          <TableGrid tables={tables} onTableClick={handleTableClick} />
          {tables.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              {t('noTables')}
            </p>
          )}
        </div>
      </div>
    </ScrollArea>
  );
}