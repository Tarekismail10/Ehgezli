import { useRestaurantAuth } from "@/hooks/use-restaurant-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

export function ProtectedRestaurantRoute({
  path,
  component: Component,
  requiresProfile = true,
}: {
  path: string;
  component: () => React.JSX.Element;
  requiresProfile?: boolean;
}) {
  const { restaurant, isLoading } = useRestaurantAuth();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </Route>
    );
  }

  if (!restaurant) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  return <Route path={path} component={Component} />;
}
