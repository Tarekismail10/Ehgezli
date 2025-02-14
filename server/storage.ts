import { 
  InsertUser, User, Restaurant, Booking, RestaurantBranch,
  mockRestaurants, RestaurantAuth, InsertRestaurantAuth,
  restaurantProfiles, restaurantBranches, type InsertRestaurantProfile, RestaurantProfile
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getRestaurants(): Promise<Restaurant[]>;
  getRestaurant(id: number): Promise<Restaurant | undefined>;
  getRestaurantBranches(restaurantId: number): Promise<RestaurantBranch[]>;
  createBooking(booking: Omit<Booking, "id" | "confirmed">): Promise<Booking>;
  getUserBookings(userId: number): Promise<Booking[]>;
  getRestaurantBookings(restaurantId: number): Promise<Booking[]>;
  getRestaurantAuth(id: number): Promise<RestaurantAuth | undefined>;
  getRestaurantAuthByEmail(email: string): Promise<RestaurantAuth | undefined>;
  createRestaurantAuth(auth: InsertRestaurantAuth): Promise<RestaurantAuth>;
  createRestaurantProfile(profile: InsertRestaurantProfile): Promise<void>;
  getRestaurantProfile(restaurantId: number): Promise<RestaurantProfile | undefined>;
  sessionStore: session.Store;
  searchRestaurants(query: string, city?: string): Promise<Restaurant[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private bookings: Map<number, Booking>;
  private branches: Map<number, RestaurantBranch>;
  private restaurantAuth: Map<number, RestaurantAuth>;
  private restaurantProfiles: Map<number, RestaurantProfile>;
  private currentUserId: number;
  private currentBookingId: number;
  private currentBranchId: number;
  private currentRestaurantAuthId: number;
  readonly sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.bookings = new Map();
    this.branches = new Map();
    this.restaurantAuth = new Map();
    this.restaurantProfiles = new Map();
    this.currentUserId = 1;
    this.currentBookingId = 1;
    this.currentBranchId = 1;
    this.currentRestaurantAuthId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getRestaurants(): Promise<Restaurant[]> {
    const registeredRestaurants = Array.from(this.restaurantAuth.values())
      .map(auth => {
        const profile = Array.from(this.restaurantProfiles.values())
          .find(p => p.restaurantId === auth.id);

        if (!profile) return null;

        const restaurantBranches = Array.from(this.branches.values())
          .filter(b => b.restaurantId === auth.id);

        // Only return if restaurant has a complete profile and at least one branch
        if (!restaurantBranches.length) return null;

        return {
          id: auth.id,
          authId: auth.id,
          name: auth.name,
          description: profile.about.slice(0, 100) + (profile.about.length > 100 ? '...' : ''),
          about: profile.about,
          logo: profile.logo || "",
          cuisine: profile.cuisine,
          locations: restaurantBranches.map(branch => ({
            address: branch.address,
            tablesCount: branch.tablesCount,
            openingTime: branch.openingTime,
            closingTime: branch.closingTime,
            city: branch.address.split(',').pop()?.trim() as "Alexandria" | "Cairo" 
          }))
        };
      })
      .filter(Boolean) as Restaurant[];

    return registeredRestaurants;
  }

  async getRestaurant(id: number): Promise<Restaurant | undefined> {
    const auth = await this.getRestaurantAuth(id);
    if (!auth) return undefined;

    const profile = Array.from(this.restaurantProfiles.values())
      .find(p => p.restaurantId === id);
    if (!profile) return undefined;

    const restaurantBranches = Array.from(this.branches.values())
      .filter(b => b.restaurantId === id);
    if (!restaurantBranches.length) return undefined;

    return {
      id: auth.id,
      authId: auth.id,
      name: auth.name,
      description: profile.about.slice(0, 100) + (profile.about.length > 100 ? '...' : ''),
      about: profile.about,
      logo: profile.logo || "",
      cuisine: profile.cuisine,
      locations: restaurantBranches.map(branch => ({
        address: branch.address,
        tablesCount: branch.tablesCount,
        openingTime: branch.openingTime,
        closingTime: branch.closingTime,
        city: branch.address.split(',').pop()?.trim() as "Alexandria" | "Cairo" 
      }))
    };
  }

  async getRestaurantBranches(restaurantId: number): Promise<RestaurantBranch[]> {
    return Array.from(this.branches.values()).filter(
      branch => branch.restaurantId === restaurantId
    );
  }

  async createBooking(booking: Omit<Booking, "id" | "confirmed">): Promise<Booking> {
    const id = this.currentBookingId++;
    const newBooking = { ...booking, id, confirmed: false };
    this.bookings.set(id, newBooking);
    return newBooking;
  }

  async getUserBookings(userId: number): Promise<Booking[]> {
    return Array.from(this.bookings.values()).filter(
      (booking) => booking.userId === userId
    );
  }

  async getRestaurantBookings(restaurantId: number): Promise<Booking[]> {
    // Get all branches for this restaurant
    const restaurantBranches = Array.from(this.branches.values())
      .filter(branch => branch.restaurantId === restaurantId)
      .map(branch => branch.id);

    // Get all bookings for these branches
    return Array.from(this.bookings.values())
      .filter(booking => restaurantBranches.includes(booking.branchId));
  }

  async getRestaurantAuth(id: number): Promise<RestaurantAuth | undefined> {
    return this.restaurantAuth.get(id);
  }

  async getRestaurantAuthByEmail(email: string): Promise<RestaurantAuth | undefined> {
    return Array.from(this.restaurantAuth.values()).find(
      (auth) => auth.email === email
    );
  }

  async createRestaurantAuth(auth: InsertRestaurantAuth): Promise<RestaurantAuth> {
    const id = this.currentRestaurantAuthId++;
    const restaurantAuth = {
      ...auth,
      id,
      verified: false,
      createdAt: new Date()
    };
    this.restaurantAuth.set(id, restaurantAuth);
    return restaurantAuth;
  }

  async getRestaurantProfile(restaurantId: number): Promise<RestaurantProfile | undefined> {
    return this.restaurantProfiles.get(restaurantId);
  }

  async createRestaurantProfile(profile: InsertRestaurantProfile): Promise<void> {
    const { branches, ...profileData } = profile;

    // Store the profile
    this.restaurantProfiles.set(profileData.restaurantId, {
      ...profileData,
      id: profileData.restaurantId,
      isProfileComplete: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Create branches for each city/location
    branches.forEach((branch) => {
      const branchId = this.currentBranchId++;
      const branchData: RestaurantBranch = {
        id: branchId,
        restaurantId: profileData.restaurantId,
        address: `${branch.address}, ${branch.city}`, 
        tablesCount: branch.tablesCount,
        seatsCount: branch.seatsCount,
        openingTime: branch.openingTime,
        closingTime: branch.closingTime,
      };
      this.branches.set(branchId, branchData);
    });
  }

  async searchRestaurants(query: string, city?: string): Promise<Restaurant[]> {
    const normalizedQuery = query.toLowerCase().trim();
    const restaurants = await this.getRestaurants();

    return restaurants.filter(restaurant => {
      // If city filter is active, check city first
      if (city) {
        // Get all branch cities for this restaurant
        const branchCities = restaurant.locations?.map(loc => loc.city) || [];

        // If restaurant has no branches in this city, filter it out
        if (!branchCities.includes(city)) {
          return false;
        }
      }

      // If no search query, include restaurant (it passed city filter)
      if (!normalizedQuery) {
        return true;
      }

      // Apply text search filters
      const matchesName = restaurant.name.toLowerCase().includes(normalizedQuery);
      const matchesCuisine = restaurant.cuisine.toLowerCase().includes(normalizedQuery);
      const matchesLocation = restaurant.locations?.some(location => {
        // Only search in the address part, not the city
        const addressPart = location.address.split(',')[0].trim().toLowerCase();
        return addressPart.includes(normalizedQuery);
      });

      return matchesName || matchesCuisine || matchesLocation;
    });
  }
}

export const storage = new MemStorage();