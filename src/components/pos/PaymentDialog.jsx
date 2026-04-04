import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Banknote, CreditCard, Check, XCircle, Loader2, Delete, Clock } from 'lucide-react';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useLang } from '@/lib/LanguageContext';
import { formatCurrency } from '@/lib/i18n';

const NUMPAD = ['7','8','9','4','5','6','1','2','3','C','0','.'];

function CashPayment({ total, onComplete }) {
  const { t } = useLang();
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
        <p className="text-muted-foreground text-sm">{t('totalAmount')}</p>
        <p className="text-3xl font-bold text-primary">{formatCurrency(total)}</p>
      </div>

      <div className="bg-secondary rounded-xl p-4 text-center">
        <p className="text-xs text-muted-foreground mb-1">{t('receivedAmount')}</p>
        <p className="text-3xl font-bold">€{input || '0'}</p>
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
          <p className="text-sm text-muted-foreground">{t('change')}</p>
          <p className="text-2xl font-bold text-accent">{formatCurrency(change)}</p>
        </div>
      )}

      <Button
        className="w-full h-14 text-lg font-bold rounded-xl"
        disabled={cashAmount < total}
        onClick={() => onComplete('cash')}
      >
        <Check className="h-5 w-5 mr-2" />
        {t('confirmPayment')}
      </Button>
    </div>
  );
}

function CardPayment({ total, onComplete, onFail }) {
  const { t } = useLang();
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
          <p className="text-lg font-bold">{t('sendingToPos')}</p>
          <p className="text-muted-foreground">{t('pleaseWait')}</p>
          <p className="text-2xl font-bold text-primary">{formatCurrency(total)}</p>
        </div>
        {step === 'waiting' && (
          <div className="flex gap-3 pt-4">
            <Button
              className="h-14 px-8 rounded-xl bg-accent hover:bg-accent/90"
              onClick={() => onComplete('card')}
            >
              <Check className="h-5 w-5 mr-2" />
              {t('transactionSuccess')}
            </Button>
            <Button
              variant="destructive"
              className="h-14 px-8 rounded-xl"
              onClick={onFail}
            >
              <XCircle className="h-5 w-5 mr-2" />
              {t('declined')}
            </Button>
          </div>
        )}
      </div>
    );
  }

  return null;
}

export default function PaymentDialog({ open, onClose, total, onComplete, onPayLater }) {
  const { t } = useLang();
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
          <DialogTitle className="text-xl">{t('paymentTitle')}</DialogTitle>
        </DialogHeader>

        {failed && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 text-center space-y-3">
            <XCircle className="h-10 w-10 text-destructive mx-auto" />
            <p className="font-bold text-destructive">{t('transactionDeclined')}</p>
            <Button variant="outline" onClick={() => { setFailed(false); setMethod(null); }}>
              {t('tryAgain')}
            </Button>
          </div>
        )}

        {!method && !failed && (
          <div className="space-y-4 py-2">
            <div className="text-center">
              <p className="text-muted-foreground text-sm">{t('totalAmount')}</p>
              <p className="text-3xl font-bold text-primary">{formatCurrency(total)}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setMethod('cash')}
                className={cn(
                  "flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all",
                  "hover:border-primary hover:bg-primary/5 border-border"
                )}
              >
                <Banknote className="h-10 w-10 text-accent" />
                <span className="font-bold text-base">{t('cash')}</span>
              </button>
              <button
                onClick={() => setMethod('card')}
                className={cn(
                  "flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all",
                  "hover:border-primary hover:bg-primary/5 border-border"
                )}
              >
                <CreditCard className="h-10 w-10 text-primary" />
                <span className="font-bold text-base">{t('creditCard')}</span>
              </button>
            </div>
            {onPayLater && (
              <button
                onClick={onPayLater}
                className={cn(
                  "w-full flex items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all",
                  "hover:border-amber-500/50 hover:bg-amber-500/5 border-border text-muted-foreground hover:text-amber-600"
                )}
              >
                <Clock className="h-5 w-5" />
                <span className="font-semibold">{t('payLater')}</span>
              </button>
            )}
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