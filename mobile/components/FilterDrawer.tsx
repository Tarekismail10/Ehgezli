// Importing React and other required components, libraries, and styles from React Native and Expo.
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // For using icon components (in this case, a close icon)
import Colors from '../constants/Colors'; // Custom color constants based on your app's theme
import { EhgezliButton } from './EhgezliButton'; // Custom button component used in the footer

// Define the component's props interface using TypeScript.
// This describes what properties the FilterDrawer expects.
interface FilterDrawerProps {
  isVisible: boolean;                // Determines if the FilterDrawer should be displayed
  onClose: () => void;               // Function to call when the drawer is closed
  cityFilter: string;                // Current selected city filter value
  setCityFilter: (city: string) => void;       // Function to update the selected city
  cuisineFilter: string;             // Current selected cuisine filter value
  setCuisineFilter: (cuisine: string) => void; // Function to update the selected cuisine
  priceFilter: string;               // Current selected price filter value
  setPriceFilter: (price: string) => void;     // Function to update the selected price range
  distanceFilter: string;            // Current selected distance filter value
  setDistanceFilter: (distance: string) => void; // Function to update the selected distance range
  onApplyFilters: () => void;        // Function to apply filters and update the display (e.g., list of restaurants)
}

// Constants for available filters.
// CUISINES: list of cuisine options available for filtering.
const CUISINES = [
  "American",
  "Egyptian",
  "Italian",
  "Japanese",
  "Chinese",
  "Indian",
  "Mexican",
  "French",
  "Thai",
  "Mediterranean",
  "Lebanese",
];

// CITIES: list of cities available for filtering.
const CITIES = ["Cairo", "Alexandria"];
// PRICE_RANGES: different price ranges denoted by symbols.
const PRICE_RANGES = ["$", "$$", "$$$", "$$$$"];
// DISTANCE_RANGES: different distance ranges in kilometers
const DISTANCE_RANGES = ["1 km", "5 km", "10 km", "20 km"];

// Get screen dimensions for responsive sizing
const { height } = Dimensions.get('window');

// FilterDrawer component definition.
// Renders a drawer that includes filters for City, Cuisine, and Price Range.
export function FilterDrawer({
  isVisible,
  onClose,
  cityFilter,
  setCityFilter,
  cuisineFilter,
  setCuisineFilter,
  priceFilter,
  setPriceFilter,
  distanceFilter,
  setDistanceFilter,
  onApplyFilters
}: FilterDrawerProps) {
  // Use Colors directly
  const colors = Colors;

  // If the drawer is not visible, don't render anything.
  if (!isVisible) return null;

  // Reset function that resets all the filters to their default state ('all').
  const handleReset = () => {
    setCityFilter('all');
    setCuisineFilter('all');
    setPriceFilter('all');
    setDistanceFilter('all');
    
    // Apply the reset filters immediately
    onApplyFilters();
  };

  return (
    // Main container view for the FilterDrawer with a semi-transparent background overlay
    <View style={styles.modalOverlay}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        
        {/* Header section containing the title and close button */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>Filters</Text>
          
          {/* Close button wrapped in TouchableOpacity */}
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Scrollable section containing filter options */}
        <ScrollView style={styles.content}>
          {/* City Filter Section */}
          <View style={styles.filterSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>City</Text>
            <View style={styles.optionsGrid}>
              {/* "All" option for city filter */}
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  // If "all" is selected, change button background to highlight selection.
                  cityFilter === 'all' && { backgroundColor: colors.primary }
                ]}
                onPress={() => setCityFilter('all')}
              >
                <Text 
                  style={[
                    styles.optionText, 
                    cityFilter === 'all' && styles.selectedOptionText
                  ]}
                >
                  All
                </Text>
              </TouchableOpacity>

              {/* Render city options using the CITIES array */}
              {CITIES.map((city) => (
                <TouchableOpacity
                  key={city}
                  style={[
                    styles.optionButton,
                    cityFilter === city && { backgroundColor: colors.primary }
                  ]}
                  onPress={() => setCityFilter(city === cityFilter ? 'all' : city)}
                >
                  <Text 
                    style={[
                      styles.optionText, 
                      cityFilter === city && styles.selectedOptionText
                    ]}
                  >
                    {city}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Distance Filter Section */}
          <View style={styles.filterSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Distance</Text>
            <View style={styles.optionsGrid}>
              {/* "All" option for distance filter */}
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  distanceFilter === 'all' && { backgroundColor: colors.primary }
                ]}
                onPress={() => setDistanceFilter('all')}
              >
                <Text 
                  style={[
                    styles.optionText, 
                    distanceFilter === 'all' && styles.selectedOptionText
                  ]}
                >
                  All
                </Text>
              </TouchableOpacity>

              {/* Render distance range options */}
              {DISTANCE_RANGES.map((distance) => (
                <TouchableOpacity
                  key={distance}
                  style={[
                    styles.optionButton,
                    distanceFilter === distance && { backgroundColor: colors.primary }
                  ]}
                  onPress={() => setDistanceFilter(distance === distanceFilter ? 'all' : distance)}
                >
                  <Text 
                    style={[
                      styles.optionText, 
                      distanceFilter === distance && styles.selectedOptionText
                    ]}
                  >
                    {distance}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Cuisine Filter Section */}
          <View style={styles.filterSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Cuisine</Text>
            <View style={styles.optionsGrid}>
              {/* "All" option for cuisine filter */}
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  cuisineFilter === 'all' && { backgroundColor: colors.primary }
                ]}
                onPress={() => setCuisineFilter('all')}
              >
                <Text 
                  style={[
                    styles.optionText, 
                    cuisineFilter === 'all' && styles.selectedOptionText
                  ]}
                >
                  All
                </Text>
              </TouchableOpacity>

              {/* Render cuisine options using the CUISINES array */}
              {CUISINES.map((cuisine) => (
                <TouchableOpacity
                  key={cuisine}
                  style={[
                    styles.optionButton,
                    cuisineFilter === cuisine && { backgroundColor: colors.primary }
                  ]}
                  onPress={() => setCuisineFilter(cuisine === cuisineFilter ? 'all' : cuisine)}
                >
                  <Text 
                    style={[
                      styles.optionText, 
                      cuisineFilter === cuisine && styles.selectedOptionText
                    ]}
                  >
                    {cuisine}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Price Range Filter Section */}
          <View style={styles.filterSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Price Range</Text>
            <View style={styles.optionsGrid}>
              {/* "All" option for price filter */}
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  priceFilter === 'all' && { backgroundColor: colors.primary }
                ]}
                onPress={() => setPriceFilter('all')}
              >
                <Text 
                  style={[
                    styles.optionText, 
                    priceFilter === 'all' && styles.selectedOptionText
                  ]}
                >
                  All
                </Text>
              </TouchableOpacity>

              {/* Render price range options using the PRICE_RANGES array */}
              {PRICE_RANGES.map((price) => (
                <TouchableOpacity
                  key={price}
                  style={[
                    styles.optionButton,
                    priceFilter === price && { backgroundColor: colors.primary }
                  ]}
                  onPress={() => setPriceFilter(price === priceFilter ? 'all' : price)}
                >
                  <Text 
                    style={[
                      styles.optionText, 
                      priceFilter === price && styles.selectedOptionText
                    ]}
                  >
                    {price}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>

        {/* Footer containing reset and apply buttons */}
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          {/* Reset button: resets all filters to default when pressed */}
          <EhgezliButton
            title="Reset"
            variant="outline"
            onPress={handleReset}
            style={styles.footerButton}
          />
          {/* Apply Filters button: applies the selected filters and closes the drawer */}
          <EhgezliButton
            title="Apply Filters"
            variant="ehgezli"
            onPress={() => {
              onApplyFilters();
              onClose();
            }}
            style={styles.footerButton}
          />
        </View>
      </View>
    </View>
  );
}

// StyleSheet definitions for component styling.
const styles = StyleSheet.create({
  // Container for the entire FilterDrawer component.
  container: {
    height: height * 0.7, // Limit height to 70% of screen height
    marginTop: 'auto', // Push to bottom of screen
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent background
    justifyContent: 'flex-end',
  },
  // Header styling containing the filter title and navigation buttons.
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  // Title text styling for the header.
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Styling for the close button.
  closeButton: {
    padding: 4,
  },
  // Scrollable content area where filter options are rendered.
  content: {
    flex: 1,
    padding: 16,
  },
  // General styling for each filter section (City, Cuisine, Price).
  filterSection: {
    marginBottom: 20,
  },
  // Section title styling inside each filter section.
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  // Grid style for options, enabling wrapping if they overflow horizontally.
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  // Styling for each individual option button.
  optionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    margin: 4,
  },
  // Text styling for options.
  optionText: {
    fontSize: 14,
  },
  // Text styling for selected options.
  selectedOptionText: {
    color: '#fff',
    fontWeight: '500',
  },
  // Footer area styling containing the action buttons.
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
  },
  // Styling for individual buttons in the footer.
  footerButton: {
    flex: 1,
    marginHorizontal: 8,
  },
});
