import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Banknote, CreditCard, Check, XCircle, Loader2, Delete } from 'lucide-react';
import { cn } from '@/lib/utils';

const NUMPAD = ['7','8','9','4','5','6','1','2','3','C','0','.'];

function CashPayment({ total, onComplete }) {
  const [input, setInput] = useState('');
  const cashAmount = parseFloat(input) || 0;
  const change = cashAmount - total;

  const handleNum = (val) => {
    if (val === 'C') { setInput(''); return; }
    if (val === '.' && input.includes('.')) return;
    setInput(prev => prev + val);
  };

  return (
    <div className="space-y-4">
      <div className="text-center space-y-1">
        <p className="text-muted-foreground text-sm">Toplam Tutar</p>
        <p className="text-3xl font-bold text-primary">₺{total.toFixed(2)}</p>
      </div>

      <div className="bg-secondary rounded-xl p-4 text-center">
        <p className="text-xs text-muted-foreground mb-1">Alınan Tutar</p>
        <p className="text-3xl font-bold">{input || '0'} ₺</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {NUMPAD.map((key) => (
          <Button
            key={key}
            variant={key === 'C' ? 'destructive' : 'outline'}
            className="h-14 text-xl font-bold rounded-xl"
            onClick={() => handleNum(key)}
          >
            {key === 'C' ? <Delete className="h-5 w-5" /> : key}
          </Button>
        ))}
      </div>

      {change >= 0 && cashAmount > 0 && (
        <div className="bg-accent/10 border border-accent/30 rounded-xl p-4 text-center">
          <p className="text-sm text-muted-foreground">Para Üstü</p>
          <p className="text-2xl font-bold text-accent">₺{change.toFixed(2)}</p>
        </div>
      )}

      <Button
        className="w-full h-14 text-lg font-bold rounded-xl"
        disabled={cashAmount < total}
        onClick={() => onComplete('cash')}
      >
        <Check className="h-5 w-5 mr-2" />
        Ödemeyi Onayla
      </Button>
    </div>
  );
}

function CardPayment({ total, onComplete, onFail }) {
  const [step, setStep] = useState('sending');

  React.useEffect(() => {
    const timer = setTimeout(() => setStep('waiting'), 1500);
    return () => clearTimeout(timer);
  }, []);

  if (step === 'sending' || step === 'waiting') {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-6">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
          </div>
        </div>
        <div className="text-center space-y-2">
          <p className="text-lg font-bold">POS Cihazına Gönderiliyor...</p>
          <p className="text-muted-foreground">Lütfen Bekleyin</p>
          <p className="text-2xl font-bold text-primary">₺{total.toFixed(2)}</p>
        </div>
        {step === 'waiting' && (
          <div className="flex gap-3 pt-4">
            <Button
              className="h-14 px-8 rounded-xl bg-accent hover:bg-accent/90"
              onClick={() => onComplete('card')}
            >
              <Check className="h-5 w-5 mr-2" />
              İşlem Başarılı
            </Button>
            <Button
              variant="destructive"
              className="h-14 px-8 rounded-xl"
              onClick={onFail}
            >
              <XCircle className="h-5 w-5 mr-2" />
              Reddedildi
            </Button>
          </div>
        )}
      </div>
    );
  }

  return null;
}

export default function PaymentDialog({ open, onClose, total, onComplete }) {
  const [method, setMethod] = useState(null);
  const [failed, setFailed] = useState(false);

  const handleClose = () => {
    setMethod(null);
    setFailed(false);
    onClose();
  };

  const handleComplete = (paymentMethod) => {
    onComplete(paymentMethod);
    setMethod(null);
    setFailed(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Ödeme Al</DialogTitle>
        </DialogHeader>

        {failed && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 text-center space-y-3">
            <XCircle className="h-10 w-10 text-destructive mx-auto" />
            <p className="font-bold text-destructive">İşlem Reddedildi</p>
            <Button variant="outline" onClick={() => { setFailed(false); setMethod(null); }}>
              Tekrar Dene
            </Button>
          </div>
        )}

        {!method && !failed && (
          <div className="grid grid-cols-2 gap-4 py-4">
            <button
              onClick={() => setMethod('cash')}
              className={cn(
                "flex flex-col items-center gap-3 p-8 rounded-2xl border-2 transition-all",
                "hover:border-primary hover:bg-primary/5 border-border"
              )}
            >
              <Banknote className="h-12 w-12 text-accent" />
              <span className="font-bold text-lg">Nakit</span>
            </button>
            <button
              onClick={() => setMethod('card')}
              className={cn(
                "flex flex-col items-center gap-3 p-8 rounded-2xl border-2 transition-all",
                "hover:border-primary hover:bg-primary/5 border-border"
              )}
            >
              <CreditCard className="h-12 w-12 text-primary" />
              <span className="font-bold text-lg">Kredi Kartı</span>
            </button>
          </div>
        )}

        {method === 'cash' && <CashPayment total={total} onComplete={handleComplete} />}
        {method === 'card' && (
          <CardPayment
            total={total}
            onComplete={handleComplete}
            onFail={() => { setMethod(null); setFailed(true); }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}