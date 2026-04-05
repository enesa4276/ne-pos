import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { useLang } from '@/lib/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Save, LogOut, Building2, Phone, Mail, MapPin, Receipt, Hash, Globe, Key, Store } from 'lucide-react';

export default function Account() {
  const { user, isLoading } = useCurrentUser();
  const { t } = useLang();

  const [form, setForm] = useState({
    company_name: '',
    vat_number: '',
    address: '',
    phone: '',
    email_receipt: '',
    receipt_footer: '',
    wix_webhook_secret: '',
    wix_site_id: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        company_name: user.company_name || '',
        vat_number: user.vat_number || '',
        address: user.address || '',
        phone: user.phone || '',
        email_receipt: user.email_receipt || '',
        receipt_footer: user.receipt_footer || '',
        wix_webhook_secret: user.wix_webhook_secret || '',
        wix_site_id: user.wix_site_id || '',
      });
    }
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    await base44.auth.updateMe(form);
    setSaving(false);
    toast.success(t('savedSuccess'));
  };

  const handleLogout = () => {
    base44.auth.logout('/');
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const field = (label, key, icon, placeholder = '') => (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1.5 text-sm font-medium">
        {icon}
        {label}
      </Label>
      <Input
        value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        placeholder={placeholder}
        className="rounded-xl"
      />
    </div>
  );

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6">
      {/* User Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" />
            {t('accountInfo')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between bg-secondary/50 rounded-xl px-4 py-3">
            <div>
              <p className="font-semibold">{user?.full_name || '—'}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
            <Button variant="destructive" size="sm" className="rounded-xl gap-2" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              {t('logout')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Wix Integration Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            {t('wixIntegration')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-3 text-sm text-blue-700 dark:text-blue-300">
            <p className="font-semibold mb-1">{t('wixHowToTitle')}</p>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>{t('wixStep1')}</li>
              <li>{t('wixStep2')}</li>
              <li>{t('wixStep3')}</li>
              <li>{t('wixStep4')}</li>
              <li>{t('wixStep5')}</li>
            </ol>
          </div>
          {field(t('wixWebhookSecret'), 'wix_webhook_secret', <Key className="h-3.5 w-3.5" />, 'mysecret123')}
          {field(t('wixSiteId'), 'wix_site_id', <Store className="h-3.5 w-3.5" />, 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx')}

          <Button className="w-full rounded-xl gap-2 mt-2" onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? t('saving') : t('saveSettings')}
          </Button>
        </CardContent>
      </Card>

      {/* Company / Receipt Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" />
            {t('receiptSettings')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {field(t('companyName'), 'company_name', <Building2 className="h-3.5 w-3.5" />, 'Brasserie De Kroon')}
          {field(t('vatNumber'), 'vat_number', <Hash className="h-3.5 w-3.5" />, 'BE 0123.456.789')}
          {field(t('address'), 'address', <MapPin className="h-3.5 w-3.5" />, 'Grote Markt 1, 9000 Gent')}
          {field(t('phone'), 'phone', <Phone className="h-3.5 w-3.5" />, '+32 9 000 00 00')}
          {field(t('emailReceipt'), 'email_receipt', <Mail className="h-3.5 w-3.5" />, 'info@restaurant.be')}
          {field(t('receiptFooter'), 'receipt_footer', <Receipt className="h-3.5 w-3.5" />, t('thankYou'))}

          <Button className="w-full rounded-xl gap-2 mt-2" onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? t('saving') : t('saveSettings')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}