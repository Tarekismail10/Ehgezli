// Shared types for Ehgezli mobile app

export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email?: string;
  city?: string;
  gender?: string;
  favoriteCuisines?: string[];
}

export interface RestaurantProfile {
  cuisine: string;
  about: string;
  priceRange: string; // "$", "$$", "$$$", or "$$$$"
  logo?: string;
}

export interface RestaurantBranch {
  id: number;
  city: "Alexandria" | "Cairo";
  location?: string;
  seatsCount: number;
  tablesCount: number;
  openingTime: string; // Format: "HH:MM"
  closingTime: string; // Format: "HH:MM"
}

export interface AvailableSlot {
  time: string; // Format: "HH:MM"
  availableSeats: number;
}

export interface BranchWithAvailability {
  id: number;
  city: "Alexandria" | "Cairo";
  location?: string;
  slots: AvailableSlot[];
}

export interface RestaurantWithAvailability {
  id: number;
  name: string;
  email?: string;
  profile?: RestaurantProfile;
  branches: BranchWithAvailability[];
}

export interface Booking {
  id: number;
  userId: number;
  restaurantId: number;
  branchId: number;
  date: string; // ISO string
  time: string; // Format: "HH:MM"
  partySize: number;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  createdAt: string; // ISO string
  restaurantName?: string;
  branchCity?: string;
}

export interface RestaurantFilters {
  search?: string;
  city?: string;
  cuisine?: string;
  priceRange?: string;
  date?: Date;
  time?: string;
  partySize?: number;
  showSavedOnly?: boolean;
}
