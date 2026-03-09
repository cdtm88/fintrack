import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SettingsProvider } from './context/SettingsContext';
import { UserProvider } from './context/UserContext';
import { db } from './db';
import Layout from './components/Layout';
import Login from './pages/Login';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Accounts from './pages/Accounts';
import Investments from './pages/Investments';
import Categories from './pages/Categories';
import Budgets from './pages/Budgets';
import Settings from './pages/Settings';

function AuthenticatedApp({ user }: { user: { id: string; email?: string | null } }) {
  const [onboarded, setOnboarded] = useState(
    () => !!localStorage.getItem(`fintrack_onboarded_${user.id}`)
  );

  function completeOnboarding() {
    localStorage.setItem(`fintrack_onboarded_${user.id}`, '1');
    setOnboarded(true);
  }

  return (
    <UserProvider user={user}>
      <SettingsProvider userId={user.id}>
        {!onboarded ? (
          <Onboarding onComplete={completeOnboarding} />
        ) : (
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="transactions" element={<Transactions />} />
                <Route path="accounts" element={<Accounts />} />
                <Route path="investments" element={<Investments />} />
                <Route path="categories" element={<Categories />} />
                <Route path="budgets" element={<Budgets />} />
                <Route path="settings" element={<Settings />} />
              </Route>
            </Routes>
          </BrowserRouter>
        )}
      </SettingsProvider>
    </UserProvider>
  );
}

export default function App() {
  const { isLoading, user } = db.useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center space-y-3">
          <div className="text-4xl">💸</div>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) return <Login />;

  return <AuthenticatedApp user={user} />;
}
