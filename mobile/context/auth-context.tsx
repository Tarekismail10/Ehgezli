/**
 * auth-context.tsx - Authentication Context Provider
 * 
 * This file creates and exports a React Context for handling user authentication.
 * It provides the following functionality throughout the app:
 * 
 * 1. User state management (logged in user data)
 * 2. Login functionality
 * 3. Registration functionality
 * 4. Logout functionality
 * 5. Loading states for async operations
 * 6. Error handling
 * 
 * The AuthProvider component should wrap your application to make
 * authentication available everywhere.
 */

import React, { createContext, useState, useContext, useEffect } from 'react';
import { getCurrentUser, loginUser, logoutUser, registerUser, User } from '../shared/api/client';
import * as SecureStore from 'expo-secure-store';

/**
 * Interface defining what data and functions the auth context provides
 */
interface AuthContextType {
  user: User | null;         // Current logged-in user or null if not logged in
  isLoading: boolean;       // Whether an auth operation is in progress
  error: string | null;     // Error message if an auth operation failed
  login: (email: string, password: string) => Promise<void>;  // Function to log in
  register: (userData: { firstName: string; lastName: string; email: string; password: string }) => Promise<void>; // Function to register
  logout: () => Promise<void>; // Function to log out
  clearError: () => void;   // Function to clear any auth errors
}

// Create the context with undefined as initial value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * AuthProvider component that wraps your app and provides auth functionality
 * 
 * @param {object} props - Component props
 * @param {React.ReactNode} props.children - Child components that will have access to auth context
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  // State for the current user (null means not logged in)
  const [user, setUser] = useState<User | null>(null);
  // State for tracking loading operations
  const [isLoading, setIsLoading] = useState(true);
  // State for tracking auth errors
  const [error, setError] = useState<string | null>(null);

  // Check for existing session on app load
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        // Try to get the current user from the server
        const userData = await getCurrentUser();
        setUser(userData);
      } catch (err) {
        // User is not logged in, which is fine
        console.log('No active session found');
      } finally {
        // Always set loading to false when done
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  /**
   * Log in a user with email and password
   * 
   * @param {string} email - User's email
   * @param {string} password - User's password
   * @returns {Promise<void>} - Promise that resolves when login is complete
   */
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await loginUser(email, password);
      // The server uses session cookies instead of tokens
      // So we just need to set the user data
      setUser(response);
    } catch (err) {
      setError('Invalid email or password');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Register a new user
   * 
   * @param {object} userData - New user's data
   * @returns {Promise<void>} - Promise that resolves when registration is complete
   */
  const register = async (userData: { firstName: string; lastName: string; email: string; password: string }) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await registerUser(userData);
      setUser(response);
    } catch (err) {
      setError('Registration failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Log out the current user
   * 
   * @returns {Promise<void>} - Promise that resolves when logout is complete
   */
  const logout = async () => {
    setIsLoading(true);
    try {
      await logoutUser();
      setUser(null);
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Clear any authentication errors
   */
  const clearError = () => setError(null);

  // Create the value object that will be provided to consumers
  const value = {
    user,
    isLoading,
    error,
    login,
    register,
    logout,
    clearError,
  };

  // Provide the auth context to all children components
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Custom hook to use the auth context
 * 
 * @returns {AuthContextType} - The auth context value
 * @throws {Error} - If used outside of an AuthProvider
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
