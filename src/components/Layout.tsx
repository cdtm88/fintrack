import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, ArrowLeftRight, Wallet, Tag, PiggyBank, Settings, Menu, X, LogOut, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { db } from '../db';
import { useUser } from '../context/UserContext';
import FintrackLogo from './FintrackLogo';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Transactions' },
  { to: '/accounts', icon: Wallet, label: 'Accounts' },
  { to: '/investments', icon: TrendingUp, label: 'Investments' },
  { to: '/categories', icon: Tag, label: 'Categories' },
  { to: '/budgets', icon: PiggyBank, label: 'Budgets' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const user = useUser();

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex flex-col w-56 bg-white border-r border-slate-200 shrink-0 dark:bg-slate-900 dark:border-slate-800">
        <div className="px-5 py-5 border-b border-slate-200 dark:border-slate-800">
          <FintrackLogo size={26} />
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800'
                }`
              }
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
          <p className="text-xs text-muted truncate">{user.email ?? ''}</p>
          <div className="flex items-center justify-between">
            <p className="text-slate-400 text-xs">v1.3.0</p>
            <button
              onClick={() => db.auth.signOut()}
              className="flex items-center gap-1.5 text-xs text-muted hover:text-red-500 transition-colors"
              title="Sign out"
            >
              <LogOut size={12} /> Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-56 h-full bg-white border-r border-slate-200 flex flex-col dark:bg-slate-900 dark:border-slate-800">
            <div className="px-5 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <FintrackLogo size={24} />
              <button onClick={() => setMobileOpen(false)} className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
                <X size={18} />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-0.5">
              {navItems.map(({ to, icon: Icon, label, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800'
                    }`
                  }
                >
                  <Icon size={17} />
                  {label}
                </NavLink>
              ))}
            </nav>
            <div className="px-4 py-4 border-t border-slate-200 dark:border-slate-800">
              <p className="text-xs text-muted truncate mb-2">{user.email ?? ''}</p>
              <button
                onClick={() => db.auth.signOut()}
                className="flex items-center gap-2 text-sm text-muted hover:text-red-500 transition-colors w-full"
              >
                <LogOut size={15} /> Sign out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile topbar */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200 shrink-0 dark:bg-slate-900 dark:border-slate-800">
          <button onClick={() => setMobileOpen(true)} className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
            <Menu size={20} />
          </button>
          <FintrackLogo size={22} />
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
