/**
 * _layout.tsx - Root Layout Component
 * 
 * This is the main layout component for the entire application.
 * It wraps all screens with necessary providers and setup:
 * 
 * 1. QueryClientProvider - For data fetching with React Query
 * 2. AuthProvider - For user authentication state management
 * 3. Stack.Navigator - For navigation between screens
 * 
 * The file uses Expo Router, a file-based routing system where:
 * - Files in the app/ directory automatically become routes
 * - _layout.tsx defines the layout for all child routes
 * - index.tsx becomes the home/default route
 */

import FontAwesome from '@expo/vector-icons/FontAwesome';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack, useSegments, useRouter, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from '../context/auth-context';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Create a client
const queryClient = new QueryClient();

/**
 * Root layout component that sets up the app environment
 */
export default function RootLayout() {
  // Load fonts needed by the app
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Handle font loading
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      // Once fonts are loaded, hide the splash screen
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  // Return the root layout with all necessary providers
  return <RootLayoutNav />;
}

/**
 * Auth protection wrapper component
 * 
 * This component checks if the user is authenticated and redirects to the login screen if not.
 * It also redirects to the home screen if the user is already authenticated and tries to access the login screen.
 */
function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const pathname = usePathname();
  const [isNavigationReady, setIsNavigationReady] = useState(false);

  // Wait for navigation to be ready
  useEffect(() => {
    // Mark navigation as ready after initial render
    const timeout = setTimeout(() => {
      setIsNavigationReady(true);
    }, 100);
    
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    // Skip redirects when still loading auth state or navigation isn't ready
    if (isLoading || !isNavigationReady) return;

    // Define protected routes - all routes except login
    const isProtectedRoute = pathname !== '/login';

    if (!user && isProtectedRoute) {
      // Redirect to login if not authenticated and trying to access a protected route
      router.replace('/login');
    } else if (user && pathname === '/login') {
      // Redirect to home if already authenticated and trying to access login
      router.replace('/');
    }
  }, [user, segments, isLoading, pathname, isNavigationReady]);

  // Show nothing while loading or redirecting
  if (isLoading) {
    return null;
  }

  return <>{children}</>;
}

/**
 * Component that sets up navigation and providers
 */
function RootLayoutNav() {
  return (
    // React Query provider for data fetching
    <QueryClientProvider client={queryClient}>
      {/* Authentication provider for user state */}
      <AuthProvider>
        {/* Auth protection wrapper */}
        <AuthWrapper>
          {/* Main navigation container */}
          <Stack>
            {/* Define the home screen */}
            <Stack.Screen name="index" options={{ headerShown: false }} />
            {/* Define the login screen */}
            <Stack.Screen name="login" options={{ headerShown: false }} />
            {/* Define the restaurant details screen */}
            <Stack.Screen name="restaurant/[id]" options={{ headerTitle: 'Restaurant Details' }} />
          </Stack>
        </AuthWrapper>
      </AuthProvider>
    </QueryClientProvider>
  );
}
