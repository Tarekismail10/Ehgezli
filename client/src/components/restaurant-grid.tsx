import { useQuery } from "@tanstack/react-query";
import { RestaurantWithAvailability, AvailableSlot, BranchWithAvailability } from "@shared/schema";
import { RestaurantCard } from "./restaurant-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { format, parse } from "date-fns";
import { useAuth } from "@/hooks/use-auth";

interface RestaurantGridProps {
  searchQuery?: string;
  cityFilter?: string;
  cuisineFilter?: string;
  priceFilter?: string;
  date?: Date;
  time?: string;
  partySize?: number;
  showSavedOnly?: boolean;
}

export function RestaurantGrid({
  searchQuery,
  cityFilter,
  cuisineFilter,
  priceFilter,
  date,
  time,
  partySize,
  showSavedOnly = false
}: RestaurantGridProps) {
  console.log("[RestaurantGrid] rendering", { showSavedOnly });
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  // Query for all restaurants with availability
  const { data: restaurants, isLoading } = useQuery<RestaurantWithAvailability[]>({
    queryKey: ["restaurants", searchQuery, cityFilter, cuisineFilter, priceFilter, date, time, partySize],
    queryFn: async () => {
      console.log("[RestaurantGrid] Fetching with search query:", searchQuery);
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (cityFilter && cityFilter !== 'all') params.append("city", cityFilter);
      if (cuisineFilter && cuisineFilter !== 'all') params.append("cuisine", cuisineFilter);
      if (priceFilter && priceFilter !== 'all') params.append("priceRange", priceFilter);
      if (date) params.append("date", date.toISOString());
      if (time) params.append("time", time);
      
      console.log("[RestaurantGrid] Fetching with params:", params.toString());
      // Always include partySize (defaults to 2 if not provided)
      params.append("partySize", (partySize || 2).toString());

      console.log("[RestaurantGrid] Fetching with params:", params.toString());

      // Always use availability endpoint to get time slots
      const response = await fetch(`/api/restaurants/availability?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch restaurants');
      }
      return response.json();
    },
    staleTime: 0, // Ensure data is always considered stale and will refetch
    refetchOnWindowFocus: false // Prevent refetching when window regains focus
  });

  // Query for saved restaurants - always fetch this for ordering
  const { data: savedRestaurants, isLoading: isSavedLoading } = useQuery<{ restaurantId: number; branchIndex: number }[]>({
    queryKey: ["/api/saved-restaurants"],
    queryFn: async () => {
      const response = await fetch("/api/saved-restaurants", { credentials: 'include' });
      if (!response.ok) {
        // If not logged in or other error, return empty array
        if (response.status === 401 || response.status === 403) {
          return [];
        }
        const error = await response.json();
        throw new Error(error.message || "Failed to fetch saved restaurants");
      }
      return response.json();
    },
    enabled: !!user // Only run this query when user is logged in
  });

  // Query for user profile to get city and favorite cuisines
  const { data: userProfile } = useQuery({
    queryKey: ["/api/user/profile"],
    queryFn: async () => {
      const response = await fetch("/api/user/profile", { credentials: 'include' });
      if (!response.ok) {
        // If not logged in or other error, return null
        if (response.status === 401 || response.status === 403) {
          return null;
        }
        const error = await response.json();
        throw new Error(error.message || "Failed to fetch user profile");
      }
      return response.json();
    },
    enabled: !!user // Only run this query when user is logged in
  });

  console.log("DEBUG - RestaurantGrid component state:", {
    isUserLoggedIn: !!user,
    hasSavedRestaurants: !!savedRestaurants,
    hasUserProfile: !!userProfile,
    savedRestaurantsCount: savedRestaurants?.length || 0,
    restaurantsCount: restaurants?.length || 0,
    showSavedOnly,
    userCity: userProfile?.city,
    userCuisines: userProfile?.favoriteCuisines
  });

  // If we have restaurants, log their structure to understand the data
  if (restaurants && restaurants.length > 0) {
    console.log("DEBUG - First restaurant structure:", {
      id: restaurants[0].id,
      name: restaurants[0].name,
      hasProfile: !!restaurants[0].profile,
      profileProperties: restaurants[0].profile ? Object.keys(restaurants[0].profile) : [],
      branchCount: restaurants[0].branches.length,
      firstBranchProperties: restaurants[0].branches.length > 0 ? Object.keys(restaurants[0].branches[0]) : []
    });
  }

  // Loading state
  if (isLoading || (showSavedOnly && isSavedLoading)) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-4">
            <Skeleton className="h-[200px] w-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-[250px]" />
              <Skeleton className="h-4 w-[200px]" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Create a flat list of all restaurant branches with their associated restaurant
  let allBranches: { restaurant: RestaurantWithAvailability; branch: BranchWithAvailability; branchIndex: number }[] = [];
  
  // Create a map of saved restaurant IDs and branch indexes for quick lookup
  const savedMap = new Map();
  if (savedRestaurants) {
    savedRestaurants.forEach(saved => {
      savedMap.set(`${saved.restaurantId}-${saved.branchIndex}`, true);
    });
  }
  
  // Flatten the restaurants into branches
  (restaurants || []).forEach(restaurant => {
    restaurant.branches.forEach((branch, branchIndex) => {
      // If showSavedOnly is true, only include saved branches
      if (showSavedOnly && !savedMap.has(`${restaurant.id}-${branchIndex}`)) {
        return; // Skip this branch
      }
      
      allBranches.push({
        restaurant,
        branch,
        branchIndex
      });
    });
  });
  
  // Sort all branches according to our priority rules
  allBranches.sort((a, b) => {
    const aRestaurant = a.restaurant;
    const bRestaurant = b.restaurant;
    const aBranch = a.branch;
    const bBranch = b.branch;
    
    // Check if branch is saved
    const aIsSaved = savedMap.has(`${aRestaurant.id}-${a.branchIndex}`);
    const bIsSaved = savedMap.has(`${bRestaurant.id}-${b.branchIndex}`);
    
    // 1. Saved branches first
    if (aIsSaved && !bIsSaved) return -1;
    if (!aIsSaved && bIsSaved) return 1;
    
    // 2. Branches in user's city
    const normalizedUserCity = (userProfile?.city || '').toLowerCase().trim();
    const aInUserCity = aBranch.city.toLowerCase().trim() === normalizedUserCity;
    const bInUserCity = bBranch.city.toLowerCase().trim() === normalizedUserCity;
    
    if (aInUserCity && !bInUserCity) return -1;
    if (!aInUserCity && bInUserCity) return 1;
    
    // 3. Branches with user's preferred cuisines
    const userCuisines = userProfile?.favoriteCuisines || [];
    const aCuisine = aRestaurant.profile?.cuisine || '';
    const bCuisine = bRestaurant.profile?.cuisine || '';
    const aHasUserCuisine = userCuisines.includes(aCuisine);
    const bHasUserCuisine = userCuisines.includes(bCuisine);
    
    if (aHasUserCuisine && !bHasUserCuisine) return -1;
    if (!aHasUserCuisine && bHasUserCuisine) return 1;
    
    // 4. Alphabetical by name
    const aName = aRestaurant.name || aRestaurant.profile?.about || 'No name';
    const bName = bRestaurant.name || bRestaurant.profile?.about || 'No name';
    return aName.localeCompare(bName);
  });

  if (!allBranches.length) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          {showSavedOnly 
            ? "You haven't saved any restaurants yet." 
            : "No restaurants found matching your criteria."}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {allBranches.map(({ restaurant, branch, branchIndex }) => {
        const slots = branch.availableSlots || [];
        return (
          <div key={`${restaurant.id}-${branchIndex}`} className="w-full max-w-[600px] mx-auto">
            <RestaurantCard
              restaurant={restaurant}
              branchIndex={branchIndex}
              date={date}
              time={time}
              partySize={partySize}
            >
              {slots.length > 0 && (
                <div className="flex justify-center gap-3 mt-4">
                  {slots.map((slot: AvailableSlot) => {
                    const time = parse(slot.time, 'HH:mm', new Date());
                    return (
                      <Button
                        key={`${branch.id}-${slot.time}`}
                        size="sm"
                        variant="ehgezli"
                        className="px-4 py-1.5 h-auto rounded font-medium text-sm min-w-[90px]"
                        onClick={(e) => {
                          // Stop propagation to prevent card click when clicking the time slot button
                          e.stopPropagation();
                          setLocation(
                            `/restaurant/${restaurant.id}?date=${date?.toISOString()}&time=${slot.time}&partySize=${partySize}&branch=${branchIndex}`
                          );
                        }}
                      >
                        {format(time, 'h:mm a')}
                      </Button>
                    );
                  })}
                </div>
              )}
            </RestaurantCard>
          </div>
        );
      })}
    </div>
  );
}
