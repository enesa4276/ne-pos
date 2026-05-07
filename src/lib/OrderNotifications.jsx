import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';

// Global sipariş bildirim sistemi.
// - Her 5 saniyede yeni siparişleri kontrol eder.
// - Yeni sipariş geldiğinde notification_sounds[source] sesini çalar.
// - Sipariş "kabul" (accepted/preparing) olana kadar repeat_interval saniyede bir tekrar çalar.
// - Kullanıcı kabul edebilir veya iptal edebilir; iptal edilirse dış platforma push edilir.

const Ctx = createContext(null);

const PENDING_STATUSES = ['pending', 'open']; // henüz kabul edilmemiş
const DEFAULT_FALLBACK_SOUND = 'https://cdn.jsdelivr.net/gh/anars/blank-audio/250-milliseconds-of-silence.mp3';
// Tarayıcı ses oluşturucu — bildirim sesi yoksa basit beep
function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = 'sine'; o.frequency.value = 880;
    g.gain.value = 0.18;
    o.start();
    setTimeout(() => { o.stop(); ctx.close(); }, 350);
  } catch (_) {}
}

export function OrderNotificationsProvider({ children }) {
  const { data: user } = useCurrentUser();
  const [pendingOrders, setPendingOrders] = useState([]);
  const seenIdsRef = useRef(new Set());
  const repeatTimersRef = useRef(new Map()); // orderId -> timer
  const initializedRef = useRef(false);

  const settings = {
    enabled: user?.notification_enabled ?? true,
    sounds: user?.notification_sounds || {},
    repeatInterval: (user?.notification_repeat ?? 15) * 1000,
  };

  const playSourceSound = useCallback((source) => {
    if (!settings.enabled) return;
    const sound = settings.sounds[source];
    if (sound?.url) {
      const audio = new Audio(sound.url);
      audio.volume = 0.85;
      audio.play().catch(() => playBeep());
    } else {
      playBeep();
    }
  }, [settings.enabled, settings.sounds]);

  const startRepeating = useCallback((order) => {
    if (repeatTimersRef.current.has(order.id)) return;
    const tick = () => {
      playSourceSound(order.order_source || 'pos_dine_in');
    };
    const timer = setInterval(tick, settings.repeatInterval);
    repeatTimersRef.current.set(order.id, timer);
  }, [playSourceSound, settings.repeatInterval]);

  const stopRepeating = useCallback((orderId) => {
    const t = repeatTimersRef.current.get(orderId);
    if (t) {
      clearInterval(t);
      repeatTimersRef.current.delete(orderId);
    }
  }, []);

  // Polling
  useEffect(() => {
    if (!user?.email) return;
    let cancelled = false;

    async function poll() {
      try {
        const orders = await base44.entities.Order.filter(
          { created_by: user.email },
          '-created_date',
          50
        );
        if (cancelled) return;

        const pending = orders.filter((o) => PENDING_STATUSES.includes(o.status) && !o.sent_to_kitchen);

        // İlk yüklemede hepsini "görüldü" say — uygulama açılışında eski siparişleri çalmasın
        if (!initializedRef.current) {
          pending.forEach((o) => seenIdsRef.current.add(o.id));
          initializedRef.current = true;
          setPendingOrders(pending);
          return;
        }

        // Yeni gelenler için ses başlat
        pending.forEach((o) => {
          if (!seenIdsRef.current.has(o.id)) {
            seenIdsRef.current.add(o.id);
            playSourceSound(o.order_source || 'pos_dine_in');
            startRepeating(o);
          }
        });

        // Artık pending olmayanların timer'ını durdur
        const pendingIds = new Set(pending.map((o) => o.id));
        for (const id of repeatTimersRef.current.keys()) {
          if (!pendingIds.has(id)) stopRepeating(id);
        }

        setPendingOrders(pending);
      } catch (e) {
        console.warn('OrderNotifications poll failed:', e?.message);
      }
    }

    poll();
    const t = setInterval(poll, 5000);
    return () => { cancelled = true; clearInterval(t); };
  }, [user?.email, playSourceSound, startRepeating, stopRepeating]);

  // Cleanup tüm timer'lar
  useEffect(() => () => {
    for (const t of repeatTimersRef.current.values()) clearInterval(t);
    repeatTimersRef.current.clear();
  }, []);

  const acceptOrder = useCallback(async (order) => {
    stopRepeating(order.id);
    await base44.entities.Order.update(order.id, { status: 'accepted', sent_to_kitchen: true });
    setPendingOrders((p) => p.filter((o) => o.id !== order.id));
  }, [stopRepeating]);

  const rejectOrder = useCallback(async (order, reason = 'Restoran tarafından iptal edildi') => {
    stopRepeating(order.id);
    await base44.entities.Order.update(order.id, { status: 'cancelled', notes: reason });
    // Dış platforma iptal bildirimi
    if (['wix', 'uber_eats', 'takeaway_com'].includes(order.order_source)) {
      try {
        await base44.functions.invoke('pushOrderStatusToPlatforms', {
          order_id: order.id,
          status: 'cancelled',
          reason,
        });
      } catch (e) {
        console.warn('Push-back cancel failed:', e?.message);
      }
    }
    setPendingOrders((p) => p.filter((o) => o.id !== order.id));
  }, [stopRepeating]);

  return (
    <Ctx.Provider value={{ pendingOrders, acceptOrder, rejectOrder, settings, playSourceSound }}>
      {children}
    </Ctx.Provider>
  );
}

export function useOrderNotifications() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useOrderNotifications must be used within OrderNotificationsProvider');
  return ctx;
}