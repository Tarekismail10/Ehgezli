/**
 * RestaurantCard.tsx - Restaurant Card Component
 * 
 * This component displays a card for a single restaurant in the list.
 * It shows key information like:
 * - Restaurant name and image
 * - Cuisine type
 * - Price range
 * - Rating
 * - Available time slots
 * 
 * The card is touchable and navigates to the restaurant detail screen when pressed.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert } from 'react-native';
import { RelativePathString, useRouter } from 'expo-router';
import { formatTimeWithAMPM } from '../shared/utils/time-slots';
import { getSavedStatus, toggleSavedStatus, Restaurant, Branch } from '../shared/api/client';
import { useAuth } from '../context/auth-context';
import Colors from '../constants/Colors';
import { useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * Define extended types for the restaurant data
 */
interface RestaurantWithAvailability extends Restaurant {
  profile?: {
    logo?: string;
    cuisine?: string;
    priceRange?: string;
  };
}

/**
 * Define time slot interface
 */
interface TimeSlot {
  time: string;
}

/**
 * Define a custom branch type that doesn't extend Branch to avoid type conflicts
 */
interface BranchWithAvailability {
  id: number;
  location: string;
  address: string;
  city?: string;
  slots: TimeSlot[];
}

/**
 * Props for the RestaurantCard component
 */
interface RestaurantCardProps {
  restaurant: RestaurantWithAvailability;
  branchIndex: number;
  date: string;
  time?: string;
  partySize: number;
}

/**
 * RestaurantCard component displays a card for a single restaurant
 * 
 * @param {RestaurantCardProps} props - Component props
 */
export function RestaurantCard({ 
  restaurant, 
  branchIndex, 
  date, 
  time, 
  partySize 
}: RestaurantCardProps) {
  console.log(`[RestaurantCard] rendering ${restaurant.id}, branch ${branchIndex}`);
  
  // Get the router for navigation
  const router = useRouter();
  
  // Get the user's color scheme preference (light/dark)
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  
  // Get the user's authentication data
  const { user } = useAuth();
  
  // State to track if the restaurant is saved
  const [isSaved, setIsSaved] = useState(false);
  
  // State to track if the save button is loading
  const [isLoading, setIsLoading] = useState(false);

  // Transform the branch data to include the expected fields
  const originalBranch = restaurant.branches[branchIndex];
  const branch: BranchWithAvailability = {
    id: originalBranch.id,
    location: originalBranch.location,
    address: originalBranch.address,
    city: 'Cairo', // Default city or get from elsewhere if available
    slots: originalBranch.slots.map(timeStr => ({ time: timeStr }))
  };

  /**
   * Check if restaurant is saved when component mounts
   */
  useEffect(() => {
    const checkSavedStatus = async () => {
      try {
        const saved = await getSavedStatus(restaurant.id);
        setIsSaved(saved);
      } catch (error) {
        console.error('Error checking saved status:', error);
      }
    };
    
    checkSavedStatus();
  }, [restaurant.id, branchIndex]);

  /**
   * Handle save toggle button press
   */
  const handleSaveToggle = async () => {
    try {
      setIsLoading(true);
      const saved = await toggleSavedStatus(restaurant.id);
      setIsSaved(saved);
    } catch (error: any) {
      // Handle authentication errors
      if (error.response?.status === 401) {
        Alert.alert('Authentication Required', 'Please log in to save restaurants');
      } else {
        Alert.alert('Error', 'Failed to save restaurant');
      }
      console.error('Error toggling saved status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle card press
   */
  const handlePress = () => {
    router.push({
      pathname: `/restaurant/${restaurant.id.toString()}` as unknown as RelativePathString,
      params: {
        date,
        time: time || '',
        partySize: partySize.toString(),
        branchId: branch.id.toString()
      }
    });
  };

  return (
    <TouchableOpacity 
      style={[styles.card, { borderColor: colors.border }]} 
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {/* Restaurant image */}
      <View style={styles.header}>
        <Image 
          source={{ 
            uri: restaurant.profile?.logo || 
                'https://via.placeholder.com/100?text=Restaurant'
          }} 
          style={styles.logo} 
        />
        
        {/* Restaurant details */}
        <View style={styles.headerText}>
          <Text style={[styles.name, { color: colors.text }]}>{restaurant.name}</Text>
          <Text style={[styles.cuisine, { color: colors.text }]}>
            {restaurant.profile?.cuisine || 'Various Cuisine'}
          </Text>
          <Text style={[styles.location, { color: colors.text }]}>
            {branch.city}{branch.location ? `, ${branch.location}` : ''}
          </Text>
        </View>
        
        {/* Save button */}
        <TouchableOpacity 
          style={styles.saveButton} 
          onPress={handleSaveToggle}
          disabled={isLoading}
        >
          <Ionicons 
            name={isSaved ? 'star' : 'star-outline'} 
            size={24} 
            color={isSaved ? colors.primary : colors.text} 
          />
        </TouchableOpacity>
      </View>

      {/* Restaurant metadata */}
      <View style={styles.details}>
        <Text style={[styles.price, { color: colors.text }]}>
          {restaurant.profile?.priceRange || '$$'}
        </Text>
        
        {/* Time slots */}
        {branch.slots && branch.slots.length > 0 ? (
          <View style={styles.timeSlotsContainer}>
            <Text style={[styles.availabilityText, { color: colors.text }]}>
              Available times:
            </Text>
            <View style={styles.timeSlots}>
              {branch.slots.map((slot, index) => (
                <TouchableOpacity 
                  key={index}
                  style={[styles.timeSlot, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    router.push({
                      pathname: `/restaurant/${restaurant.id.toString()}` as unknown as RelativePathString,
                      params: {
                        date,
                        time: slot.time,
                        partySize: partySize.toString(),
                        branchId: branch.id.toString()
                      }
                    });
                  }}
                >
                  <Text style={styles.timeSlotText}>
                    {formatTimeWithAMPM(slot.time)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          <Text style={[styles.noAvailability, { color: colors.text }]}>
            No availability for selected time
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

/**
 * Styles for the RestaurantCard component
 */
const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    padding: 16,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 2,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
  },
  headerText: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cuisine: {
    fontSize: 14,
    marginBottom: 4,
  },
  location: {
    fontSize: 14,
    opacity: 0.7,
  },
  saveButton: {
    justifyContent: 'center',
    padding: 8,
  },
  details: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  timeSlotsContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  availabilityText: {
    fontSize: 14,
    marginBottom: 4,
  },
  timeSlots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  timeSlot: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 8,
    marginBottom: 4,
  },
  timeSlotText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  noAvailability: {
    fontSize: 14,
    fontStyle: 'italic',
    opacity: 0.7,
  },
});
