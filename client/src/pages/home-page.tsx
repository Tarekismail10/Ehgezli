import { RestaurantGrid } from "@/components/restaurant-grid";
import { UserNav } from "@/components/user-nav";
import { SearchBar } from "@/components/SearchBar";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  "Middle Eastern"
];

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState<string | undefined>(undefined);
  const [selectedCuisine, setSelectedCuisine] = useState<string | undefined>(undefined);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary">
            Ehgezli
          </h1>
          <UserNav />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h2 className="text-4xl font-bold mb-4 text-primary">
            Find Your Perfect Table
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Discover and book tables at the finest restaurants in your area.
            Experience exceptional dining with just a few clicks.
          </p>
          <div className="flex gap-4 items-center justify-center mb-4">
            <SearchBar onSearch={handleSearch} placeholder="Search by name, cuisine, or location..." />
            <Select
              value={selectedCity}
              onValueChange={setSelectedCity}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select city" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                <SelectItem value="Alexandria">Alexandria</SelectItem>
                <SelectItem value="Cairo">Cairo</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={selectedCuisine}
              onValueChange={setSelectedCuisine}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select cuisine" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cuisines</SelectItem>
                {CUISINES.map((cuisine) => (
                  <SelectItem key={cuisine} value={cuisine}>{cuisine}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-2xl font-semibold">
            {selectedCity && selectedCity !== 'all' 
              ? `Restaurants in ${selectedCity}${selectedCuisine && selectedCuisine !== 'all' ? ` - ${selectedCuisine} Cuisine` : ''}`
              : selectedCuisine && selectedCuisine !== 'all'
                ? `${selectedCuisine} Restaurants`
                : 'Available Restaurants'
            }
          </h3>
        </div>

        <RestaurantGrid 
          searchQuery={searchQuery} 
          cityFilter={selectedCity === 'all' ? undefined : selectedCity}
          cuisineFilter={selectedCuisine === 'all' ? undefined : selectedCuisine}
        />
      </main>

      <footer className="mt-16 border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2024 Ehgezli. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}