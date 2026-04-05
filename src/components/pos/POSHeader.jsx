import React from 'react';
import { Button } from '@/components/ui/button';
import { Link, useLocation } from 'react-router-dom';
import { LayoutGrid, Package, Settings, Sun, Moon, BarChart2, UserCircle } from 'lucide-react';
import { useLang } from '@/lib/LanguageContext';
import { LANGUAGES } from '@/lib/i18n';

export default function POSHeader({ darkMode, onToggleDark }) {
  const { lang, setLanguage, t } = useLang();
  const location = useLocation();

  const navBtn = (path) =>
    location.pathname === path
      ? "gap-2 rounded-xl bg-accent text-accent-foreground hover:bg-accent/90"
      : "gap-2 rounded-xl";

  return (
    <header className="flex items-center justify-between px-4 py-3 bg-card border-b border-border">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center">
          <span className="text-primary-foreground font-black text-sm">N</span>
        </div>
        <h1 className="font-bold text-lg hidden sm:block">Ne-Pos</h1>
      </div>

      <nav className="flex items-center gap-1 flex-wrap">
        <Link to="/">
          <Button variant="ghost" size="sm" className={navBtn('/')}>
            <LayoutGrid className="h-4 w-4" />
            <span className="hidden sm:inline">{t('tables')}</span>
          </Button>
        </Link>
        <Link to="/orders">
          <Button variant="ghost" size="sm" className={navBtn('/orders')}>
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">{t('orders')}</span>
          </Button>
        </Link>
        <Link to="/analytics">
          <Button variant="ghost" size="sm" className={navBtn('/analytics')}>
            <BarChart2 className="h-4 w-4" />
            <span className="hidden sm:inline">{t('analytics')}</span>
          </Button>
        </Link>
        <Link to="/admin">
          <Button variant="ghost" size="sm" className={navBtn('/admin')}>
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">{t('admin')}</span>
          </Button>
        </Link>
        <Link to="/account">
          <Button variant="ghost" size="sm" className={navBtn('/account')}>
            <UserCircle className="h-4 w-4" />
            <span className="hidden sm:inline">{t('account')}</span>
          </Button>
        </Link>

        {/* Language Switcher */}
        <div className="flex items-center gap-0.5 bg-secondary rounded-xl p-0.5 ml-1">
          {LANGUAGES.map(l => (
            <button
              key={l.code}
              onClick={() => setLanguage(l.code)}
              className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                lang === l.code
                  ? 'bg-primary text-primary-foreground shadow'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {l.flag} {l.label}
            </button>
          ))}
        </div>

        <Button variant="ghost" size="icon" className="rounded-xl" onClick={onToggleDark}>
          {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </nav>
    </header>
  );
}