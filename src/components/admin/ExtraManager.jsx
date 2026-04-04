import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ExtraManager() {
  const queryClient = useQueryClient();
  const [groupName, setGroupName] = useState('');
  const [groupType, setGroupType] = useState('multiple');
  const [extraName, setExtraName] = useState('');
  const [extraPrice, setExtraPrice] = useState('');
  const [extraGroupId, setExtraGroupId] = useState('');

  const { data: extraGroups = [], isLoading: loadingGroups } = useQuery({
    queryKey: ['extraGroups'],
    queryFn: () => base44.entities.ExtraGroup.list(),
  });

  const { data: extras = [], isLoading: loadingExtras } = useQuery({
    queryKey: ['extras'],
    queryFn: () => base44.entities.Extra.list(),
  });

  const createGroup = useMutation({
    mutationFn: (data) => base44.entities.ExtraGroup.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['extraGroups'] });
      setGroupName('');
      toast.success('Ekstra grubu eklendi');
    },
  });

  const deleteGroup = useMutation({
    mutationFn: (id) => base44.entities.ExtraGroup.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['extraGroups'] }),
  });

  const createExtra = useMutation({
    mutationFn: (data) => base44.entities.Extra.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['extras'] });
      setExtraName('');
      setExtraPrice('');
      toast.success('Ekstra eklendi');
    },
  });

  const deleteExtra = useMutation({
    mutationFn: (id) => base44.entities.Extra.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['extras'] }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ekstra Grupları & Seçenekler</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add Group */}
        <div className="space-y-2">
          <h3 className="font-semibold text-sm">Yeni Grup Ekle</h3>
          <div className="flex gap-2">
            <Input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Grup adı (ör: Porsiyon)"
              className="rounded-xl"
            />
            <Select value={groupType} onValueChange={setGroupType}>
              <SelectTrigger className="w-48 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single_required">Tekli Zorunlu</SelectItem>
                <SelectItem value="multiple">Çoklu Seçim</SelectItem>
              </SelectContent>
            </Select>
            <Button className="rounded-xl gap-1" onClick={() => {
              if (!groupName.trim()) return;
              createGroup.mutate({ name: groupName.trim(), selection_type: groupType });
            }}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Groups List */}
        {extraGroups.map((group) => (
          <div key={group.id} className="bg-secondary rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-sm">{group.name}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  ({group.selection_type === 'single_required' ? 'Tekli Zorunlu' : 'Çoklu'})
                </span>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteGroup.mutate(group.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {/* Extras in group */}
            <div className="space-y-1 pl-3">
              {extras.filter(e => e.group_id === group.id).map(extra => (
                <div key={extra.id} className="flex items-center justify-between bg-background rounded-lg px-3 py-2">
                  <span className="text-sm">{extra.name} {extra.price > 0 && <span className="text-primary">+₺{extra.price}</span>}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteExtra.mutate(extra.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Add Extra to group */}
            <div className="flex gap-2 pl-3">
              <Input
                placeholder="Seçenek adı"
                className="rounded-lg text-sm"
                value={extraGroupId === group.id ? extraName : ''}
                onFocus={() => setExtraGroupId(group.id)}
                onChange={(e) => { setExtraGroupId(group.id); setExtraName(e.target.value); }}
              />
              <Input
                type="number"
                placeholder="₺ Fiyat"
                className="rounded-lg text-sm w-24"
                value={extraGroupId === group.id ? extraPrice : ''}
                onFocus={() => setExtraGroupId(group.id)}
                onChange={(e) => { setExtraGroupId(group.id); setExtraPrice(e.target.value); }}
              />
              <Button size="sm" className="rounded-lg" onClick={() => {
                if (!extraName.trim() || extraGroupId !== group.id) return;
                createExtra.mutate({ name: extraName.trim(), group_id: group.id, price: parseFloat(extraPrice) || 0 });
              }}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}