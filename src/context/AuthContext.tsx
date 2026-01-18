import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type UserRole = 'admin' | 'user';

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

// Mock user database
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
    id: 'admin-2',
    email: 'hr@wowevents.com',
    password: 'hr123',
    name: 'Priya Sharma',
    role: 'admin',
    department: 'HR',
    designation: 'HR Manager',
  },
  {
    id: 'user-1',
    email: 'amit@wowevents.com',
    password: 'user123',
    name: 'Amit Talwar',
    role: 'user',
    department: 'Tech',
    designation: 'Tech Lead',
  },
  {
    id: 'user-2',
    email: 'neeti@wowevents.com',
    password: 'user123',
    name: 'Neeti Choudhary',
    role: 'user',
    department: 'Concept & Copy',
    designation: 'Content Writer',
  },
  {
    id: 'user-3',
    email: 'animesh@wowevents.com',
    password: 'user123',
    name: 'Animesh',
    role: 'user',
    department: '2D',
    designation: 'Graphic Designer',
  },
  {
    id: 'user-4',
    email: 'rahul@wowevents.com',
    password: 'user123',
    name: 'Rahul Kumar',
    role: 'user',
    department: '3D',
    designation: '3D Artist',
  },
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored session on mount
    const storedUser = localStorage.getItem('auth_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('auth_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));

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
    setUser(null);
    localStorage.removeItem('auth_user');
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
