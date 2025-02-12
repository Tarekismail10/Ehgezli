import { RestaurantGrid } from "@/components/restaurant-grid";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { SearchBar } from "@/components/SearchBar";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function HomePage() {
  const { user, logoutMutation } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState<string | null>(null);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-orange-400 text-transparent bg-clip-text">
            Ehgezli
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Welcome, {user?.username}
            </span>
            <Button
              variant="outline"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
            >
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-orange-600 to-orange-400 text-transparent bg-clip-text">
            Find Your Perfect Table
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Discover and book tables at the finest restaurants in your area.
            Experience exceptional dining with just a few clicks.
          </p>
          <div className="flex gap-4 items-center justify-center mb-4">
            <SearchBar onSearch={handleSearch} placeholder="Search by name, cuisine, or location..." />
            <Select
              value={selectedCity || undefined}
              onValueChange={(value) => setSelectedCity(value || null)}
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
          </div>
        </div>

        <div className="mb-8 flex justify-between items-center">
          <h3 className="text-2xl font-semibold">
            {selectedCity && selectedCity !== 'all' ? `Restaurants in ${selectedCity}` : 'Available Restaurants'}
          </h3>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm">
              Filter
            </Button>
            <Button variant="secondary" size="sm">
              Sort
            </Button>
          </div>
        </div>

        <RestaurantGrid searchQuery={searchQuery} cityFilter={selectedCity === 'all' ? undefined : selectedCity} />
      </main>

      <footer className="mt-16 border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2024 Ehgezli. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}