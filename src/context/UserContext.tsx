import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';

interface User {
  id: string;
  email?: string | null;
}

interface UserContextValue {
  user: User;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ user, children }: { user: User; children: ReactNode }) {
  return <UserContext.Provider value={{ user }}>{children}</UserContext.Provider>;
}

export function useUser(): User {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within UserProvider');
  return ctx.user;
}
