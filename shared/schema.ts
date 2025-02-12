import { pgTable, text, serial, integer, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
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

export const restaurants = pgTable("restaurants", {
  id: serial("id").primaryKey(),
  authId: integer("auth_id").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  about: text("about").notNull(),
  logo: text("logo").notNull(),
  cuisine: text("cuisine").notNull(),
  locations: jsonb("locations").notNull().default([]).array(),
});

export const restaurantBranches = pgTable("restaurant_branches", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").notNull(),
  address: text("address").notNull(),
  capacity: integer("capacity").notNull(),
  tablesCount: integer("tables_count").notNull(),
  openingTime: text("opening_time").notNull(),
  closingTime: text("closing_time").notNull(),
  reservationDuration: integer("reservation_duration").notNull(),
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
    .transform((date) => new Date(date))
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
    capacity: z.number(),
    tablesCount: z.number(),
    openingTime: z.string(),
    closingTime: z.string(),
    reservationDuration: z.number()
  }))
});

export const insertBranchSchema = createInsertSchema(restaurantBranches).omit({ 
  id: true 
});

export const insertBookingSchema = createInsertSchema(bookings).omit({ 
  id: true,
  confirmed: true
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertRestaurantAuth = z.infer<typeof insertRestaurantAuthSchema>;
export type User = typeof users.$inferSelect;
export type RestaurantAuth = typeof restaurantAuth.$inferSelect;
export type Restaurant = typeof restaurants.$inferSelect;
export type RestaurantBranch = typeof restaurantBranches.$inferSelect;
export type Booking = typeof bookings.$inferSelect;

export const mockRestaurants = [
  {
    id: 1,
    name: "La Maison Dorée",
    description: "Experience fine French dining in an elegant setting",
    about: "A family owned restaurant bringing authentic French cuisine to your neighborhood since 1995.",
    logo: "https://example.com/logo1.png",
    cuisine: "French",
    locations: [
      {
        address: "123 Main St",
        capacity: 60,
        tablesCount: 15,
        openingTime: "11:00",
        closingTime: "23:00",
        reservationDuration: 90
      }
    ]
  },
  {
    id: 2,
    name: "Sakura Garden",
    description: "Authentic Japanese cuisine with a modern twist",
    about: "Modern Japanese restaurant offering both traditional and fusion dishes in a contemporary setting.",
    logo: "https://example.com/logo2.png",
    cuisine: "Japanese",
    locations: [
      {
        address: "456 Oak Ave",
        capacity: 40,
        tablesCount: 10,
        openingTime: "12:00",
        closingTime: "22:00",
        reservationDuration: 60
      }
    ]
  }
];