import React from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { RestaurantCard } from './RestaurantCard';
import { getRestaurants, getSavedRestaurants, Restaurant, Branch } from '../shared/api/client';

interface RestaurantListProps {
  searchQuery?: string;
  cityFilter?: string;
  cuisineFilter?: string;
  priceFilter?: string;
  date?: Date;
  time?: string;
  partySize?: number;
  showSavedOnly?: boolean;
}

export function RestaurantList({
  searchQuery,
  cityFilter,
  cuisineFilter,
  priceFilter,
  date = new Date(),
  time,
  partySize = 2,
  showSavedOnly = false,
}: RestaurantListProps) {
  console.log('[RestaurantList] rendering', { showSavedOnly });
  
  // Query for all restaurants with availability
  const { data: apiRestaurants, isLoading } = useQuery<Restaurant[]>({
    queryKey: ['restaurants', searchQuery, cityFilter, cuisineFilter, priceFilter, date, time, partySize, showSavedOnly],
    queryFn: async () => {
      console.log('[RestaurantList] Fetching with search query:', searchQuery);
      console.log('[RestaurantList] Show saved only:', showSavedOnly);
      
      // If showSavedOnly is true, return saved restaurants only
      if (showSavedOnly) {
        return getSavedRestaurants();
      }
      
      const params: Record<string, any> = {
        date: date.toISOString(),
        partySize,
        showSavedOnly,
        time: time || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      };
      
      if (searchQuery) params['search'] = searchQuery;
      if (cityFilter && cityFilter !== 'all') params['city'] = cityFilter;
      if (cuisineFilter && cuisineFilter !== 'all') params['cuisine'] = cuisineFilter;
      if (priceFilter && priceFilter !== 'all') params['priceRange'] = priceFilter;
      
      console.log('[RestaurantList] Fetching with params:', params);
      
      return getRestaurants(params);
    },
    staleTime: 0, // Ensure data is always considered stale and will refetch
    refetchOnWindowFocus: false, // Prevent refetching when window regains focus
  });

  // Transform API restaurants to the expected format
  const restaurants = React.useMemo(() => {
    console.log('[RestaurantList] API response:', apiRestaurants);
    if (!apiRestaurants) {
      console.log('[RestaurantList] API response is undefined or null');
      return [];
    }
    
    if (!Array.isArray(apiRestaurants)) {
      console.log('[RestaurantList] API response is not an array:', typeof apiRestaurants);
      return [];
    }
    
    return apiRestaurants.map(restaurant => {
      // Add profile property if it doesn't exist
      const restaurantWithProfile = {
        ...restaurant,
        profile: {
          cuisine: restaurant.cuisine,
          about: restaurant.description,
          priceRange: restaurant.priceRange,
          logo: restaurant.imageUrl,
        },
      };
      
      return restaurantWithProfile;
    });
  }, [apiRestaurants]);
  
  // Query for saved restaurants - always fetch this for marking saved status
  const { data: savedRestaurants, isLoading: isSavedLoading } = useQuery<Restaurant[]>({
    queryKey: ['saved-restaurants'],
    queryFn: async () => {
      try {
        // Use the existing client function which handles the API call properly
        // and now marks branches with isSaved=true
        return await getSavedRestaurants();
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
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          No restaurants available for the selected criteria
        </Text>
      </View>
    );
  }

  // Create a flat list of all restaurant branches with their associated restaurant
  const allBranches: { restaurant: Restaurant; branch: Branch; branchIndex: number }[] = [];
  
  // Create a map of saved restaurant IDs and branch indexes for quick lookup
  const savedMap = new Map<string, boolean>();
  if (savedRestaurants && !showSavedOnly) {
    // Loop through each restaurant and its branches to find saved ones
    savedRestaurants.forEach((restaurant: Restaurant) => {
      if (restaurant.branches) {
        restaurant.branches.forEach((branch: Branch, branchIndex: number) => {
          // Check if this branch is marked as saved
          if ((branch as any).isSaved) {
            savedMap.set(`${restaurant.id}-${branchIndex}`, true);
          }
        });
      }
    });
  }
  
  // Flatten the restaurants into branches
  if (restaurants && Array.isArray(restaurants)) {
    restaurants.forEach((restaurant: Restaurant) => {
      if (!restaurant || !restaurant.branches || !Array.isArray(restaurant.branches)) {
        console.log(`[RestaurantList] Restaurant ${restaurant?.id || 'unknown'} has invalid or no branches`);
        return;
      }
      
      console.log(`[RestaurantList] Processing restaurant ${restaurant.id} with ${restaurant.branches.length} branches`);
      
      restaurant.branches.forEach((branch: Branch, branchIndex: number) => {
        // Ensure branch has required properties
        if (!branch) {
          console.log(`[RestaurantList] Branch ${branchIndex} of restaurant ${restaurant.id} is undefined`);
          return;
        }
        
        // Ensure branch has slots array (even if empty)
        if (!branch.slots) {
          console.log(`[RestaurantList] Branch ${branchIndex} of restaurant ${restaurant.id} has no slots, initializing empty array`);
          branch.slots = [];
        }
        
        // If showSavedOnly is true, we already have only saved restaurants from the API
        // Otherwise, check the savedMap
        if (!showSavedOnly && savedMap.has(`${restaurant.id}-${branchIndex}`)) {
          // Mark as saved for UI purposes
          (branch as any).isSaved = true;
        }
        
        allBranches.push({
          restaurant,
          branch,
          branchIndex
        });
      });
    });
  } else {
    console.log('[RestaurantList] Restaurants data is not in expected format:', restaurants);
  }
  
  console.log(`[RestaurantList] Total branches to display: ${allBranches.length}`);
  
  return (
    <FlatList
      data={allBranches}
      keyExtractor={(item) => `${item.restaurant.id}-${item.branchIndex}`}
      renderItem={({ item }) => (
        <RestaurantCard
          restaurant={item.restaurant as any}
          branchIndex={item.branchIndex}
          date={date.toISOString()}
          time={time}
          partySize={partySize}
        />
      )}
      contentContainerStyle={styles.listContainer}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
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
  },
  listContainer: {
    padding: 10,
  },
});
