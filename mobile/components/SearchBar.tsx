import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';

interface SearchBarProps {
  onSearch: (query: string) => void;
  initialValue?: string;
  placeholder?: string;
  debounceTime?: number;
  containerStyle?: ViewStyle;
}

export function SearchBar({
  onSearch,
  initialValue = '',
  placeholder = 'Search restaurants, cuisines or cities...',
  debounceTime = 300,
  containerStyle
}: SearchBarProps) {
  console.log('[SearchBar] rendering');
  const [searchQuery, setSearchQuery] = useState(initialValue);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Use Colors directly
  const colors = Colors;

  // Implement debounced search as mentioned in memories
  useEffect(() => {
    // Clear any existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set a new timer
    debounceTimerRef.current = setTimeout(() => {
      onSearch(searchQuery);
    }, debounceTime);

    // Cleanup function to clear the timer if the component unmounts
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery, debounceTime, onSearch]);

  const handleClear = () => {
    setSearchQuery('');
    onSearch('');
  };

  return (
    <View style={[
      styles.container, 
      containerStyle, 
      { 
        backgroundColor: colors.background,
        borderColor: colors.border 
      }
    ]}>
      <Ionicons name="search" size={20} color={colors.text} style={styles.searchIcon} />
      <TextInput
        style={[styles.input, { color: colors.text }]}
        placeholder={placeholder}
        placeholderTextColor="#999"
        value={searchQuery}
        onChangeText={setSearchQuery}
        returnKeyType="search"
      />
      {searchQuery.length > 0 && (
        <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
          <Ionicons name="close-circle" size={20} color={colors.text} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  clearButton: {
    padding: 4,
  },
});
