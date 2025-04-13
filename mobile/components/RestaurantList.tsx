import React from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { RestaurantCard } from './RestaurantCard';
import { RestaurantWithAvailability, BranchWithAvailability, TimeSlot, AvailableSlot } from './RestaurantCard';
import { getRestaurants, getSavedRestaurants, SavedRestaurantItem, getRestaurantsWithAvailability, Restaurant } from '../shared/api/client';
import { generateLocalTimeSlots, formatTimeWithAMPM, getBaseTime, generateTimeSlotsFromTime } from '../shared/utils/time-slots';
import { Ionicons } from '@expo/vector-icons';
import { useLocation } from '../context/location-context';

// Function to calculate distance between two coordinates using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in km
  return parseFloat(distance.toFixed(2));
}

// Helper function to convert degrees to radians
function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

interface RestaurantListProps {
  searchQuery?: string;
  cityFilter?: string;
  cuisineFilter?: string;
  priceFilter?: string;
  distanceFilter?: string;
  date: Date;
  time?: string;
  partySize: number;
  showSavedOnly?: boolean;
  nearbyRestaurants?: Restaurant[];
}

export function RestaurantList({
  searchQuery,
  cityFilter,
  cuisineFilter,
  priceFilter,
  distanceFilter = 'all',
  date,
  time,
  partySize,
  showSavedOnly = false,
  nearbyRestaurants = [],
}: RestaurantListProps) {
  console.log('[RestaurantList] rendering with filters:', { searchQuery, cityFilter, cuisineFilter, priceFilter, date, partySize, time, showSavedOnly });

  // Get location from context
  const { location } = useLocation();

  // Generate time slots based on the selected time or default time
  const generateTimeSlots = () => {
    if (time) {
      // Parse the time string (e.g., "2:30 PM") into a Date object
      try {
        const [timePart, ampm] = time.split(' ');
        const [hours, minutes] = timePart.split(':').map(Number);

        let hour24 = hours;
        if (ampm === 'PM' && hours < 12) hour24 += 12;
        if (ampm === 'AM' && hours === 12) hour24 = 0;

        // Create a date object with the selected date and time
        const timeDate = new Date(date);
        timeDate.setHours(hour24, minutes, 0, 0);

        // Ensure the combined date-time is not in the past
        const now = new Date();
        if (timeDate.getTime() < now.getTime()) {
          console.log('Selected date-time is in the past, using default time slots');
          return generateLocalTimeSlots();
        }

        console.log('Generating time slots from user-selected time:', timeDate.toISOString());
        return generateTimeSlotsFromTime(timeDate);
      } catch (error) {
        console.error('Error parsing time:', error);
        // Fall back to default time slots
        return generateLocalTimeSlots();
      }
    } else {
      // Use default time slots
      console.log('Using default time slot generation');
      return generateLocalTimeSlots();
    }
  };

  // Query for all restaurants with availability
  const { data: restaurants, isLoading } = useQuery<RestaurantWithAvailability[]>({
    queryKey: ['restaurants', searchQuery, cityFilter, cuisineFilter, priceFilter, date, time, partySize, showSavedOnly],
    queryFn: async () => {
      console.log('[RestaurantList] Fetching with search query:', searchQuery);
      console.log('[RestaurantList] Show saved only:', showSavedOnly);

      // If showSavedOnly is true, return saved restaurants only
      if (showSavedOnly) {
        const savedData = await getSavedRestaurants();
        console.log('Raw saved restaurants data:', savedData);

        if (!savedData || savedData.length === 0) {
          console.log('No saved restaurants found');
          return [];
        }

        // Transform the saved restaurants data to match the expected format
        const transformedData = savedData.map((item: SavedRestaurantItem) => {
          console.log(`Processing saved restaurant: ${item.restaurant?.name || 'unnamed'}, ID: ${item.restaurantId}`);

          // Extract the restaurant object from the saved item
          const restaurant = item.restaurant as unknown as RestaurantWithAvailability;

          // Copy profile properties to the top level
          if (restaurant.profile) {
            console.log(`Restaurant profile: ${JSON.stringify(restaurant.profile)}`);
            restaurant.cuisine = restaurant.profile.cuisine;
            restaurant.priceRange = restaurant.profile.priceRange;
            restaurant.description = restaurant.profile.description;
            restaurant.imageUrl = restaurant.profile.logo;
            restaurant.rating = restaurant.profile.rating;
          } else {
            console.log(`No profile found for restaurant ${restaurant.name}`);
          }

          // Filter to only include the specific saved branch
          const branchIndex = item.branchIndex;
          console.log(`Filtering to only show branch index ${branchIndex} for restaurant ${restaurant.name}`);

          if (restaurant.branches && restaurant.branches.length > 0) {
            // If the branch index is valid, keep only that branch
            if (branchIndex >= 0 && branchIndex < restaurant.branches.length) {
              const savedBranch = restaurant.branches[branchIndex];
              restaurant.branches = [savedBranch]; // Replace with array containing only the saved branch
              console.log(`Kept only branch ${branchIndex} for restaurant ${restaurant.name}`);
            } else {
              console.log(`Invalid branch index ${branchIndex} for restaurant ${restaurant.name} with ${restaurant.branches.length} branches`);
            }
          } else {
            console.log(`No branches found for restaurant ${restaurant.name}, creating empty array`);
            restaurant.branches = [];
          }

          // Generate time slots for each branch
          restaurant.branches.forEach((branch, index) => {
            // Generate time slots using our utility function (returns 24h format)
            const timeSlots = generateTimeSlots();

            // Store the time slots in 24h format (don't format them yet)
            branch.slots = timeSlots;

            console.log(`Generated time slots for saved restaurant ${restaurant.name}, branch ${index}:`, branch.slots);
          });

          // Mark this restaurant as saved
          restaurant.isSaved = true;

          // Make sure we're using the restaurant ID, not the saved record ID
          restaurant.id = restaurant.id || item.restaurantId;

          console.log(`Transformed restaurant: ${restaurant.name}, branches: ${restaurant.branches.length}`);
          return restaurant;
        });

        console.log(`Total transformed restaurants: ${transformedData.length}`);
        console.log('Transformed saved restaurants:', transformedData);
        return transformedData;
      }

      const convertTimeFormat = (timeStr: string | undefined): string | undefined => {
        if (!timeStr) return undefined;

        try {
          const [timePart, period] = timeStr.split(' ');
          const [hours, minutes] = timePart.split(':').map(Number);

          let hour24 = hours;
          if (period === 'PM' && hours < 12) hour24 += 12;
          if (period === 'AM' && hours === 12) hour24 = 0;

          return `${hour24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        } catch (error) {
          console.error('Error converting time format:', error);
          return undefined;
        }
      };

      const params: Record<string, any> = {
        date: date.toISOString(),
        partySize,
        showSavedOnly,
        time: convertTimeFormat(time),
      };

      if (searchQuery) params['search'] = searchQuery;
      if (cityFilter && cityFilter !== 'all') params['city'] = cityFilter;
      if (cuisineFilter && cuisineFilter !== 'all') params['cuisine'] = cuisineFilter;
      if (priceFilter && priceFilter !== 'all') params['priceRange'] = priceFilter;

      console.log('[RestaurantList] Fetching with params:', params);

      // Use the new API endpoint that properly populates slot arrays
      const restaurantsData = await getRestaurantsWithAvailability(params);
      console.log('[RestaurantList] Received restaurants with availability:',
        restaurantsData.map(r => ({
          id: r.id,
          name: r.name,
          branchCount: r.branches?.length || 0,
          hasBranchesWithSlots: r.branches?.some(b => b.slots && b.slots.length > 0)
        }))
      );

      // Ensure proper type conversion and data structure
      return restaurantsData.map(restaurant => {
        // Convert to expected type
        const result = restaurant as unknown as RestaurantWithAvailability;

        // Ensure restaurant has branches array (even if empty)
        if (!result.branches) {
          result.branches = [];
        }

        // Map availableSlots to slots for each branch
        result.branches.forEach(branch => {
          // If branch has availableSlots but no slots, generate them
          if (branch.availableSlots && branch.availableSlots.length > 0 && (!branch.slots || branch.slots.length === 0)) {
            console.log(`Mapping availableSlots to slots for restaurant ${result.id}, branch ${branch.id}`);

            // Generate time slots using our utility function
            const timeSlots = generateTimeSlots();

            // Store the time slots in 24h format (don't format them yet)
            branch.slots = timeSlots;

            console.log('Final branch slots:', branch.slots);
          }

          // Ensure each branch has slots array (even if empty)
          if (!branch.slots) {
            branch.slots = [];
          }
        });

        return result;
      });
    },
    staleTime: 0, // Ensure data is always considered stale and will refetch
    refetchOnWindowFocus: false, // Prevent refetching when window regains focus
  });

  // Query for saved restaurants - always fetch this for marking saved status
  const { data: savedRestaurants, isLoading: isSavedLoading } = useQuery<RestaurantWithAvailability[]>({
    queryKey: ['saved-branches'],
    queryFn: async () => {
      try {
        // Use the existing client function which handles the API call properly
        // and now marks branches with isSaved=true
        return (await getSavedRestaurants()) as unknown as RestaurantWithAvailability[];
      } catch (error) {
        console.error('Error fetching saved restaurants:', error);
        return [];
      }
    },
    enabled: !showSavedOnly, // Only run this query when not showing saved only
  });

  // Loading state
  if (isLoading || (showSavedOnly && isSavedLoading)) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Loading restaurants...</Text>
      </View>
    );
  }

  // No restaurants found
  if (!restaurants || restaurants.length === 0) {
    console.log('No restaurants to display. showSavedOnly:', showSavedOnly, 'restaurants array:', restaurants);
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          {showSavedOnly
            ? "You haven't saved any restaurants yet."
            : "No restaurants found matching your criteria."}
        </Text>
        {showSavedOnly && (
          <Text style={styles.emptyStateSubtext}>
            Browse restaurants and tap the star icon to save your favorites.
          </Text>
        )}
      </View>
    );
  }

  // Create a flat list of all restaurant branches with their associated restaurant
  const allBranches: { restaurant: RestaurantWithAvailability; branch: BranchWithAvailability; branchIndex: number; isNearby?: boolean }[] = [];

  // Create a map of saved restaurant IDs and branch indexes for quick lookup
  const savedMap = new Map<string, boolean>();
  if (savedRestaurants && !showSavedOnly) {
    // Loop through each restaurant and its branches to find saved ones
    savedRestaurants.forEach((restaurant) => {
      if (restaurant.branches) {
        restaurant.branches.forEach((branch, branchIndex) => {
          // Check if this branch is marked as saved
          if ((branch as any).isSaved) {
            savedMap.set(`${restaurant.id}-${branchIndex}`, true);
          }
        });
      }
    });
  }

  // Process the restaurants data
  if (restaurants && restaurants.length > 0) {
    restaurants.forEach(restaurant => {
      console.log(`[RestaurantList] Restaurant ${restaurant.id} has ${restaurant.branches ? restaurant.branches.length : 0} branches`);

      // Skip if no branches
      if (!restaurant.branches || restaurant.branches.length === 0) {
        return;
      }

      // Process each branch
      restaurant.branches.forEach((branch, branchIndex) => {
        // Initialize slots array if it doesn't exist
        if (!branch.slots) {
          branch.slots = [];
        }

        // Create a BranchWithAvailability object
        const branchWithAvailability: BranchWithAvailability = {
          id: branch.id,
          location: branch.location,
          address: branch.address,
          city: branch.city || '',
          slots: branch.slots.map((slot: any) => {
            // Handle both string slots and object slots
            if (typeof slot === 'string') {
              return { time: slot }; // Simple time slot
            } else if (typeof slot === 'object') {
              return {
                time: slot.time || '',
                availableSeats: typeof slot.availableSeats === 'number' ? slot.availableSeats : 0
              };
            }
            return { time: '' }; // Fallback
          }),
          isSaved: branch.isSaved || false,
          availableSlots: branch.availableSlots || []
        };

        // If distance filter is applied, filter by distance
        if (distanceFilter !== 'all' && location?.coords) {
          const maxDistance = parseInt(distanceFilter.split(' ')[0]); // Extract number from "X km"
          
          // Only include branches within the specified distance
          if (branch.distance !== undefined && branch.distance > maxDistance) {
            return; // Skip this branch if it's too far away
          }
          
          // If no distance data but we have coordinates, calculate it
          if (branch.distance === undefined && branch.latitude && branch.longitude) {
            const distance = calculateDistance(
              location.coords.latitude,
              location.coords.longitude,
              parseFloat(branch.latitude),
              parseFloat(branch.longitude)
            );
            
            // Skip if beyond the filter distance
            if (distance > maxDistance) {
              return;
            }
            
            // Store the calculated distance
            branch.distance = distance;
            branchWithAvailability.distance = distance;
          }
        }

        // If showSavedOnly is true, only include saved branches
        if (showSavedOnly && !branch.isSaved && !restaurant.isSaved) {
          return;
        }

        // Otherwise, check the savedMap
        if (!showSavedOnly && savedMap.has(`${restaurant.id}-${branchIndex}`)) {
          // Mark as saved for UI purposes
          branchWithAvailability.isSaved = true;
        }

        allBranches.push({
          restaurant,
          branch: branchWithAvailability,
          branchIndex
        });
      });
    });
  }

  // Add nearby restaurants
  if (nearbyRestaurants && nearbyRestaurants.length > 0) {
    // Add a section header for nearby restaurants
    const nearbySection = (
      <View style={styles.nearbyHeader}>
        <Ionicons name="location" size={18} color="#007AFF" />
        <Text style={styles.nearbyHeaderText}>Nearby Restaurants</Text>
      </View>
    );

    nearbyRestaurants.forEach((restaurant) => {
      // Extract the first branch if available
      const firstBranch = restaurant.branches && restaurant.branches.length > 0 ? restaurant.branches[0] : null;
      
      if (firstBranch) {
        // Log the branch data to debug
        console.log(`Branch for ${restaurant.name}:`, {
          id: firstBranch.id,
          distance: firstBranch.distance,
          hasDistance: firstBranch.distance !== undefined,
          distanceType: typeof firstBranch.distance,
          latitude: firstBranch.latitude,
          longitude: firstBranch.longitude
        });
        
        // Ensure distance is a number
        const distance = typeof firstBranch.distance === 'number' ? firstBranch.distance : 
                        typeof firstBranch.distance === 'string' ? parseFloat(firstBranch.distance) : undefined;
        
        // Calculate distance using Haversine formula
        let calculatedDistance: number | undefined = undefined;
        
        if (location?.coords && firstBranch.latitude && firstBranch.longitude) {
          try {
            calculatedDistance = calculateDistance(
              location.coords.latitude,
              location.coords.longitude,
              parseFloat(firstBranch.latitude),
              parseFloat(firstBranch.longitude)
            );
            console.log(`Calculated distance for ${restaurant.name}:`, calculatedDistance);
          } catch (error) {
            console.error('Error calculating distance:', error);
          }
        }
        
        // Use either the API-provided distance or our calculated distance
        const finalDistance = distance !== undefined ? distance : calculatedDistance;
        
        console.log(`Final distance for ${restaurant.name}:`, {
          apiDistance: distance,
          calculatedDistance,
          finalDistance,
          isNearby: true
        });
        
        allBranches.push({
          restaurant: {
            ...restaurant,
            branches: [{
              ...firstBranch,
              distance: finalDistance // Use final distance
            }]
          } as RestaurantWithAvailability,
          branch: {
            id: firstBranch.id,
            location: firstBranch.address || '',
            address: firstBranch.address || '',
            city: firstBranch.city || '',
            slots: [],
            isSaved: false,
            availableSlots: [],
            distance: finalDistance // Ensure distance is properly set
          },
          branchIndex: 0,
          isNearby: true // Mark as nearby for special styling
        });
      }
    });
  }

  console.log(`[RestaurantList] Total branches to display: ${allBranches.length}`);

  return (
    <View style={styles.container}>
      <FlatList
        data={allBranches}
        keyExtractor={(item) => `${item.restaurant.id}-${item.branchIndex}`}
        renderItem={({ item }) => {
          console.log(`Rendering restaurant: ${item.restaurant.name}, has branches: ${item.restaurant.branches?.length || 0}`);
          return (
            <RestaurantCard
              restaurant={item.restaurant}
              branchIndex={item.branchIndex}
              date={date instanceof Date && !isNaN(date.getTime()) ? date.toISOString() : new Date().toISOString()}
              time={time}
              partySize={partySize}
              isNearby={item.isNearby}
            />
          );
        }}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginBottom: 66,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  listContainer: {
    padding: 4,
  },
  nearbyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#f7f7f7',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  nearbyHeaderText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});
