import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function TableManager() {
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  const [name, setName] = useState('');

  const { data: tables = [] } = useQuery({
    queryKey: ['tables', user?.email],
    queryFn: () => base44.entities.RestaurantTable.filter({ created_by: user?.email }, 'name'),
    enabled: !!user?.email,
  });

  const create = useMutation({
    mutationFn: (data) => base44.entities.RestaurantTable.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      setName('');
      toast.success('Masa eklendi');
    },
  });

  const remove = useMutation({
    mutationFn: (id) => base44.entities.RestaurantTable.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      toast.success('Masa silindi');
    },
  });

  const handleBulkAdd = () => {
    const count = parseInt(name);
    if (!isNaN(count) && count > 0 && count <= 50) {
      const existing = tables.length;
      const newTables = Array.from({ length: count }, (_, i) => ({
        name: `Masa ${existing + i + 1}`,
        status: 'empty',
      }));
      Promise.all(newTables.map(t => base44.entities.RestaurantTable.create(t))).then(() => {
        queryClient.invalidateQueries({ queryKey: ['tables'] });
        setName('');
        toast.success(`${count} masa eklendi`);
      });
      return;
    }

    if (!name.trim()) return;
    create.mutate({ name: name.trim(), status: 'empty' });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Masalar</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Masa adı veya sayı (toplu ekle)"
            className="rounded-xl"
          />
          <Button className="rounded-xl gap-1" onClick={handleBulkAdd}>
            <Plus className="h-4 w-4" /> Ekle
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {tables.map((table) => (
            <div key={table.id} className="flex items-center justify-between bg-secondary rounded-xl px-3 py-2">
              <span className="text-sm font-medium">{table.name}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove.mutate(table.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}