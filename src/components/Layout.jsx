import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import POSHeader from './pos/POSHeader';

export default function Layout() {
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
    </div>
  );
}