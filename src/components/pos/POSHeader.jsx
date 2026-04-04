import React from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { LayoutGrid, Package, Settings, Sun, Moon, BarChart2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function POSHeader({ darkMode, onToggleDark }) {
  return (
    <header className="flex items-center justify-between px-4 py-3 bg-card border-b border-border">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center">
          <span className="text-primary-foreground font-black text-sm">R</span>
        </div>
        <h1 className="font-bold text-lg hidden sm:block">RestoPOS</h1>
      </div>

      <nav className="flex items-center gap-2">
        <Link to="/">
          <Button variant="ghost" size="sm" className="gap-2 rounded-xl">
            <LayoutGrid className="h-4 w-4" />
            <span className="hidden sm:inline">Masalar</span>
          </Button>
        </Link>
        <Link to="/orders">
          <Button variant="ghost" size="sm" className="gap-2 rounded-xl">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Siparişler</span>
          </Button>
        </Link>
        <Link to="/analytics">
          <Button variant="ghost" size="sm" className="gap-2 rounded-xl">
            <BarChart2 className="h-4 w-4" />
            <span className="hidden sm:inline">Analiz</span>
          </Button>
        </Link>
        <Link to="/admin">
          <Button variant="ghost" size="sm" className="gap-2 rounded-xl">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Yönetim</span>
          </Button>
        </Link>
        <Button variant="ghost" size="icon" className="rounded-xl" onClick={onToggleDark}>
          {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </nav>
    </header>
  );
}