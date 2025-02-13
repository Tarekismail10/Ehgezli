import { pgTable, text, serial, integer, timestamp, boolean, jsonb, time } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Add loginSchema for authentication
export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Add restaurantLoginSchema for restaurant authentication
export const restaurantLoginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  gender: text("gender").notNull(),
  age: integer("age").notNull(),
  birthday: timestamp("birthday").notNull(),
  city: text("city").notNull(),
  favoriteCuisines: text("favorite_cuisines").array().notNull(),
});

export const restaurantAuth = pgTable("restaurant_auth", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  verified: boolean("verified").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Define Location type first, before the restaurant schema
export type Location = {
  address: string;
  tablesCount: number;
  openingTime: string;
  closingTime: string;
  city: "Alexandria" | "Cairo";
};

export const restaurants = pgTable("restaurants", {
  id: serial("id").primaryKey(),
  authId: integer("auth_id").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  about: text("about").notNull(),
  logo: text("logo").notNull(),
  cuisine: text("cuisine").notNull(),
  locations: jsonb("locations").notNull().$type<Location[]>(),
});

export const restaurantProfiles = pgTable("restaurant_profiles", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").notNull().unique(),
  about: text("about").notNull(),
  cuisine: text("cuisine").notNull(),
  priceRange: text("price_range").notNull(),
  logo: text("logo").notNull().default(""), // Add logo field
  isProfileComplete: boolean("is_profile_complete").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const restaurantBranches = pgTable("restaurant_branches", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").notNull(),
  address: text("address").notNull(),
  tablesCount: integer("tables_count").notNull(),
  seatsCount: integer("seats_count").notNull(),
  openingTime: text("opening_time").notNull(),
  closingTime: text("closing_time").notNull(),
});

export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  branchId: integer("branch_id").notNull(),
  date: timestamp("date").notNull(),
  partySize: integer("party_size").notNull(),
  confirmed: boolean("confirmed").notNull().default(false),
});

export const insertUserSchema = createInsertSchema(users).omit({ 
  id: true 
}).extend({
  password: z.string().min(6, "Password must be at least 6 characters"),
  favoriteCuisines: z.array(z.string()).min(1, "Select at least one cuisine").max(3, "Maximum 3 cuisines allowed"),
  birthday: z.string()
    .refine((date) => !isNaN(new Date(date).getTime()), {
      message: "Invalid date format"
    })
    .transform((date) => new Date(date)),
  city: z.enum(["Alexandria", "Cairo"], {
    required_error: "Please select a city",
    invalid_type_error: "Please select a valid city"
  })
});

export const insertRestaurantAuthSchema = createInsertSchema(restaurantAuth).omit({ 
  id: true,
  verified: true,
  createdAt: true
}).extend({
  password: z.string().min(6, "Password must be at least 6 characters"),
  email: z.string().email("Invalid email format")
});

export const insertRestaurantSchema = createInsertSchema(restaurants).omit({ 
  id: true 
}).extend({
  about: z.string().max(100),
  locations: z.array(z.object({
    address: z.string(),
    tablesCount: z.number(),
    openingTime: z.string(),
    closingTime: z.string(),
    city: z.enum(["Alexandria", "Cairo"])
  }))
});

export const insertBranchSchema = createInsertSchema(restaurantBranches).omit({ 
  id: true 
});

export const insertBookingSchema = createInsertSchema(bookings).omit({ 
  id: true,
  confirmed: true
});

// Schema for restaurant profile setup
export const restaurantProfileSchema = createInsertSchema(restaurantProfiles).omit({ 
  id: true,
  isProfileComplete: true,
  createdAt: true,
  updatedAt: true
}).extend({
  logo: z.string(),
  about: z.string()
    .min(1, "About section is required")
    .refine((val) => val.trim().split(/\s+/).length <= 50, {
      message: "About section must not exceed 50 words"
    }),
  cuisine: z.string().min(1, "Cuisine type is required"),
  priceRange: z.enum(["$", "$$", "$$$", "$$$$"], {
    required_error: "Price range is required",
  }),
  branches: z.array(z.object({
    address: z.string().min(1, "Address is required"),
    city: z.enum(["Alexandria", "Cairo"], {
      required_error: "City is required",
      invalid_type_error: "Please select a valid city"
    }),
    tablesCount: z.number().min(1, "Must have at least 1 table"),
    seatsCount: z.number().min(1, "Must have at least 1 seat"),
    openingTime: z.string().min(1, "Opening time is required"),
    closingTime: z.string().min(1, "Closing time is required"),
  })).min(1, "At least one branch is required"),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertRestaurantAuth = z.infer<typeof insertRestaurantAuthSchema>;
export type User = typeof users.$inferSelect;
export type RestaurantAuth = typeof restaurantAuth.$inferSelect;
export type Restaurant = typeof restaurants.$inferSelect;
export type RestaurantBranch = typeof restaurantBranches.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type RestaurantProfile = typeof restaurantProfiles.$inferSelect;
export type InsertRestaurantProfile = z.infer<typeof restaurantProfileSchema>;

export const mockRestaurants: Restaurant[] = [];