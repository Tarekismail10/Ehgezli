import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Image, TouchableOpacity, ActivityIndicator, Alert, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getRestaurantById, createBooking, Restaurant, Branch, getRestaurantLocation } from '@/shared/api/client';
import { formatTimeWithAMPM } from '@/shared/utils/time-slots';
import { EhgezliButton } from '@/components/EhgezliButton';
import { RestaurantMap } from '@/components/RestaurantMap';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { useColorScheme } from 'react-native';
import { format } from 'date-fns';
import { useAuth } from '@/context/auth-context';
import { useLocation } from '@/context/location-context';

// Define extended types for the restaurant data that includes profile information
interface RestaurantWithProfile extends Restaurant {
  profile?: {
    logo?: string;
    cuisine?: string;
    priceRange?: string;
    about?: string;
  };
}

// Define time slot interface for type safety
interface TimeSlot {
  time: string;
}

// Extend Branch type to include city
interface BranchWithCity extends Omit<Branch, 'slots'> {
  city?: string;
  slots: (string | TimeSlot)[];
}

export default function RestaurantDetailScreen() {
  const { id, date, time, partySize, branchId } = useLocalSearchParams<{
    id: string;
    date: string;
    time: string;
    partySize: string;
    branchId: string;
  }>();
  
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { user } = useAuth();
  const { location } = useLocation();
  
  const [selectedTime, setSelectedTime] = useState(time || '');
  const [showMap, setShowMap] = useState(false);
  
  // Query restaurant details
  const { data: restaurant, isLoading, error } = useQuery<RestaurantWithProfile | null>({
    queryKey: ['restaurant', id],
    queryFn: () => getRestaurantById(Number(id)),
  });
  
  // Query restaurant location with user's coordinates for distance calculation
  const { data: locationData, isLoading: isLocationLoading } = useQuery({
    queryKey: ['restaurantLocation', id, location?.coords.latitude, location?.coords.longitude],
    queryFn: () => getRestaurantLocation(Number(id), {
      userLatitude: location?.coords.latitude.toString(),
      userLongitude: location?.coords.longitude.toString(),
    }),
    enabled: !!id && !!location,
  });
  
  // Create booking mutation
  const bookingMutation = useMutation({
    mutationFn: createBooking,
    onSuccess: () => {
      Alert.alert(
        'Booking Confirmed',
        'Your reservation has been confirmed!',
        [{ text: 'OK', onPress: () => router.push('/') }]
      );
    },
    onError: (error: any) => {
      Alert.alert('Booking Failed', error.message || 'Could not complete your booking');
    },
  });
  
  // Find the selected branch
  const selectedBranch = restaurant?.branches.find((branch) => branch.id === Number(branchId)) as unknown as BranchWithCity | undefined;
  
  const handleBooking = () => {
    if (!user) {
      Alert.alert('Authentication Required', 'Please log in to make a booking');
      return;
    }
    
    if (!selectedTime) {
      Alert.alert('Time Required', 'Please select a time for your booking');
      return;
    }
    
    bookingMutation.mutate({
      restaurantId: Number(id),
      branchId: Number(branchId),
      date: date,
      time: selectedTime,
      partySize: Number(partySize),
    });
  };
  
  if (isLoading || isLocationLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>Loading restaurant details...</Text>
      </View>
    );
  }
  
  if (error || !restaurant) {
    return (
      <View style={styles.errorContainer}>
        <Text style={[styles.errorText, { color: colors.text }]}>Could not load restaurant details</Text>
        <EhgezliButton
          title="Go Back"
          variant="ehgezli"
          onPress={() => router.back()}
          style={styles.errorButton}
        />
      </View>
    );
  }
  
  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </TouchableOpacity>
      
      <Image
        source={{
          uri: restaurant.profile?.logo || 'https://via.placeholder.com/400x200?text=Restaurant',
        }}
        style={styles.coverImage}
      />
      
      <View style={styles.content}>
        <Text style={[styles.restaurantName, { color: colors.text }]}>{restaurant.name}</Text>
        
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Ionicons name="location-outline" size={16} color={colors.text} style={styles.infoIcon} />
            <Text style={[styles.infoText, { color: colors.text }]}>
              {selectedBranch?.city || 'Location not available'}
            </Text>
          </View>
          
          <View style={styles.infoItem}>
            <Ionicons name="restaurant-outline" size={16} color={colors.text} style={styles.infoIcon} />
            <Text style={[styles.infoText, { color: colors.text }]}>
              {restaurant.profile?.cuisine || 'Various Cuisine'}
            </Text>
          </View>
          
          <View style={styles.infoItem}>
            <Text style={[styles.priceText, { color: colors.text }]}>
              {restaurant.profile?.priceRange || '$$'}
            </Text>
          </View>
        </View>
        
        <View style={styles.divider} />
        
        <Text style={[styles.sectionTitle, { color: colors.text }]}>About</Text>
        <Text style={[styles.aboutText, { color: colors.text }]}>
          {restaurant.profile?.about || 'No description available for this restaurant.'}
        </Text>
        
        <View style={styles.divider} />
        
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Location</Text>
        {locationData ? (
          <TouchableOpacity 
            style={styles.locationContainer} 
            onPress={() => setShowMap(true)}
            activeOpacity={0.8}
          >
            <View style={styles.locationContent}>
              <Ionicons name="location-outline" size={20} color="#007AFF" />
              <View style={styles.locationTextContainer}>
                <Text style={styles.locationAddress}>
                  {locationData.branches[0]?.address || 'View location'}
                </Text>
                {locationData.branches[0]?.distance && (
                  <Text style={styles.locationDistance}>
                    {locationData.branches[0].distance.toFixed(1)} km away
                  </Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.loadingMapContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.loadingMapText}>Loading location information...</Text>
          </View>
        )}
        
        {showMap && (
          <Modal visible={showMap} animationType="slide">
            <RestaurantMap 
              branches={locationData?.branches || []} 
              restaurantName={locationData?.name || restaurant?.name || ''} 
              onClose={() => setShowMap(false)}
            />
          </Modal>
        )}
        
        <View style={styles.divider} />
        
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Booking Details</Text>
        
        <View style={styles.bookingDetails}>
          <View style={styles.bookingDetailItem}>
            <Ionicons name="calendar-outline" size={20} color={colors.text} style={styles.bookingIcon} />
            <Text style={[styles.bookingText, { color: colors.text }]}>
              {date ? format(new Date(date), 'MMM d, yyyy') : 'Select a date'}
            </Text>
          </View>
          
          <View style={styles.bookingDetailItem}>
            <Ionicons name="people-outline" size={20} color={colors.text} style={styles.bookingIcon} />
            <Text style={[styles.bookingText, { color: colors.text }]}>
              Party of {partySize || '2'}
            </Text>
          </View>
        </View>
        
        <Text style={[styles.timeSlotTitle, { color: colors.text }]}>Available Time Slots</Text>
        
        {selectedBranch?.slots && selectedBranch.slots.length > 0 ? (
          <View style={styles.timeSlots}>
            {selectedBranch.slots.map((slot, index) => {
              // Handle both string and TimeSlot types
              const timeValue = typeof slot === 'string' ? slot : slot.time;
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.timeSlot,
                    selectedTime === timeValue && { backgroundColor: colors.primary },
                    selectedTime !== timeValue && { borderColor: colors.border, borderWidth: 1 }
                  ]}
                  onPress={() => setSelectedTime(timeValue)}
                >
                  <Text
                    style={[
                      styles.timeSlotText,
                      { color: selectedTime === timeValue ? '#fff' : colors.text }
                    ]}
                  >
                    {formatTimeWithAMPM(timeValue)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <Text style={[styles.noTimeSlotsText, { color: colors.text }]}>
            No available time slots for the selected date
          </Text>
        )}
        
        <EhgezliButton
          title="Book Now"
          variant="ehgezli"
          onPress={handleBooking}
          loading={bookingMutation.isPending}
          disabled={!selectedTime || bookingMutation.isPending}
          style={styles.bookButton}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  errorButton: {
    minWidth: 150,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 20,
    padding: 8,
  },
  coverImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  content: {
    padding: 20,
  },
  restaurantName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 8,
  },
  infoIcon: {
    marginRight: 4,
  },
  infoText: {
    fontSize: 14,
  },
  priceText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  aboutText: {
    fontSize: 14,
    lineHeight: 20,
  },
  bookingDetails: {
    marginBottom: 16,
  },
  bookingDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  bookingIcon: {
    marginRight: 8,
  },
  bookingText: {
    fontSize: 16,
  },
  timeSlotTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  timeSlots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
  },
  timeSlot: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#f5f5f5',
  },
  timeSlotText: {
    fontSize: 14,
    fontWeight: '500',
  },
  noTimeSlotsText: {
    fontSize: 14,
    fontStyle: 'italic',
    marginBottom: 24,
  },
  bookButton: {
    marginTop: 8,
    marginBottom: 40,
  },
  locationContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  locationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  locationTextContainer: {
    flex: 1,
    marginLeft: 16,
  },
  locationAddress: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  locationDistance: {
    fontSize: 14,
    color: '#666',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 20,
    padding: 8,
  },
  mapPreviewContainer: {
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 16,
  },
  mapPreview: {
    height: 150,
    backgroundColor: '#f5f5f5',
  },
  viewMapText: {
    fontSize: 14,
    color: '#007bff',
    textAlign: 'center',
    paddingVertical: 8,
  },
  loadingMapContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  loadingMapText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  addressText: {
    fontSize: 14,
    color: '#333',
    padding: 16,
  },
  distanceBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#007bff',
    borderRadius: 10,
    padding: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  distanceText: {
    fontSize: 12,
    color: '#fff',
    marginLeft: 4,
  },
});
