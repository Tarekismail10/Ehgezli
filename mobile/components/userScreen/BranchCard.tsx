import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BranchListItem } from '@/types/branch';
import { formatTimeWithAMPM } from '@/app/utils/time-slots';
import { format } from 'date-fns';
import { useTimeSlots } from '@/hooks/useTimeSlots';
import { useBranchStore } from '@/store/branch-store';
import { router } from 'expo-router';

interface BranchCardProps {
  branch: BranchListItem;
  onPress: (branchId: number) => void;
  isSaved?: boolean;
  onToggleSave?: (branchId: number) => void;
}

// Define the ref type
export type BranchCardRefType = {
  refreshTimeSlots: (date: Date, time: string) => void;
};

// Use forwardRef to expose methods to parent
export const BranchCard = forwardRef<BranchCardRefType, BranchCardProps>(
  ({ branch, onPress, isSaved = false, onToggleSave }, ref) => {
    // Use our custom hook
    const { timeSlots, loading, fetchTimeSlots, getRelevantTimeSlots } = useTimeSlots(branch.branchId);
    
    // State to track the current selected date for this card
    const [currentDate, setCurrentDate] = useState(new Date());
    const [currentTimeStr, setCurrentTimeStr] = useState('');

    // Get user location from the branch store to check if permissions were granted
    const userLocation = useBranchStore(state => state.userLocation);
    
    // Simplified check - only verify that we have a valid userLocation with coordinates
    const locationPermissionGranted = 
      userLocation !== null && 
      userLocation !== undefined && 
      typeof userLocation === 'object' &&
      userLocation.latitude !== undefined &&
      userLocation.longitude !== undefined;
    
    // This function can be called from outside to refresh time slots
    const refreshTimeSlots = (date: Date, time: string) => {
      // Store the date and time for later use when navigating
      setCurrentDate(date);
      setCurrentTimeStr(time);
      // Fetch time slots for this date and pass the selected time
      fetchTimeSlots(date, time);
      
      console.log(`🔍 DEBUG: Refreshing time slots for branch ${branch.branchId} with date=${format(date, 'yyyy-MM-dd')} and time=${time}`);
    };
    
    // Expose the refreshTimeSlots method via ref
    useImperativeHandle(ref, () => ({
      refreshTimeSlots
    }));
    
    // Fetch time slots once when component mounts
    useEffect(() => {
      // Fetch slots for this branch using the current date
      fetchTimeSlots(currentDate);
      
      // We only want to run this once when the component mounts
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    
    const formatDistance = (distance: number | null | undefined) => {
      if (distance === null || distance === undefined) return 'Distance unknown';
      if (distance < 1) return `${Math.round(distance * 1000)}m away`;
      return `${distance.toFixed(1)} km away`;
    };

    const handleToggleSave = (e: any) => {
      e.stopPropagation(); // Prevent triggering the card's onPress
      if (onToggleSave) {
        onToggleSave(branch.branchId);
      }
    };

    // Handle time slot click
    const handleTimeSlotClick = (e: any, timeSlot: string) => {
      e.stopPropagation(); // Prevent triggering the card's onPress
      
      // Navigate to branch details with the selected time slot
      router.push({
        pathname: `/user/branch-details`,
        params: { 
          id: branch.branchId.toString(),
          selectedTime: timeSlot,
          // Use the stored date from the parent component
          selectedDate: format(currentDate, 'yyyy-MM-dd')
        }
      });
    };

    return (
      <TouchableOpacity 
        style={styles.container}
        onPress={() => onPress(branch.branchId)}
        activeOpacity={0.7}
      >
        {/* Restaurant Logo */}
        <View style={styles.logoContainer}>
          <Image 
            source={{ uri: branch.logo }} 
            style={styles.logo} 
            resizeMode="cover"
          />
        </View>
        
        {/* Restaurant Info Container */}
        <View style={styles.infoContainer}>
          {/* Restaurant Name and Favorite Icon */}
          <View style={styles.headerRow}>
            <Text style={styles.name}>{branch.restaurantName}</Text>
            
            {/* Favorite Button */}
            <TouchableOpacity 
              style={styles.favoriteButton}
              onPress={handleToggleSave}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={isSaved ? "star" : "star-outline"} 
                size={24} 
                color={isSaved ? "hsl(355,79%,36%)" : "#000"} 
              />
            </TouchableOpacity>
          </View>
          
          <View style={styles.infoRow}>
            {/* Left side: Price Range, Cuisine, Distance */}
            <View style={styles.leftInfo}>
              {/* Price Range */}
              <Text style={styles.priceRange}>{branch.priceRange}</Text>
              <Text style={styles.dot}>•</Text>
              {/* Cuisine */}
              <Text style={styles.cuisine}>{branch.cuisine}</Text>
              
              {/* Distance (if available) */}
              {locationPermissionGranted && branch.distance !== null && 
               branch.distance !== undefined && 
               typeof branch.distance === 'number' &&
               !isNaN(branch.distance) && (
                <>
                  <Text style={styles.dot}>•</Text>
                  <Text style={styles.distance}>{formatDistance(branch.distance)}</Text>
                </>
              )}
            </View>
            
            {/* Right side: City */}
            <Text style={styles.city}>{branch.city}</Text>
          </View>
        </View>
        
        {/* Time Slots */}
        <View style={styles.timeSlotContainer}>
          {loading ? (
            // Show loading indicator while fetching slots
            <ActivityIndicator size="small" color="#B22222" />
          ) : timeSlots.length > 0 ? (
            // Show the 3 most relevant time slots based on user's selected time
            getRelevantTimeSlots(timeSlots, currentTimeStr).map((time, index) => (
              <TouchableOpacity 
                key={index}
                style={styles.timeSlot}
                onPress={(e) => handleTimeSlotClick(e, time.time)}
              >
                <Text style={styles.timeSlotText}>{formatTimeWithAMPM(time.time)}</Text>
              </TouchableOpacity>
            ))
          ) : (
            // Show message if no slots available
            <Text style={styles.noSlotsText}>
              {branch.branchId === 91 ? 'Limited availability' : 'No available times'}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    padding: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  logoContainer: {
    width: '100%',
    height: 150,
  },
  logo: {
    width: '100%',
    height: '100%',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  infoContainer: {
    padding: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  favoriteButton: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 6,
    borderWidth: 1,
    borderColor: '#eee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  leftInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  priceRange: {
    fontSize: 14,
    color: '#666',
  },
  dot: {
    fontSize: 14,
    color: '#666',
    marginHorizontal: 6,
  },
  cuisine: {
    fontSize: 14,
    color: '#666',
  },
  distance: {
    fontSize: 14,
    color: '#666',
    fontWeight: '400',
  },
  city: {
    fontSize: 14,
    color: '#666',
    marginLeft: 'auto',
  },
  timeSlotContainer: {
    flexDirection: 'row',
    marginTop: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeSlot: {
    backgroundColor: '#B22222',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    marginBottom: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeSlotText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  noSlotsText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
  },
});
