/*
 * Branch Service Functions:
 * - getRestaurantBranches
 * - getRestaurantBranchById
 * - createRestaurantBranch
 * - updateRestaurantBranch
 * - deleteRestaurantBranch
 * - getRestaurantBranchAvailability
 * - formatTime
 */

import { db } from "@server/db/db";
import { eq, and, inArray, count, or, like, sql, ne } from "drizzle-orm";
import { restaurantBranches, RestaurantBranch, InsertRestaurantBranch, timeSlots, bookings, bookingSettings, BookingSettings, InsertBookingSettings, restaurantProfiles, RestaurantProfile, restaurantUsers, RestaurantSearchFilter } from "@server/db/schema"; 
import { getBookingSettings, generateTimeSlots, generateTimeSlotsForDays, createBookingSettings } from "./bookingService";
import { formatTime } from "@server/utils/date";
import { getDistance } from "@server/utils/location";

// ==================== Branch Service ====================

//--- Get Restaurant Branches ---

export const getRestaurantBranches = async (restaurantId: number): Promise<RestaurantBranch[]> => {
  const branches = await db.select().from(restaurantBranches).where(eq(restaurantBranches.restaurantId, restaurantId));
  if (!branches) {
    throw new Error(`No branches found for restaurantId ${restaurantId}`);
  }
  return branches;
};

//--Get All Branches--

export const getAllBranches = async (): Promise<any[]> => {
  const branches = await db
    .select({
      // Branch fields
      branchId: restaurantBranches.id,
      address: restaurantBranches.address,
      city: restaurantBranches.city,
      latitude: restaurantBranches.latitude,
      longitude: restaurantBranches.longitude,
      
      // Restaurant user fields
      restaurantId: restaurantUsers.id,
      restaurantName: restaurantUsers.name,
      
      // Restaurant profile fields
      cuisine: restaurantProfiles.cuisine,
      priceRange: restaurantProfiles.priceRange,
      logo: restaurantProfiles.logo
    })
    .from(restaurantBranches)
    .innerJoin(
      restaurantUsers,
      eq(restaurantBranches.restaurantId, restaurantUsers.id)
    )
    .innerJoin(
      restaurantProfiles,
      eq(restaurantUsers.id, restaurantProfiles.restaurantId)
    );
  
  return branches;
};

//--- Get Restaurant Branch by ID ---

export const getRestaurantBranchById = async (branchId: number, restaurantId: number): Promise<RestaurantBranch | undefined> => {
  const [branch] = await db
    .select()
    .from(restaurantBranches)
    .where(
      and(
        eq(restaurantBranches.id, branchId),
        eq(restaurantBranches.restaurantId, restaurantId)
      )
    );
  if (!branch) {
    throw new Error(`Branch with id ${branchId} not found`);
  }
  return branch;
};

//--- Get Branch By Id (Public) ---

export const getBranchById = async (branchId: number): Promise<any | undefined> => {

    const branch = await db
      .select({
        // Branch fields
        branchId: restaurantBranches.id,
        address: restaurantBranches.address,
        city: restaurantBranches.city,
        latitude: restaurantBranches.latitude,
        longitude: restaurantBranches.longitude,
      
        // Restaurant user fields
        restaurantId: restaurantUsers.id,
        restaurantName: restaurantUsers.name,
        
        // Restaurant profile fields
        about: restaurantProfiles.about,
        description: restaurantProfiles.description,
        cuisine: restaurantProfiles.cuisine,
        priceRange: restaurantProfiles.priceRange,
        logo: restaurantProfiles.logo
    })
      .from(restaurantBranches)
      .innerJoin(restaurantUsers, eq(restaurantBranches.restaurantId, restaurantUsers.id))
      .innerJoin(restaurantProfiles, eq(restaurantUsers.id, restaurantProfiles.restaurantId))
      .where(eq(restaurantBranches.id, branchId));
      
    if (!branch) {
      throw new Error(`Branch with id ${branchId} not found`);
    }
    
    return branch;
};

//--- Create Restaurant Branch ---

export const createRestaurantBranch = async (
  branchData: InsertRestaurantBranch, 
  bookingSettingsData: Omit<InsertBookingSettings, 'branchId'>,
  generateDays: number
): Promise<{ branch: RestaurantBranch, settings: BookingSettings, slotsGenerated: number }> => {
  // Use a transaction to ensure all operations succeed or fail together
  return await db.transaction(async (tx) => {
    try {
      // 1. Create the branch
      const [branch] = await tx
        .insert(restaurantBranches)
        .values(branchData)
        .returning();
        
      if (!branch) {
        throw new Error('Failed to create branch');
      }
      
      // 2. Create booking settings
      const bookingSettingsWithBranchId = {
        ...bookingSettingsData,
        branchId: branch.id
      };
      
      const settings = await createBookingSettings(bookingSettingsWithBranchId, tx);
      
      // 3. Generate time slots for the specified number of days
      const slotsGenerated = await generateTimeSlotsForDays(
        tx,
        branch.id,
        settings,
        generateDays
      );
      
      return { branch, settings, slotsGenerated };
    } catch (error) {
      throw error; // Re-throw to ensure transaction is rolled back
    }
  });
};

//--- Update Restaurant Branch ---

export const updateRestaurantBranch = async (branchId: number, restaurantId: number, branch: InsertRestaurantBranch): Promise<RestaurantBranch> => {
  const [updatedBranch] = await db
    .update(restaurantBranches)
    .set(branch)
    .where(
      and(
        eq(restaurantBranches.id, branchId),
        eq(restaurantBranches.restaurantId, restaurantId)
      )
    )
    .returning();
  if (!updatedBranch) {
    throw new Error(`Branch with id ${branchId} not found`);
  }
  return updatedBranch;
};

//--- Delete Restaurant Branch ---

export const deleteRestaurantBranch = async (branchId: number, restaurantId: number): Promise<void> => {
  const result = await db
    .delete(restaurantBranches)
    .where(
      and(
        eq(restaurantBranches.id, branchId),
        eq(restaurantBranches.restaurantId, restaurantId)
      )
    );
  if (!result) {
    throw new Error(`Branch with id ${branchId} not found`);
  }
};



//--- Get Restaurant Branch Availability ---

/**
 * Helper function to create a date with no time component (set to midnight)
 */
const createDateWithNoTime = (date: Date): Date => {
  const newDate = new Date(date);
  newDate.setHours(0, 0, 0, 0);
  return newDate;
};

export const getRestaurantBranchAvailability = async (branchId: number, date: Date, requestedTime?: string): Promise<any> => {
  try {
    const settings = await getBookingSettings(branchId);
    if (!settings) {
      throw new Error(`No settings found for branchId ${branchId}`);
    }

    // Normalize the date to midnight to ensure proper comparison
    const normalizedDate = createDateWithNoTime(date);
    
    // Get all time slots for this branch on the given date
    const slots = await db
      .select()
      .from(timeSlots)
      .where(
        and(
          eq(timeSlots.branchId, branchId),
          eq(sql`${timeSlots.date}::date`, sql`${normalizedDate}::date`) // Compare date parts only
        )
      );

    // Get all bookings for those time slots
    const slotIds = slots.map(slot => slot.id);
    const branchBookings = await db
      .select()
      .from(bookings)
      .where(
        and(
          inArray(bookings.timeSlotId, slotIds),
          ne(bookings.status, 'cancelled') // Exclude cancelled bookings
        )
      );

    console.log(`🔍 DEBUG: Date=${normalizedDate.toISOString().split('T')[0]}, Time=${requestedTime}, Selected Time=${requestedTime}`);
    console.log(`📊 DEBUG: Found ${branchBookings.length} active bookings for ${slots.length} time slots`);

    // Define the standard reservation duration (in minutes)
    const reservationDuration = settings.interval || 90; // Use the restaurant's interval setting or default to 90 minutes

    // Format the response as an array of available time slots with details
    const availableSlots = slots.map(slot => {
      // Find all bookings that overlap with this time slot's duration
      const overlappingBookings = branchBookings.filter(booking => {
        // Get the booked time slot
        const bookedSlot = slots.find(s => s.id === booking.timeSlotId);
        if (!bookedSlot) return false;
        
        // Calculate the end time of the current slot (slot start time + reservation duration)
        const slotStartTime = new Date(slot.startTime);
        const slotEndTime = new Date(slotStartTime);
        slotEndTime.setMinutes(slotEndTime.getMinutes() + reservationDuration);
        
        // Calculate the end time of the booked slot
        const bookedStartTime = new Date(bookedSlot.startTime);
        const bookedEndTime = new Date(bookedStartTime);
        bookedEndTime.setMinutes(bookedEndTime.getMinutes() + reservationDuration);
        
        // Check if the bookings overlap
        return (bookedStartTime < slotEndTime && bookedEndTime > slotStartTime);
      });
      
      // Calculate availability based on overlapping bookings
      const bookedSeats = overlappingBookings.reduce((sum, b) => sum + b.partySize, 0);
      const bookedTables = new Set(overlappingBookings.map(b => b.timeSlotId)).size; // Count unique tables
      
      const maxSeats = slot.maxSeats ?? settings.maxSeatsPerSlot;
      const maxTables = slot.maxTables ?? settings.maxTablesPerSlot;
      
      const availableSeats = Math.max(0, maxSeats - bookedSeats);
      const availableTables = Math.max(0, maxTables - bookedTables);
      const isAvailable = !slot.isClosed && (availableSeats > 0 && availableTables > 0);

      return {
        id: slot.id,
        time: slot.startTime.toTimeString().slice(0, 5), // Format as HH:MM
        startTime: slot.startTime,
        endTime: slot.endTime,
        availableSeats,
        availableTables,
        isAvailable,
        overlappingBookingsCount: overlappingBookings.length // For debugging
      };
    });

    // Sort by time
    availableSlots.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

    // If requestedTime is provided, find the closest available slot
    if (requestedTime) {
      const requestedTimeDate = new Date(`1970-01-01T${requestedTime}:00`);
      const closestSlot = availableSlots.reduce((prev, curr) => {
        const prevDiff = Math.abs(prev.startTime.getTime() - requestedTimeDate.getTime());
        const currDiff = Math.abs(curr.startTime.getTime() - requestedTimeDate.getTime());
        return prevDiff < currDiff ? prev : curr;
      }, availableSlots[0]);
      return {
        date: normalizedDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
        closestAvailableSlot: closestSlot,
        hasAvailability: availableSlots.some(slot => slot.isAvailable)
      };
    }

    return {
      date: normalizedDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
      availableSlots,
      hasAvailability: availableSlots.some(slot => slot.isAvailable)
    };
  } catch (error) {
    throw error;
  }
};

//--Search Branches with Filters--

export const searchBranches = async (
  filters: RestaurantSearchFilter
) => {
  const conditions = [];

  // Text search handling - search across multiple fields
  if (filters.searchQuery || filters.name) {
    const searchTerm = `%${(filters.searchQuery || filters.name || '').toLowerCase()}%`;
    conditions.push(
      or(
        like(sql`lower(${restaurantUsers.name})`, searchTerm),
        like(sql`lower(${restaurantBranches.address})`, searchTerm),
        like(sql`lower(${restaurantBranches.city})`, searchTerm),
        like(sql`lower(${restaurantProfiles.cuisine})`, searchTerm)
      )
    );
  }

  // Specific filters
  if (filters.city) {
    conditions.push(eq(restaurantBranches.city, filters.city));
  }

  if (filters.cuisine) {
    conditions.push(eq(restaurantProfiles.cuisine, filters.cuisine));
  }

  if (filters.priceRange) {
    conditions.push(eq(restaurantProfiles.priceRange, filters.priceRange));
  }

  // Start building base query with profile + branches + users
  const results = await db
    .select()
    .from(restaurantProfiles)
    .innerJoin(restaurantUsers, eq(restaurantProfiles.restaurantId, restaurantUsers.id))
    .innerJoin(restaurantBranches, eq(restaurantProfiles.restaurantId, restaurantBranches.restaurantId))
    .where(and(...conditions));

  // If date + time + partySize are provided, filter by availability
  let filteredResults = results;

  if (filters.date && filters.time && filters.partySize) {
    const date = new Date(`${filters.date}T00:00:00`);

    const slots = await db
      .select()
      .from(timeSlots)
      .where(
        and(
          eq(timeSlots.date, date),
          eq(timeSlots.startTime, new Date(`${filters.date}T${filters.time}`))
        )
      );

    const availableBranchIds = slots
      .filter(slot => (slot.maxSeats ?? 0) >= (filters.partySize ?? 0))
      .map(slot => slot.branchId);

    filteredResults = filteredResults.filter(r =>
      availableBranchIds.includes(r.restaurant_branches.id)
    );
  }

  // Optional: sort by distance if user location is available
  if (filters.userLatitude && filters.userLongitude) {
    filteredResults.sort((a, b) => {
      const distA = getDistance(
        filters.userLatitude!,
        filters.userLongitude!,
        parseFloat(String(a.restaurant_branches.latitude ?? "0")),
        parseFloat(String(a.restaurant_branches.longitude ?? "0"))
      );

      const distB = getDistance(
        filters.userLatitude!,
        filters.userLongitude!,
        parseFloat(String(b.restaurant_branches.latitude ?? "0")),
        parseFloat(String(b.restaurant_branches.longitude ?? "0"))
      );

      return distA - distB;
    });
  }

  return filteredResults;
};
