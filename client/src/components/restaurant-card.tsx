import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Restaurant } from "@shared/schema";
import { Link } from "wouter";
import { MapPin, DollarSign } from "lucide-react";

interface RestaurantBranchCardProps {
  restaurant: Restaurant;
  branchIndex: number;
}

export function RestaurantCard({ restaurant, branchIndex }: RestaurantBranchCardProps) {
  const branch = restaurant.locations?.[branchIndex];
  if (!branch) return null;

  return (
    <Card className="overflow-hidden">
      <div className="h-48 bg-muted flex items-center justify-center">
        {restaurant.logo ? (
          <img
            src={restaurant.logo}
            alt={`${restaurant.name} logo`}
            className="h-full w-full object-contain p-4"
          />
        ) : (
          <div className="text-muted-foreground">No logo available</div>
        )}
      </div>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{restaurant.name}</span>
        </CardTitle>
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-muted-foreground">{restaurant.cuisine} Cuisine</p>
          <div className="flex items-center text-muted-foreground">
            <DollarSign className="h-4 w-4 mr-1" />
            <span className="text-sm">{restaurant.priceRange}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4">{restaurant.description}</p>
        <div className="space-y-2">
          <div className="flex items-center text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 mr-1" />
            <span>{branch.address}</span>
          </div>
          <p className="text-sm font-medium">City: {branch.city}</p>
          <p className="text-sm">Tables: {branch.tablesCount}</p>
          <p className="text-sm">Opening Hours: {branch.openingTime} - {branch.closingTime}</p>
        </div>
      </CardContent>
      <CardFooter>
        <Button asChild className="w-full">
          <Link to={`/restaurant/${restaurant.id}?branch=${branchIndex}`}>
            Book a Table
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}