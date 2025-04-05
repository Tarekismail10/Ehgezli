/**
 * client.ts - API Client
 * 
 * This file contains all the functions for communicating with the backend server.
 * It handles:
 * - Authentication (login, register, logout)
 * - Fetching data (restaurants, bookings, etc.)
 * - Sending data to the server (creating bookings, etc.)
 * 
 * The file uses axios, a popular HTTP client library, to make API requests.
 */

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

// The base URL for all API requests
// In development, this points to your local server
// In production, this would point to your deployed backend
export const API_BASE_URL = 'http://localhost:4000';

/**
 * Create an axios instance with default configuration
 * 
 * - baseURL: All requests will be prefixed with this URL
 * - withCredentials: Ensures cookies are sent with cross-origin requests
 */
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Include cookies in requests
});

// ===== AUTHENTICATION FUNCTIONS =====

/**
 * Log in a user with email and password
 * 
 * @param {string} email - User's email address
 * @param {string} password - User's password
 * @returns {Promise<any>} - Promise resolving to the user data
 */
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

/**
 * Register a new user
 * 
 * @param {object} userData - User registration data
 * @returns {Promise<any>} - Promise resolving to the new user data
 */
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

/**
 * Log out the current user
 * 
 * @returns {Promise<boolean>} - Promise resolving to true if logout was successful
 */
export const logoutUser = async () => {
  try {
    await api.post('/auth/logout');
    return true;
  } catch (error) {
    console.error('Logout error:', error);
    throw error;
  }
};

/**
 * Get the currently logged in user
 * 
 * @returns {Promise<User | null>} - Promise resolving to the user data or null if not logged in
 */
export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const response = await api.get('/auth/me');
    return response.data;
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
};

// ===== RESTAURANT FUNCTIONS =====

/**
 * Get a list of restaurants
 * 
 * @param {object} params - Optional query parameters for filtering restaurants
 * @returns {Promise<Restaurant[]>} - Promise resolving to an array of restaurants
 */
export const getRestaurants = async (params?: Record<string, any>): Promise<Restaurant[]> => {
  try {
    const response = await api.get('/restaurants', { params });
    return response.data;
  } catch (error) {
    console.error('Get restaurants error:', error);
    return [];
  }
};

/**
 * Get details for a specific restaurant
 * 
 * @param {number} id - Restaurant ID
 * @returns {Promise<Restaurant | null>} - Promise resolving to the restaurant details
 */
export const getRestaurantById = async (id: number): Promise<Restaurant | null> => {
  try {
    const response = await api.get(`/restaurants/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Get restaurant ${id} error:`, error);
    return null;
  }
};

// ===== BOOKING FUNCTIONS =====

/**
 * Get all bookings for the current user
 * 
 * @returns {Promise<Booking[]>} - Promise resolving to an array of bookings
 */
export const getUserBookings = async (): Promise<Booking[]> => {
  try {
    const response = await api.get('/bookings/me');
    return response.data;
  } catch (error) {
    console.error('Get user bookings error:', error);
    return [];
  }
};

/**
 * Create a new booking
 * 
 * @param {object} bookingData - Booking information
 * @returns {Promise<Booking>} - Promise resolving to the created booking
 */
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

// ===== USER PROFILE FUNCTIONS =====

/**
 * Update the user's profile information
 * 
 * @param {object} profileData - User profile data
 * @returns {Promise<User>} - Promise resolving to the updated user data
 */
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

// ===== SAVED RESTAURANTS FUNCTIONS =====

/**
 * Get the user's saved/favorite restaurants
 * 
 * @returns {Promise<Restaurant[]>} - Promise resolving to an array of saved restaurants
 */
export const getSavedRestaurants = async (): Promise<Restaurant[]> => {
  try {
    const response = await api.get('/saved-restaurants');
    return response.data;
  } catch (error) {
    console.error('Get saved restaurants error:', error);
    return [];
  }
};

/**
 * Get the saved status of a restaurant for the current user
 * 
 * @param {number} restaurantId - ID of the restaurant to check
 * @returns {Promise<boolean>} - Promise resolving to true if the restaurant is saved, false otherwise
 */
export const getSavedStatus = async (restaurantId: number): Promise<boolean> => {
  try {
    const response = await api.get(`/saved-restaurants/${restaurantId}/status`);
    return response.data.saved;
  } catch (error) {
    console.error(`Get saved status for restaurant ${restaurantId} error:`, error);
    return false;
  }
};

/**
 * Toggle the saved status of a restaurant for the current user
 * 
 * @param {number} restaurantId - ID of the restaurant to toggle
 * @returns {Promise<boolean>} - Promise resolving to true if the restaurant is now saved, false otherwise
 */
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