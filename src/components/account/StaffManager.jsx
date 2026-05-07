import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';

// Garson / personel listesi — Staff entity üzerinde
export default function StaffManager() {
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  const [name, setName] = useState('');
  const [role, setRole] = useState('waiter');

  const { data: staff = [] } = useQuery({
    queryKey: ['staff', user?.email],
    queryFn: () => base44.entities.Staff.filter({ created_by: user?.email }, 'name').catch(() => []),
    enabled: !!user?.email,
  });

  const create = useMutation({
    mutationFn: (data) => base44.entities.Staff.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      setName('');
      toast.success('Personel eklendi');
    },
  });

  const remove = useMutation({
    mutationFn: (id) => base44.entities.Staff.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success('Personel silindi');
    },
  });

  const handleAdd = () => {
    if (!name.trim()) return;
    create.mutate({ name: name.trim(), role, is_active: true });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" /> Garson & Personel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Personel adı"
            className="rounded-xl"
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="rounded-xl border border-input bg-transparent px-3 text-sm"
          >
            <option value="waiter">Garson</option>
            <option value="kitchen">Mutfak</option>
            <option value="manager">Yönetici</option>
            <option value="cashier">Kasa</option>
          </select>
          <Button className="rounded-xl gap-1" onClick={handleAdd}>
            <UserPlus className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-1">
          {staff.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">Henüz personel eklenmemiş.</p>
          )}
          {staff.map((s) => (
            <div key={s.id} className="flex items-center justify-between bg-secondary/50 rounded-xl px-3 py-2">
              <div>
                <span className="text-sm font-medium">{s.name}</span>
                <span className="text-xs text-muted-foreground ml-2 capitalize">{s.role}</span>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove.mutate(s.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}