import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { restaurantProfileSchema, type InsertRestaurantProfile } from "@shared/schema";
import { useRestaurantAuth } from "@/hooks/use-restaurant-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Plus, Trash2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const CUISINE_TYPES = [
  "Italian",
  "Chinese",
  "Japanese",
  "Indian",
  "Mexican",
  "French",
  "Thai",
  "Mediterranean",
  "American",
  "Middle Eastern",
];

export default function RestaurantProfileSetup() {
  const { restaurant } = useRestaurantAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm<InsertRestaurantProfile>({
    resolver: zodResolver(restaurantProfileSchema),
    defaultValues: {
      restaurantId: restaurant?.id,
      about: "",
      cuisine: "",
      priceRange: "$",
      branches: [
        {
          address: "",
          tablesCount: 1,
          seatsCount: 1,
          openingTime: "09:00",
          closingTime: "22:00",
        },
      ],
    },
  });

  const profileMutation = useMutation({
    mutationFn: async (data: InsertRestaurantProfile) => {
      const res = await apiRequest("POST", "/api/restaurant/profile", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Profile Setup Complete!",
        description: "Your restaurant profile has been created successfully.",
      });
      // Redirect to the restaurant's dashboard using their ID
      setLocation(`/restaurant/${restaurant?.id}/dashboard`);
    },
    onError: (error: Error) => {
      toast({
        title: "Setup Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const addBranch = () => {
    const currentBranches = form.getValues("branches");
    form.setValue("branches", [
      ...currentBranches,
      {
        address: "",
        tablesCount: 1,
        seatsCount: 1,
        openingTime: "09:00",
        closingTime: "22:00",
      },
    ]);
  };

  const removeBranch = (index: number) => {
    const currentBranches = form.getValues("branches");
    form.setValue(
      "branches",
      currentBranches.filter((_, i) => i !== index)
    );
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Complete Your Restaurant Profile</h1>
          <Progress value={33} className="w-full" />
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((data) => profileMutation.mutate(data))}
            className="space-y-6"
          >
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="about"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>About Your Restaurant</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Tell us about your restaurant..."
                          className="min-h-[150px]"
                        />
                      </FormControl>
                      <FormDescription>
                        Maximum 50 words allowed
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cuisine"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cuisine Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select cuisine type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CUISINE_TYPES.map((cuisine) => (
                            <SelectItem key={cuisine} value={cuisine}>
                              {cuisine}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="priceRange"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price Range</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select price range" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="$">$ (Budget)</SelectItem>
                          <SelectItem value="$$">$$ (Moderate)</SelectItem>
                          <SelectItem value="$$$">$$$ (Expensive)</SelectItem>
                          <SelectItem value="$$$$">$$$$ (Luxury)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Branch Locations</CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addBranch}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Branch
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                {form.watch("branches").map((_, index) => (
                  <div key={index} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold">
                        Branch {index + 1}
                      </h4>
                      {index > 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeBranch(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <FormField
                      control={form.control}
                      name={`branches.${index}.address`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Branch address" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name={`branches.${index}.tablesCount`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Number of Tables</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                onChange={(e) =>
                                  field.onChange(parseInt(e.target.value))
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`branches.${index}.seatsCount`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Number of Seats</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                onChange={(e) =>
                                  field.onChange(parseInt(e.target.value))
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name={`branches.${index}.openingTime`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Opening Time</FormLabel>
                            <FormControl>
                              <Input type="time" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`branches.${index}.closingTime`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Closing Time</FormLabel>
                            <FormControl>
                              <Input type="time" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Button
              type="submit"
              className="w-full"
              disabled={profileMutation.isPending}
            >
              {profileMutation.isPending ? "Saving..." : "Save & Continue"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}