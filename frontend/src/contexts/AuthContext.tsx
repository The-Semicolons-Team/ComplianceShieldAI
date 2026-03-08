'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Mock authentication for development without AWS Cognito
const USE_MOCK_AUTH = process.env.NEXT_PUBLIC_USE_MOCK_AUTH === 'true';

interface User {
  userId: string;
  email: string;
  name?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (userData: User) => void;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock user for development
const MOCK_USER: User = {
  userId: 'mock-user-123',
  email: 'demo@complianceshield.com',
  name: 'Demo User',
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    try {
      if (USE_MOCK_AUTH) {
        // Check for Google OAuth user first
        const googleUser = localStorage.getItem('user');
        if (googleUser) {
          const parsedUser = JSON.parse(googleUser);
          setUser({
            userId: parsedUser.userId,
            email: parsedUser.email,
            name: parsedUser.name,
          });
          return;
        }
        
        // Check if user is logged in with mock auth
        const storedUser = localStorage.getItem('mockUser');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } else {
        // Real AWS Cognito authentication
        try {
          const { Amplify } = await import('aws-amplify');
          const { getCurrentUser } = await import('aws-amplify/auth');
          
          // Configure Amplify
          Amplify.configure({
            Auth: {
              Cognito: {
                userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || '',
                userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '',
              }
            }
          });

          const currentUser = await getCurrentUser();
          setUser({
            userId: currentUser.userId,
            email: currentUser.signInDetails?.loginId || '',
          });
        } catch (error) {
          console.log('Not authenticated with Cognito');
          setUser(null);
        }
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  function loginWithGoogle(userData: User) {
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  }

  async function login(email: string, password: string) {
    try {
      if (USE_MOCK_AUTH) {
        // Mock login - accept any credentials
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
        
        const mockUser = {
          ...MOCK_USER,
          email: email,
        };
        
        localStorage.setItem('mockUser', JSON.stringify(mockUser));
        setUser(mockUser);
      } else {
        // Real AWS Cognito login
        const { signIn } = await import('aws-amplify/auth');
        await signIn({
          username: email,
          password,
        });
        await checkUser();
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async function logout() {
    try {
      if (USE_MOCK_AUTH) {
        // Clear both mock and Google OAuth data
        localStorage.removeItem('mockUser');
        localStorage.removeItem('user');
        localStorage.removeItem('gmail_access');
        localStorage.removeItem('gmail_tokens');
        localStorage.removeItem('oauth_processing');
        localStorage.removeItem('google_oauth_state');
        localStorage.removeItem('google_oauth_timestamp');
        setUser(null);
      } else {
        const { signOut } = await import('aws-amplify/auth');
        await signOut();
        // Clear Google OAuth data as well
        localStorage.removeItem('user');
        localStorage.removeItem('gmail_access');
        localStorage.removeItem('gmail_tokens');
        localStorage.removeItem('oauth_processing');
        localStorage.removeItem('google_oauth_state');
        localStorage.removeItem('google_oauth_timestamp');
        setUser(null);
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Even if logout fails, clear local state
      localStorage.clear();
      setUser(null);
      throw error;
    }
  }

  async function getAccessToken(): Promise<string | null> {
    try {
      if (USE_MOCK_AUTH) {
        return 'mock-access-token-123';
      } else {
        const { fetchAuthSession } = await import('aws-amplify/auth');
        const session = await fetchAuthSession();
        return session.tokens?.accessToken?.toString() || null;
      }
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithGoogle, logout, getAccessToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
