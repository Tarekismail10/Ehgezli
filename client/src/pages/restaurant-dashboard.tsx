import { useRestaurantAuth } from "@/hooks/use-restaurant-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Booking, Restaurant } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, LogOut, Settings, CalendarIcon, Clock } from "lucide-react";
import { format, isSameDay, parseISO, setHours, setMinutes } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AddReservationModal } from "@/components/add-reservation-modal";

interface BookingWithDetails extends Booking {
  user?: {
    firstName: string;
    lastName: string;
  } | null;
  branch: {
    address: string;
    city: string;
  };
}

const generateTimeSlots = (openingTime: string | undefined, closingTime: string | undefined, bookingDate?: Date) => {
  if (!openingTime || !closingTime) return [];

  const slots = [];
  const [openHour, openMinute] = openingTime.split(':').map(Number);
  const [closeHour, closeMinute] = closingTime.split(':').map(Number);

  let startHour = openHour;
  let startMinute = openMinute;

  // If booking is for today, start from current time
  const now = new Date();
  if (bookingDate &&
      bookingDate.getDate() === now.getDate() &&
      bookingDate.getMonth() === now.getMonth() &&
      bookingDate.getFullYear() === now.getFullYear()) {
    startHour = now.getHours();
    startMinute = now.getMinutes();

    // Round up to the next 30-minute slot
    if (startMinute > 30) {
      startHour += 1;
      startMinute = 0;
    } else if (startMinute > 0) {
      startMinute = 30;
    }

    // If current time is after opening time, use current time
    if (startHour < openHour || (startHour === openHour && startMinute < openMinute)) {
      startHour = openHour;
      startMinute = openMinute;
    }
  }

  let lastSlotHour = closeHour;
  let lastSlotMinute = closeMinute;

  // Ensure we don't allow bookings in the last hour of operation
  lastSlotHour = lastSlotHour - 1;

  for (let hour = startHour; hour <= lastSlotHour; hour++) {
    for (let minute of [0, 30]) {
      // Skip slots before opening time
      if (hour === openHour && minute < openMinute) continue;
      // Skip slots after closing time
      if (hour === lastSlotHour && minute > lastSlotMinute) continue;
      // Skip slots before current time for today's bookings
      if (hour === startHour && minute < startMinute) continue;

      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      slots.push(time);
    }
  }
  return slots;
};

export default function RestaurantDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { restaurant: auth, logoutMutation } = useRestaurantAuth();
  const [selectedBranchId, setSelectedBranchId] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>("all");
  const [timeSlots, setTimeSlots] = useState<string[]>([]);

  const { data: restaurant, isLoading: isRestaurantLoading } = useQuery<Restaurant>({
    queryKey: ["/api/restaurants", auth?.id],
    queryFn: async () => {
      if (!auth?.id) throw new Error("No restaurant ID");
      const response = await fetch(`/api/restaurants/${auth.id}`);
      if (!response.ok) throw new Error('Failed to fetch restaurant');
      return response.json();
    },
    enabled: !!auth?.id,
  });

  const { data: branches, isLoading: isBranchesLoading } = useQuery({
    queryKey: ["/api/restaurants", auth?.id, "branches"],
    queryFn: async () => {
      if (!auth?.id) throw new Error("No restaurant ID");
      const response = await fetch(`/api/restaurants/${auth.id}/branches`);
      if (!response.ok) throw new Error('Failed to fetch branches');
      return response.json();
    },
    enabled: !!auth?.id,
  });

  const { data: bookings, isLoading: isBookingsLoading } = useQuery<BookingWithDetails[]>({
    queryKey: ["/api/restaurant/bookings", auth?.id],
    queryFn: async () => {
      if (!auth?.id) throw new Error("No restaurant ID");
      const response = await fetch(`/api/restaurant/bookings/${auth.id}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch bookings');
      }
      return response.json();
    },
    enabled: !!auth?.id,
  });

  const cancelBookingMutation = useMutation({
    mutationFn: async (bookingId: number) => {
      const response = await fetch(`/api/restaurant/bookings/${bookingId}/cancel`, {
        method: 'POST',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to cancel booking');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurant/bookings", auth?.id] });
      toast({
        title: "Booking Cancelled",
        description: "The booking has been cancelled successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const { data: availableSeats, isLoading: isAvailableSeatsLoading } = useQuery({
    queryKey: ["/api/restaurant/available-seats", selectedBranchId, selectedDate, selectedTime],
    queryFn: async () => {
      if (selectedBranchId === "all" || !selectedDate || selectedTime === "all") {
        return null;
      }

      const branch = restaurant?.locations?.find(loc => loc.id.toString() === selectedBranchId);
      if (!branch) return null;

      const [hours, minutes] = selectedTime.split(':').map(Number);
      const dateTime = new Date(selectedDate);
      dateTime.setHours(hours, minutes);

      const response = await fetch(`/api/restaurants/availability/${branch.id}?date=${dateTime.toISOString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch available seats');
      }
      return response.json();
    },
    enabled: !!restaurant?.id && selectedBranchId !== "all" && !!selectedDate && selectedTime !== "all",
  });

  const isLoading = isRestaurantLoading || isBookingsLoading || isBranchesLoading || isAvailableSeatsLoading;

  useEffect(() => {
    if (selectedBranchId === "all") {
      setTimeSlots([]); // Clear time slots when no specific branch is selected
      return;
    }

    const selectedBranch = restaurant?.locations?.find(loc => loc.id.toString() === selectedBranchId);
    if (selectedBranch) {
      const slots = generateTimeSlots(selectedBranch.openingTime, selectedBranch.closingTime, selectedDate);
      setTimeSlots(slots);
      // Reset selected time if it's not in the new slots
      if (selectedTime !== "all" && !slots.includes(selectedTime)) {
        setSelectedTime("all");
      }
    }
  }, [selectedBranchId, selectedDate, restaurant?.locations]);


  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  const filteredBookings = bookings?.filter(booking => {
    if (selectedBranchId !== "all") {
      const branch = restaurant?.locations?.find(loc => loc.id.toString() === selectedBranchId);
      if (!branch) return false;
      if (booking.branch.address !== branch.address) {
        return false;
      }
    }

    if (selectedDate && !isSameDay(new Date(booking.date), selectedDate)) {
      return false;
    }

    if (selectedTime !== "all") {
      const bookingTime = format(new Date(booking.date), 'HH:mm');
      if (bookingTime !== selectedTime) {
        return false;
      }
    }

    return true;
  }) || [];

  const now = new Date();
  const upcomingBookings = filteredBookings
    .filter(booking => new Date(booking.date) >= now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const getTotalSeats = () => {
    if (selectedBranchId === "all") {
      return restaurant?.locations?.reduce((sum, loc) => sum + loc.seatsCount, 0) || 0;
    }
    const branch = restaurant?.locations?.find(loc => loc.id.toString() === selectedBranchId);
    return branch?.seatsCount || 0;
  };

  const getActualBranchId = (address: string) => {
    const branch = restaurant?.locations?.find(loc => loc.address === address);
    return branch ? branch.id : undefined;
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Restaurant Dashboard</h1>
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              Welcome back, {auth?.name}
            </div>
            <Button
              variant="outline"
              asChild
            >
              <Link to="/restaurant/profile">
                <Settings className="h-4 w-4 mr-2" />
                My Restaurant
              </Link>
            </Button>
            <Button
              variant="outline"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        <div className="flex justify-end gap-4 mb-4">
          <AddReservationModal 
            branches={branches || []}
            selectedBranchId={selectedBranchId === "all" ? undefined : parseInt(selectedBranchId)}
          />
          <Select
            value={selectedBranchId}
            onValueChange={setSelectedBranchId}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select Branch" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              {restaurant?.locations?.map((location) => (
                <SelectItem key={location.id} value={location.id.toString()}>
                  {location.address}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[200px] justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Select
            value={selectedTime}
            onValueChange={setSelectedTime}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select Time">
                <div className="flex items-center">
                  <Clock className="mr-2 h-4 w-4" />
                  {selectedTime === "all" ? "Select Time" : selectedTime}
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Times</SelectItem>
              {selectedBranchId === "all" ? (
                <SelectItem value="select-branch" disabled>
                  Select a branch first
                </SelectItem>
              ) : timeSlots.length > 0 ? (
                timeSlots.map((time) => (
                  <SelectItem key={time} value={time}>
                    {time}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="no-slots" disabled>
                  No available time slots
                </SelectItem>
              )}
            </SelectContent>
          </Select>

          {(selectedDate || selectedTime !== "all") && (
            <Button 
              variant="ghost" 
              onClick={() => {
                setSelectedDate(undefined);
                setSelectedTime("all");
              }}
              className="px-3"
            >
              Clear filters
            </Button>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Bookings</CardTitle>
              <p className="text-sm text-muted-foreground">
                {selectedBranchId === "all" && !selectedDate && selectedTime === "all" && "Total bookings"}
                {selectedBranchId !== "all" && !selectedDate && selectedTime === "all" && `Bookings at ${restaurant?.locations?.find(loc => loc.id.toString() === selectedBranchId)?.address}`}
                {selectedDate && selectedBranchId === "all" && selectedTime === "all" && `Bookings on ${format(selectedDate, "MMMM d, yyyy")}`}
                {selectedDate && selectedBranchId !== "all" && selectedTime === "all" && 
                  `Bookings at ${restaurant?.locations?.find(loc => loc.id.toString() === selectedBranchId)?.address} on ${format(selectedDate, "MMMM d, yyyy")}`}
                {selectedTime !== "all" && `Bookings at ${selectedTime}${selectedDate ? ` on ${format(selectedDate, "MMMM d, yyyy")}` : ''}`}
              </p>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {filteredBookings.length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Total Seats</CardTitle>
              <p className="text-sm text-muted-foreground">
                {selectedBranchId === "all" ? "Across all branches" : `At ${restaurant?.locations?.find(loc => loc.id.toString() === selectedBranchId)?.address}`}
              </p>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {getTotalSeats()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Available Seats</CardTitle>
              <p className="text-sm text-muted-foreground">
                {selectedBranchId === "all" || !selectedDate || selectedTime === "all" 
                  ? "Select branch, date, and time to view availability"
                  : `At ${restaurant?.locations?.find(loc => loc.id.toString() === selectedBranchId)?.address} on ${format(selectedDate, "MMMM d, yyyy")} at ${selectedTime}`}
              </p>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {isAvailableSeatsLoading ? (
                  <Loader2 className="h-8 w-8 animate-spin" />
                ) : availableSeats ? (
                  availableSeats.availableSeats
                ) : (
                  "—"
                )}
              </div>
              {availableSeats && (
                <p className="text-sm text-muted-foreground mt-2">
                  {availableSeats.existingBookings} current {availableSeats.existingBookings === 1 ? 'booking' : 'bookings'} in this time slot
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>Latest Bookings</CardTitle>
            {selectedDate && (
              <span className="text-sm text-muted-foreground">
                Showing bookings for {format(selectedDate, "MMMM d, yyyy")}
              </span>
            )}
          </CardHeader>
          <CardContent>
            {upcomingBookings && upcomingBookings.length > 0 ? (
              <div className="space-y-4">
                {upcomingBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <div className="font-medium">
                        {booking.user ?
                          `${booking.user.firstName} ${booking.user.lastName}` :
                          `Guest Booking #${booking.id}`
                        }
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(booking.date), "EEEE, MMMM d, yyyy 'at' h:mm a")}
                      </div>
                      <div className="text-sm">
                        Party size: {booking.partySize}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Branch: {booking.branch.address}, {booking.branch.city}
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        if (window.confirm('Are you sure you want to cancel this booking?')) {
                          cancelBookingMutation.mutate(booking.id);
                        }
                      }}
                      disabled={!booking.confirmed || cancelBookingMutation.isPending}
                    >
                      {booking.confirmed ? "Cancel Booking" : "Cancelled"}
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {selectedDate ? "No bookings for this date" : "No upcoming bookings"}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}