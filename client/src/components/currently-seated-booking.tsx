import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { formatElapsedTime } from "@/lib/utils/time-utils";

interface BookingWithDetails {
  id: number;
  branchId: number;
  date: string;
  partySize: number;
  confirmed: boolean;
  arrived: boolean;
  completed: boolean;
  arrivedAt?: string;
  user?: {
    firstName: string;
    lastName: string;
  } | null;
  branch: {
    address: string;
    city: string;
  };
}

interface CurrentlySeatedBookingProps {
  booking: BookingWithDetails;
  onMarkComplete: (bookingId: number) => void;
  isMarkingComplete: boolean;
}

export function CurrentlySeatedBooking({ 
  booking,
  onMarkComplete,
  isMarkingComplete
}: CurrentlySeatedBookingProps) {
  const [elapsedTime, setElapsedTime] = useState(
    booking.date ? formatElapsedTime(booking.date) : ''
  );

  useEffect(() => {
    if (!booking.date) return;

    const timer = setInterval(() => {
      setElapsedTime(formatElapsedTime(booking.date));
    }, 1000);

    return () => clearInterval(timer);
  }, [booking.date]);

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
      <div>
        <div className="font-medium">
          {booking.user ?
            `${booking.user.firstName} ${booking.user.lastName}` :
            `Guest Booking #${booking.id}`
          }
        </div>
        <div className="text-sm text-muted-foreground">
          Booking Started: {booking.date ? format(new Date(booking.date), "h:mm:ss a") : 'Unknown'}
        </div>
        {booking.date && (
          <div className="text-sm font-medium text-primary">
            Time Elapsed: {elapsedTime}
          </div>
        )}
        <div className="text-sm">
          Party size: {booking.partySize}
        </div>
        <div className="text-sm text-muted-foreground">
          Branch: {booking.branch.address}, {booking.branch.city}
        </div>
      </div>
      <div className="flex items-center">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (window.confirm('Are you sure you want to mark this booking as complete?')) {
              onMarkComplete(booking.id);
            }
          }}
          disabled={isMarkingComplete}
          className="text-primary hover:text-primary-foreground hover:bg-primary"
        >
          Booking Over
        </Button>
      </div>
    </div>
  );
}