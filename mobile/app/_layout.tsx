import FontAwesome from '@expo/vector-icons/FontAwesome';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack, useSegments, useRouter, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState, useRef } from 'react';
import { AuthProvider, useAuth } from '../context/auth-context';
import { LocationProvider } from '../context/location-context';
import { ThemeProvider } from '../context/theme-context';
import { Asset } from 'expo-asset';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Create a client
const queryClient = new QueryClient();

// Preload assets function
const preloadAssets = async () => {
  const images = [
    require('../assets/icon.png'),
    require('../assets/adaptive-icon.png'),
    require('../assets/splash-icon.png'),
    require('../assets/favicon.png'),
  ];
  
  // Preload all images
  const imageAssets = images.map(image => Asset.fromModule(image).downloadAsync());
  
  await Promise.all([...imageAssets]);
};

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // State to track if assets are loaded
  const [assetsLoaded, setAssetsLoaded] = useState(false);

  // Load assets
  useEffect(() => {
    async function prepare() {
      try {
        await preloadAssets();
        setAssetsLoaded(true);
      } catch (e) {
        console.warn('Error preloading assets:', e);
        // Continue anyway
        setAssetsLoaded(true);
      }
    }

    prepare();
  }, []);

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded && assetsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded, assetsLoaded]);

  if (!loaded || !assetsLoaded) {
    return null;
  }

  return <RootLayoutNav />;
}

// Auth protection wrapper component
function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isRestaurant } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const pathname = usePathname();
  const [isNavigationReady, setIsNavigationReady] = useState(false);
  const [hasRedirected, setHasRedirected] = useState(false);

  // Wait for navigation to be ready
  useEffect(() => {
    // Mark navigation as ready after initial render
    const timeout = setTimeout(() => {
      setIsNavigationReady(true);
    }, 500); // Increased timeout for navigation readiness
    
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    // Skip redirects when still loading auth state or navigation isn't ready
    if (isLoading || !isNavigationReady || hasRedirected) {
      return;
    }

    // Skip redirects on login page
    if (pathname === '/login') {
      return;
    }
  
    // Define public routes that don't require authentication
    const publicRoutes = ['/login', '/forgot-password', '/reset-password'];
    const isPublicRoute = publicRoutes.includes(pathname);
    
    // Check if this is a restaurant route
    const isRestaurantRoute = pathname.includes('restaurant-tabs') || 
                             pathname.includes('restaurant-dashboard');
    
    // Determine if we need to redirect
    let redirectTo = null;
    
    // Handle authenticated users
    if (user) {
      // Restaurant user trying to access regular user routes
      if (isRestaurant && !isRestaurantRoute && !isPublicRoute) {
        redirectTo = '/restaurant-dashboard';
      }
      // Regular user trying to access restaurant routes
      else if (!isRestaurant && isRestaurantRoute) {
        redirectTo = '/';
      }
    }
    // Handle unauthenticated users
    else if (!isPublicRoute) {
      redirectTo = '/login';
    }
    
    // Perform the redirect if needed
    if (redirectTo && redirectTo !== pathname) {
      console.log(`AuthWrapper redirecting to ${redirectTo}`);
      setHasRedirected(true);
      router.replace(redirectTo as any);
      
      // Reset the redirect flag after a delay
      setTimeout(() => {
        setHasRedirected(false);
      }, 2000);
    }
  }, [user, segments, isLoading, pathname, isNavigationReady, isRestaurant, hasRedirected, router]);

  // Show nothing while loading
  if (isLoading) {
    return null;
  }

  return <>{children}</>;
}

function RootLayoutNav() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <LocationProvider>
            <AuthWrapper>
              <Stack>
                <Stack.Screen name="login" options={{ headerShown: false }} />
                <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
                <Stack.Screen name="reset-password" options={{ headerShown: false }} />
                <Stack.Screen name="index" options={{ headerShown: false }} />
                <Stack.Screen name="(tabs)" options={{ headerShown: false, headerTitle: 'Ehgezli' }} />
                <Stack.Screen name="(restaurant-tabs)" options={{ headerShown: false, headerTitle: 'Restaurant Dashboard' }} />
                <Stack.Screen name="restaurant-dashboard" options={{ headerShown: false }} />
                <Stack.Screen name="restaurant/[id]" options={{ headerShown: false, headerTitle: 'Restaurant Details' }} />
              </Stack>
            </AuthWrapper>
          </LocationProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
