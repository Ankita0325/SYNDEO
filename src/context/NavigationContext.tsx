import React, { createContext, useContext, useEffect, useState } from 'react';

export type RoutePath = '/' | '/auth' | '/chat' | '/memory' | '/share' | '/settings';

interface NavigationContextType {
  currentPath: RoutePath;
  navigate: (path: RoutePath) => void;
  isAuthenticated: boolean;
  setIsAuthenticated: (val: boolean) => void;
  userName: string;
  userEmail: string;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const getInitialPath = (): RoutePath => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname as RoutePath;
      if (['/', '/auth', '/chat', '/memory', '/share', '/settings'].includes(pathname)) {
        return pathname;
      }
      // Check hash fallback if hosted on static preview
      const hash = window.location.hash.replace('#', '') as RoutePath;
      if (['/', '/auth', '/chat', '/memory', '/share', '/settings'].includes(hash)) {
        return hash;
      }
    }
    return '/';
  };

  const [currentPath, setCurrentPath] = useState<RoutePath>(getInitialPath);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [userName] = useState<string>('Indresh');
  const [userEmail] = useState<string>('indresh@example.com');

  useEffect(() => {
    const handlePopState = () => {
      const pathname = window.location.pathname as RoutePath;
      if (['/', '/auth', '/chat', '/memory', '/share', '/settings'].includes(pathname)) {
        setCurrentPath(pathname);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: RoutePath) => {
    setCurrentPath(path);
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', path);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <NavigationContext.Provider
      value={{
        currentPath,
        navigate,
        isAuthenticated,
        setIsAuthenticated,
        userName,
        userEmail,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) throw new Error('useNavigation must be used within NavigationProvider');
  return context;
};
