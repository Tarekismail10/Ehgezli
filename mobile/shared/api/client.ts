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
}

export interface Booking {
  id: number;
  restaurantId: number;
  restaurantName: string;
  branchId: number;
  branchLocation: string;
  date: string;
  time: string;
  partySize: number;
  status: 'confirmed' | 'pending' | 'cancelled';
}

// Base API URL - replace with your actual API endpoint
const API_BASE_URL = 'http://localhost:4000';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Add this line to include cookies in requests
});

// Auth functions
export const loginUser = async (email: string, password: string) => {
  try {
    console.log(`[API] Attempting to login with email: ${email} to ${API_BASE_URL}/api/login`);
    const response = await api.post('/api/login', { email, password });
    console.log('[API] Login response received:', response.status, response.statusText);
    console.log('[API] Login response data:', response.data);
    
    // The server uses session cookies for authentication
    // No need to store a token, the cookie is handled automatically
    
    return response.data;
  } catch (error: any) {
    console.error('[API] Login error:', error.message);
    if (error.response) {
      console.error('[API] Error response:', error.response.status, error.response.data);
    } else if (error.request) {
      console.error('[API] No response received from server. Request:', error.request);
    }
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
    const response = await api.post('/auth/register', userData);
    return response.data;
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
};

export const logoutUser = async () => {
  try {
    await api.post('/auth/logout');
    return true;
  } catch (error) {
    console.error('Logout error:', error);
    throw error;
  }
};

export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const response = await api.get('/auth/me');
    return response.data;
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
};

// Restaurant functions
export const getRestaurants = async (params?: Record<string, any>): Promise<Restaurant[]> => {
  try {
    const response = await api.get('/restaurants', { params });
    return response.data;
  } catch (error) {
    console.error('Get restaurants error:', error);
    return [];
  }
};

export const getRestaurantById = async (id: number): Promise<Restaurant | null> => {
  try {
    const response = await api.get(`/restaurants/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Get restaurant ${id} error:`, error);
    return null;
  }
};

// Bookings functions
export const createBooking = async (bookingData: {
  restaurantId: number;
  branchId: number;
  date: string;
  time: string;
  partySize: number;
}): Promise<Booking> => {
  try {
    const response = await api.post('/bookings', bookingData);
    return response.data;
  } catch (error) {
    console.error('Create booking error:', error);
    throw error;
  }
};

export const getUserBookings = async (): Promise<Booking[]> => {
  try {
    const response = await api.get('/bookings/me');
    return response.data;
  } catch (error) {
    console.error('Get user bookings error:', error);
    return [];
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
    const response = await api.put('/users/profile', profileData);
    return response.data;
  } catch (error) {
    console.error('Update profile error:', error);
    throw error;
  }
};

// Saved restaurants functions
export const getSavedRestaurants = async (): Promise<Restaurant[]> => {
  try {
    const response = await api.get('/saved-restaurants');
    return response.data;
  } catch (error) {
    console.error('Get saved restaurants error:', error);
    return [];
  }
};

export const getSavedStatus = async (restaurantId: number): Promise<boolean> => {
  try {
    const response = await api.get(`/saved-restaurants/${restaurantId}/status`);
    return response.data.saved;
  } catch (error) {
    console.error(`Get saved status for restaurant ${restaurantId} error:`, error);
    return false;
  }
};

export const toggleSavedStatus = async (restaurantId: number): Promise<boolean> => {
  try {
    const currentStatus = await getSavedStatus(restaurantId);
    if (currentStatus) {
      await api.delete(`/saved-restaurants/${restaurantId}`);
      return false;
    } else {
      await api.post('/saved-restaurants', { restaurantId });
      return true;
    }
  } catch (error) {
    console.error(`Toggle saved status for restaurant ${restaurantId} error:`, error);
    throw error;
  }
};