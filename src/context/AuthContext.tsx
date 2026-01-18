import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../services/api';

export type UserRole = 'admin' | 'employee';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department: string;
  designation: string;
  avatar?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Fallback mock users for when server is not available
const MOCK_USERS: (AuthUser & { password: string })[] = [
  {
    id: 'admin-1',
    email: 'admin@wowevents.com',
    password: 'admin123',
    name: 'Sachin Talwar',
    role: 'admin',
    department: 'Management',
    designation: 'CEO',
  },
  {
    id: 'user-1',
    email: 'amit@wowevents.com',
    password: 'user123',
    name: 'Amit Talwar',
    role: 'employee',
    department: 'Tech',
    designation: 'Tech Lead',
  },
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored session on mount
    const token = localStorage.getItem('token');
    if (token) {
      api.setToken(token);
      loadUser();
    } else {
      // Check for old auth_user storage (fallback)
      const storedUser = localStorage.getItem('auth_user');
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch {
          localStorage.removeItem('auth_user');
        }
      }
      setIsLoading(false);
    }
  }, []);

  const loadUser = async () => {
    try {
      const { data } = await api.getMe();
      if (data?.user) {
        const userData: AuthUser = {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
          role: data.user.role === 'admin' ? 'admin' : 'employee',
          department: data.user.department,
          designation: data.user.designation || '',
          avatar: data.user.avatar,
        };
        setUser(userData);
        localStorage.setItem('auth_user', JSON.stringify(userData));
      } else {
        // Token invalid, clear it
        api.setToken(null);
        localStorage.removeItem('auth_user');
      }
    } catch (error) {
      console.error('Failed to load user:', error);
      api.setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Try API login first
      const { data, error } = await api.login(email, password);

      if (data?.token && data?.user) {
        api.setToken(data.token);
        const userData: AuthUser = {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
          role: data.user.role === 'admin' ? 'admin' : 'employee',
          department: data.user.department,
          designation: data.user.designation || '',
          avatar: data.user.avatar,
        };
        setUser(userData);
        localStorage.setItem('auth_user', JSON.stringify(userData));
        return { success: true };
      }

      if (error) {
        // If server is down, fall back to mock users
        if (error.includes('Network error')) {
          return fallbackLogin(email, password);
        }
        return { success: false, error };
      }

      return { success: false, error: 'Invalid response from server' };
    } catch (error) {
      console.error('Login error:', error);
      // Fall back to mock users if server is not available
      return fallbackLogin(email, password);
    }
  };

  const fallbackLogin = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 300));

    const foundUser = MOCK_USERS.find(
      u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );

    if (foundUser) {
      const { password: _, ...userWithoutPassword } = foundUser;
      setUser(userWithoutPassword);
      localStorage.setItem('auth_user', JSON.stringify(userWithoutPassword));
      return { success: true };
    }

    return { success: false, error: 'Invalid email or password' };
  };

  const logout = () => {
    api.setToken(null);
    setUser(null);
    localStorage.removeItem('auth_user');
    localStorage.removeItem('token');
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    isAdmin: user?.role === 'admin',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export { MOCK_USERS };
