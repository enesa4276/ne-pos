import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { useLang } from '@/lib/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Save, LogOut, Building2, Phone, Mail, MapPin, Receipt, Hash, Globe, Key, Store, Copy, Check, Upload, ImageIcon, Loader2 } from 'lucide-react';

export default function Account() {
  const { data: user, isLoading } = useCurrentUser();
  const { t } = useLang();

  const [form, setForm] = useState({
    company_name: '',
    vat_number: '',
    address: '',
    phone: '',
    email_receipt: '',
    receipt_footer: '',
    receipt_logo_url: '',
    receipt_font: 'default',
    receipt_paper_size: '80mm',
    receipt_font_size: 'medium',
    wix_webhook_secret: '',
    wix_site_id: '',
    takeaway_webhook_secret: '',
    takeaway_store_id: '',
    uber_eats_webhook_secret: '',
    uber_eats_store_id: '',
  });
  const [saving, setSaving] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef(null);

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  useEffect(() => {
    if (user) {
      setForm({
        company_name: user.company_name || '',
        vat_number: user.vat_number || '',
        address: user.address || '',
        phone: user.phone || '',
        email_receipt: user.email_receipt || '',
        receipt_footer: user.receipt_footer || '',
        receipt_logo_url: user.receipt_logo_url || '',
        receipt_font: user.receipt_font || 'default',
        receipt_paper_size: user.receipt_paper_size || '80mm',
        receipt_font_size: user.receipt_font_size || 'medium',
        wix_webhook_secret: user.wix_webhook_secret || '',
        wix_site_id: user.wix_site_id || '',
        takeaway_webhook_secret: user.takeaway_webhook_secret || '',
        takeaway_store_id: user.takeaway_store_id || '',
        uber_eats_webhook_secret: user.uber_eats_webhook_secret || '',
        uber_eats_store_id: user.uber_eats_store_id || '',
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
        {icon}{label}
      </Label>
      <Input
        value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        placeholder={placeholder}
        className="rounded-xl"
      />
    </div>
  );

  const webhookUrlRow = (url, copyKey) => (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1.5 text-sm font-medium">
        <Globe className="h-3.5 w-3.5" />{t('webhookUrl')}
      </Label>
      <div className="flex items-center gap-2">
        <Input readOnly value={url} className="rounded-xl font-mono text-xs bg-secondary/50" />
        <Button size="icon" variant="outline" className="shrink-0 rounded-xl" onClick={() => handleCopy(url, copyKey)}>
          {copiedKey === copyKey ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, receipt_logo_url: file_url }));
    setUploadingLogo(false);
    toast.success('Logo yüklendi');
  };

  const selectField = (label, key, icon, options) => (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1.5 text-sm font-medium">
        {icon}{label}
      </Label>
      <Select value={form[key]} onValueChange={val => setForm(f => ({ ...f, [key]: val }))}>
        <SelectTrigger className="rounded-xl">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map(o => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  const origin = window.location.origin;

  const SaveBtn = () => (
    <Button className="w-full rounded-xl gap-2 mt-2" onClick={handleSave} disabled={saving}>
      <Save className="h-4 w-4" />
      {saving ? t('saving') : t('saveSettings')}
    </Button>
  );

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6 overflow-y-auto h-full">

      {/* User Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" />{t('accountInfo')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between bg-secondary/50 rounded-xl px-4 py-3">
            <div>
              <p className="font-semibold">{user?.full_name || '—'}</p>
              <p className="text-sm text-muted-foreground">{user?.email || '—'}</p>
            </div>
            <Button variant="destructive" size="sm" className="rounded-xl gap-2" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />{t('logout')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Wix Integration */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4 text-blue-500" />{t('wixIntegration')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {webhookUrlRow(`${origin}/functions/wixWebhook`, 'wix')}
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-3 text-xs text-blue-700 dark:text-blue-300">
            <p className="font-semibold mb-1">{t('wixHowToTitle')}</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>{t('wixStep1')}</li>
              <li>{t('wixStep2')}</li>
              <li>{t('wixStep3')}</li>
              <li>{t('wixStep4')}</li>
              <li>{t('wixStep5')}</li>
            </ol>
          </div>
          {field(t('wixWebhookSecret'), 'wix_webhook_secret', <Key className="h-3.5 w-3.5" />, 'mysecret123')}
          {field(t('wixSiteId'), 'wix_site_id', <Store className="h-3.5 w-3.5" />, 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx')}
          <SaveBtn />
        </CardContent>
      </Card>

      {/* Takeaway.com Integration */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Store className="h-4 w-4 text-green-500" />{t('takeawayIntegration')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {webhookUrlRow(`${origin}/functions/takeaway-webhook`, 'takeaway')}
          <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl p-3 text-xs text-green-700 dark:text-green-300">
            <p className="font-semibold mb-1">{t('takeawayHowToTitle')}</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>{t('takeawayStep1')}</li>
              <li>{t('takeawayStep2')}</li>
              <li>{t('takeawayStep3')}</li>
            </ol>
          </div>
          {field(t('takeawayWebhookSecret'), 'takeaway_webhook_secret', <Key className="h-3.5 w-3.5" />, 'mysecret456')}
          {field(t('takeawayStoreId'), 'takeaway_store_id', <Store className="h-3.5 w-3.5" />, '12345')}
          <SaveBtn />
        </CardContent>
      </Card>

      {/* Uber Eats Integration */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Store className="h-4 w-4 text-purple-500" />{t('uberEatsIntegration')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {webhookUrlRow(`${origin}/functions/uber-eats-webhook`, 'uber')}
          <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-xl p-3 text-xs text-purple-700 dark:text-purple-300">
            <p className="font-semibold mb-1">{t('uberEatsHowToTitle')}</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>{t('uberEatsStep1')}</li>
              <li>{t('uberEatsStep2')}</li>
              <li>{t('uberEatsStep3')}</li>
            </ol>
          </div>
          {field(t('uberEatsWebhookSecret'), 'uber_eats_webhook_secret', <Key className="h-3.5 w-3.5" />, 'mysecret789')}
          {field(t('uberEatsStoreId'), 'uber_eats_store_id', <Store className="h-3.5 w-3.5" />, 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx')}
          <SaveBtn />
        </CardContent>
      </Card>

      {/* Receipt Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" />{t('receiptSettings')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {field(t('companyName'), 'company_name', <Building2 className="h-3.5 w-3.5" />, 'Brasserie De Kroon')}
          {field(t('vatNumber'), 'vat_number', <Hash className="h-3.5 w-3.5" />, 'BE 0123.456.789')}
          {field(t('address'), 'address', <MapPin className="h-3.5 w-3.5" />, 'Grote Markt 1, 9000 Gent')}
          {field(t('phone'), 'phone', <Phone className="h-3.5 w-3.5" />, '+32 9 000 00 00')}
          {field(t('emailReceipt'), 'email_receipt', <Mail className="h-3.5 w-3.5" />, 'info@restaurant.be')}
          {field(t('receiptFooter'), 'receipt_footer', <Receipt className="h-3.5 w-3.5" />, t('thankYou'))}

          {/* Logo Upload */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-sm font-medium">
              <ImageIcon className="h-3.5 w-3.5" />Fiş Logosu
            </Label>
            <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            <div className="flex items-center gap-3">
              {form.receipt_logo_url && (
                <img src={form.receipt_logo_url} alt="Logo" className="h-12 w-auto rounded-lg border border-border object-contain bg-white p-1" />
              )}
              <Button
                type="button"
                variant="outline"
                className="rounded-xl gap-2"
                onClick={() => logoInputRef.current?.click()}
                disabled={uploadingLogo}
              >
                {uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploadingLogo ? 'Yükleniyor...' : 'Logo Yükle'}
              </Button>
              {form.receipt_logo_url && (
                <Button type="button" variant="ghost" size="sm" className="text-destructive rounded-xl" onClick={() => setForm(f => ({ ...f, receipt_logo_url: '' }))}>
                  Kaldır
                </Button>
              )}
            </div>
          </div>

          {/* Visual Options */}
          <div className="grid grid-cols-3 gap-3">
            {selectField('Kağıt Boyutu', 'receipt_paper_size', <Receipt className="h-3.5 w-3.5" />, [
              { value: '58mm', label: '58mm' },
              { value: '80mm', label: '80mm' },
            ])}
            {selectField('Font Stili', 'receipt_font', <Receipt className="h-3.5 w-3.5" />, [
              { value: 'default', label: 'Varsayılan' },
              { value: 'monospace', label: 'Monospace' },
              { value: 'serif', label: 'Serif' },
            ])}
            {selectField('Font Boyutu', 'receipt_font_size', <Receipt className="h-3.5 w-3.5" />, [
              { value: 'small', label: 'Küçük' },
              { value: 'medium', label: 'Orta' },
              { value: 'large', label: 'Büyük' },
            ])}
          </div>

          <SaveBtn />
        </CardContent>
      </Card>

    </div>
  );
}