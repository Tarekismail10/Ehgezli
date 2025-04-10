import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Define types for our data models
export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  city?: string;
  gender?: string;
  favoriteCuisines?: string[];
}

export interface Restaurant {
  id: number;
  name: string;
  description: string;
  cuisine: string;
  priceRange: string;
  rating: number;
  imageUrl: string;
  branches: Branch[];
}

export interface Branch {
  id: number;
  location: string;
  address: string;
  slots: string[];
  city?: string;
  availableSlots?: Array<{ time: string; seats: number }>;
}

export interface Booking {
  id: number;
  userId: number;
  restaurantId: number;
  restaurantName: string;
  branchId: number;
  date: string; // ISO string
  time: string; // Format: "HH:MM"
  partySize: number;
  confirmed: boolean;
  arrived: boolean;
  arrived_at?: string; // ISO string
  completed: boolean;
  cancelled?: boolean;
  createdAt: string; // ISO string
  branchCity?: string;
  branchAddress?: string;
}

// Define type for saved restaurant item
export interface SavedRestaurantItem {
  id: number;
  branchIndex: number;
  restaurantId: number;
  userId: number;
  createdAt: string;
  restaurant: Restaurant;
}

// Base API URL - replace with your actual API endpoint
const API_BASE_URL = 'http://localhost:4000';

// Create axios instance
export const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add auth token to requests
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth functions
export const loginUser = async (email: string, password: string) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/login`, { email, password });
    console.log('Login response:', response.data);
    
    // Save the auth token
    if (response.data.token) {
      await SecureStore.setItemAsync('authToken', response.data.token);
    }
    
    return response.data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

export const registerUser = async (userData: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/register`, userData);
    console.log('Registration response:', response.data);
    
    // Save the auth token
    if (response.data.token) {
      await SecureStore.setItemAsync('authToken', response.data.token);
    }
    
    return response.data;
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
};

export const logoutUser = async () => {
  try {
    const token = await getAuthToken();
    if (token) {
      // Call the logout endpoint if your API has one
      await axios.post(`${API_BASE_URL}/api/logout`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    }
    
    // Remove the token from storage
    await SecureStore.deleteItemAsync('authToken');
    return true;
  } catch (error) {
    console.error('Logout error:', error);
    // Still delete the token even if the API call fails
    await SecureStore.deleteItemAsync('authToken');
    throw error;
  }
};

export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const token = await getAuthToken();
    if (!token) return null;
    
    const response = await axios.get(`${API_BASE_URL}/api/user`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('Current user response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
};

// Restaurant functions
export const getRestaurants = async (params?: Record<string, any>): Promise<Restaurant[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/restaurants`, { params });
    console.log('Restaurants response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Get restaurants error:', error);
    throw error;
  }
};

export const getRestaurantById = async (id: number): Promise<Restaurant | null> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/restaurants/${id}`);
    console.log(`Restaurant ${id} response:`, response.data);
    return response.data;
  } catch (error) {
    console.error(`Get restaurant ${id} error:`, error);
    throw error;
  }
};

// Bookings functions
export const getUserBookings = async (): Promise<Booking[]> => {
  try {
    const response = await api.get('/api/bookings');
    return response.data;
  } catch (error) {
    console.error('Error fetching user bookings:', error);
    throw error;
  }
};

export const cancelBooking = async (bookingId: number): Promise<Booking> => {
  try {
    const response = await api.put(`/api/bookings/${bookingId}/cancel`);
    return response.data;
  } catch (error) {
    console.error(`Error cancelling booking ${bookingId}:`, error);
    throw error;
  }
};

export const updateBooking = async (bookingId: number, bookingData: {
  date?: string;
  time?: string;
  partySize?: number;
}): Promise<Booking> => {
  try {
    const response = await api.put(`/api/bookings/${bookingId}`, bookingData);
    return response.data;
  } catch (error) {
    console.error(`Error updating booking ${bookingId}:`, error);
    throw error;
  }
};

export const createBooking = async (bookingData: {
  restaurantId: number;
  branchId: number;
  date: string;
  time: string;
  partySize: number;
}): Promise<Booking> => {
  try {
    const token = await getAuthToken();
    if (!token) throw new Error('Authentication required');

    const response = await axios.post(`${API_BASE_URL}/bookings`, bookingData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('Create booking response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Create booking error:', error);
    throw error;
  }
};

// User profile functions
export const updateUserProfile = async (profileData: {
  firstName: string;
  lastName: string;
  city: string;
  gender: string;
  favoriteCuisines: string[];
}): Promise<User> => {
  try {
    const token = await getAuthToken();
    if (!token) throw new Error('Authentication required');

    const response = await axios.put(`${API_BASE_URL}/api/user/profile`, profileData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('Update profile response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Update profile error:', error);
    throw error;
  }
};

// Saved restaurant branch functions
export const getSavedRestaurants = async (): Promise<SavedRestaurantItem[]> => {
  try {
    const token = await getAuthToken();
    if (!token) throw new Error('Authentication required');

    const response = await axios.get(`${API_BASE_URL}/api/saved-branches`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('Saved restaurant branches response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Get saved restaurant branches error:', error);
    throw error;
  }
};

export const saveRestaurant = async (restaurantId: number, branchIndex: number): Promise<void> => {
  try {
    const token = await getAuthToken();
    if (!token) throw new Error('Authentication required');

    await axios.post(`${API_BASE_URL}/api/saved-branches`, 
      { restaurantId, branchIndex },
      { headers: { Authorization: `Bearer ${token}` } }
    );
  } catch (error) {
    console.error('Save restaurant branch error:', error);
    throw error;
  }
};

export const unsaveRestaurant = async (restaurantId: number, branchIndex: number): Promise<void> => {
  try {
    const token = await getAuthToken();
    if (!token) throw new Error('Authentication required');

    await axios.delete(`${API_BASE_URL}/api/saved-branches/${restaurantId}/${branchIndex}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch (error) {
    console.error('Unsave restaurant branch error:', error);
    throw error;
  }
};

export const isRestaurantSaved = async (restaurantId: number, branchIndex: number): Promise<boolean> => {
  try {
    const token = await getAuthToken();
    if (!token) throw new Error('Authentication required');

    const response = await axios.get(`${API_BASE_URL}/api/saved-branches/${restaurantId}/${branchIndex}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.saved;
  } catch (error) {
    console.error('Check if restaurant branch is saved error:', error);
    return false;
  }
};

/**
 * Fetches restaurants with availability for a specific date, time, and party size
 * This uses the server's findRestaurantsWithAvailability endpoint which properly populates slot arrays
 */
export const getRestaurantsWithAvailability = async (params?: {
  date?: string;
  time?: string;
  partySize?: number;
  city?: string;
  cuisine?: string;
  priceRange?: string;
  search?: string;
  showSavedOnly?: boolean;
}): Promise<Restaurant[]> => {
  try {
    console.log('Fetching restaurants with availability:', params);
    const response = await api.get('/api/restaurants/availability', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching restaurants with availability:', error);
    throw error;
  }
};

// Helper function to get auth token
export const getAuthToken = async (): Promise<string | null> => {
  return await SecureStore.getItemAsync('authToken');
};