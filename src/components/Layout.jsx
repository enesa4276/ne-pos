import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import POSHeader from './pos/POSHeader';
import { useLang } from '@/lib/LanguageContext';

export default function Layout() {
  const { t } = useLang();
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('pos-dark-mode');
    return saved ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('pos-dark-mode', JSON.stringify(darkMode));
  }, [darkMode]);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <POSHeader darkMode={darkMode} onToggleDark={() => setDarkMode(!darkMode)} />
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
      <footer className="text-center py-1.5 text-xs text-muted-foreground border-t border-border bg-card/50">
        Ne-Pa Yazılım ve Grafik Tarafından Geliştirilmiştir
      </footer>
    </div>
  );
}