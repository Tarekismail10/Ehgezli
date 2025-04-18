import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Menu, HomeIcon, CalendarDaysIcon, LogOut, Settings } from "lucide-react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  type?: 'user' | 'restaurant';
  password: string;
  gender: string;
  birthday: Date;
  city: string;
  favoriteCuisines: string[];
}

export function UserNav() {
  const { user, logoutMutation } = useAuth();

  if (!user) return null;

  const currentUser = user as User;

  return (
    <Drawer direction="left">
      <DrawerTrigger asChild>
        <Button variant="ghost" size="icon">
          <Menu className="h-6 w-6" />
        </Button>
      </DrawerTrigger>
      <DrawerContent className="left-0 right-auto h-full" side="left">
        <div className="h-full flex flex-col">
          <DrawerHeader>
            <DrawerTitle>Menu</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 flex-1">
            <div className="space-y-2">
              <Button asChild variant="ghost" className="w-full justify-start">
                <Link href="/">
                  <HomeIcon className="mr-2 h-4 w-4" />
                  Home
                </Link>
              </Button>
              {currentUser.type === 'restaurant' ? (
                <>
                  <Button asChild variant="ghost" className="w-full justify-start">
                    <Link href="/restaurant/profile">
                      <Settings className="h-4 w-4 mr-2" />
                      My Restaurant
                    </Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild variant="ghost" className="w-full justify-start">
                    <Link href="/bookings">
                      <CalendarDaysIcon className="mr-2 h-4 w-4" />
                      My Bookings
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </div>
          <div className="p-4 mt-auto border-t">
            <Button
              variant="ghost"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {logoutMutation.isPending ? "Logging out..." : "Logout"}
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}