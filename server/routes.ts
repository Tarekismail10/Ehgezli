import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from 'ws';
import express from 'express';
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { db } from "./db";
import { and, eq } from "drizzle-orm";
import { bookings, restaurantBranches, users, savedRestaurants, restaurants, restaurantAuth, restaurantProfiles } from "@shared/schema";
import { parse as parseCookie } from 'cookie';

// Define WebSocket message types
type WebSocketMessage = {
  type: 'new_booking' | 'booking_cancelled' | 'heartbeat' | 'connection_established' | 'booking_arrived';
  data?: any;
};

export function registerRoutes(app: Express): Server {
  // Add JSON and URL-encoded body parsing before any routes
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Add error handling middleware for JSON parsing errors
  app.use((err: any, req: any, res: any, next: any) => {
    if (err instanceof SyntaxError && 'body' in err) {
      console.error('JSON parsing error:', err);
      return res.status(400).json({ message: 'Invalid JSON in request body' });
    }
    next(err);
  });

  // Set up authentication first to ensure session is available for WebSocket
  setupAuth(app);

  const httpServer = createServer(app);
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws',
    verifyClient: async (info, callback) => {
      try {
        if (!info.req.headers.cookie) {
          console.error('WebSocket connection rejected: No cookie header');
          return callback(false, 401, 'Authentication required');
        }

        const cookies = parseCookie(info.req.headers.cookie);
        const sessionID = cookies['connect.sid'];

        if (!sessionID) {
          console.error('WebSocket connection rejected: No session ID in cookies');
          return callback(false, 401, 'No session found');
        }

        // Clean session ID
        const cleanSessionId = decodeURIComponent(
          sessionID.split('.')[0].replace(/^s:/, '')
        );

        // Get session from store
        const session = await new Promise((resolve, reject) => {
          storage.sessionStore.get(cleanSessionId, (err, session) => {
            if (err) {
              console.error('Session store error:', err);
              reject(err);
            } else {
              resolve(session);
            }
          });
        });

        if (!session) {
          console.error('WebSocket connection rejected: Invalid session');
          return callback(false, 401, 'Invalid session');
        }

        // Safely access passport data with type assertion
        const passportData = (session as any).passport;
        if (!passportData?.user?.id || !passportData?.user?.type) {
          console.error('WebSocket connection rejected: No user data in session');
          return callback(false, 401, 'Invalid user data');
        }

        // Store user info in request
        (info.req as any).user = {
          id: passportData.user.id,
          type: passportData.user.type
        };

        console.log('WebSocket authentication successful:', {
          userId: passportData.user.id,
          userType: passportData.user.type
        });

        callback(true);
      } catch (error) {
        console.error('WebSocket authentication error:', error);
        callback(false, 500, 'Authentication failed');
      }
    }
  });

  // Track active connections with their authentication state
  const clients = new Map<WebSocket, {
    sessionID: string;
    userId: number;
    userType: 'user' | 'restaurant';
    isAlive: boolean;
  }>();

  // Heartbeat interval
  const heartbeatInterval = setInterval(() => {
    clients.forEach((client, ws) => {
      if (!client.isAlive) {
        console.log('Terminating inactive WebSocket connection:', client);
        clients.delete(ws);
        return ws.terminate();
      }
      client.isAlive = false;
      ws.ping();
    });
  }, 30000);

  // WebSocket connection handler
  wss.on('connection', async (ws, req) => {
    const user = (req as any).user;
    console.log('WebSocket connection established:', {
      userId: user.id,
      userType: user.type,
      timestamp: new Date().toISOString()
    });

    // Get clean session ID from cookie
    const sessionID = parseCookie(req.headers.cookie!)['connect.sid'];
    const cleanSessionId = decodeURIComponent(
      sessionID.split('.')[0].replace(/^s:/, '')
    );

    // Add client to tracked connections
    clients.set(ws, {
      sessionID: cleanSessionId,
      userId: user.id,
      userType: user.type,
      isAlive: true
    });

    // Set up client event handlers
    ws.on('pong', () => {
      const client = clients.get(ws);
      if (client) {
        client.isAlive = true;
      }
    });

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString()) as WebSocketMessage;
        console.log('WebSocket message received:', {
          type: data.type,
          userId: user.id,
          userType: user.type,
          timestamp: new Date().toISOString()
        });

        if (data.type === 'heartbeat') {
          const client = clients.get(ws);
          if (client) {
            client.isAlive = true;
            ws.send(JSON.stringify({ type: 'heartbeat' }));
          }
        }
      } catch (error) {
        console.error('WebSocket message parsing error:', {
          error,
          userId: user.id,
          userType: user.type,
          timestamp: new Date().toISOString()
        });
      }
    });

    ws.on('close', () => {
      console.log('WebSocket connection closed:', {
        userId: user.id,
        userType: user.type,
        timestamp: new Date().toISOString()
      });
      clients.delete(ws);
    });

    // Send initial connection success message
    ws.send(JSON.stringify({
      type: 'connection_established',
      data: { userId: user.id, userType: user.type }
    }));
  });

  // Add authentication middleware for all /api routes
  app.use('/api', (req, res, next) => {
    if (!req.isAuthenticated()) {
      console.error('API request rejected: Not authenticated', {
        path: req.path,
        method: req.method,
        sessionID: req.sessionID
      });
      return res.status(401).json({ message: "Authentication required" });
    }
    next();
  });

  // Add type-specific authentication middleware
  const requireRestaurantAuth = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated() || req.user?.type !== 'restaurant') {
      console.error('Restaurant API access denied:', {
        path: req.path,
        method: req.method,
        userType: req.user?.type,
        sessionID: req.sessionID
      });
      return res.status(401).json({ message: "Not authenticated as restaurant" });
    }
    next();
  };

  // Update restaurant bookings endpoint with enhanced auth
  app.get("/api/restaurant/bookings/:restaurantId", requireRestaurantAuth, async (req, res) => {
    console.log('Restaurant bookings request:', {
      restaurantId: req.params.restaurantId,
      user: req.user,
      sessionID: req.sessionID
    });

    try {
      const restaurantId = parseInt(req.params.restaurantId);
      if (restaurantId !== req.user?.id) {
        console.error('Unauthorized booking access attempt:', {
          requestedId: restaurantId,
          userId: req.user?.id
        });
        return res.status(403).json({ message: "Unauthorized to access these bookings" });
      }

      const bookings = await storage.getRestaurantBookings(restaurantId);
      res.json(bookings);
    } catch (error: any) {
      console.error('Error fetching restaurant bookings:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Update arrive endpoint with enhanced auth and proper type checking
  app.post("/api/restaurant/bookings/:bookingId/arrive", requireRestaurantAuth, async (req, res, next) => {
    try {
      const bookingId = parseInt(req.params.bookingId);
      console.log('Processing arrival for booking:', {
        bookingId,
        restaurantId: req.user?.id
      });

      // Verify booking belongs to this restaurant
      const [booking] = await db.select()
        .from(bookings)
        .innerJoin(restaurantBranches, eq(bookings.branchId, restaurantBranches.id))
        .where(
          and(
            eq(bookings.id, bookingId),
            eq(restaurantBranches.restaurantId, req.user?.id)
          )
        );

      if (!booking) {
        console.error('Booking not found or unauthorized:', {
          bookingId,
          restaurantId: req.user?.id
        });
        return res.status(404).json({ message: "Booking not found or unauthorized" });
      }

      await storage.markBookingArrived(bookingId);
      console.log('Successfully marked booking as arrived:', {
        bookingId,
        restaurantId: req.user?.id
      });

      // Notify connected clients about the arrival update
      clients.forEach((client, ws) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'booking_arrived',
            data: { bookingId, restaurantId: req.user?.id }
          }));
        }
      });

      res.json({ message: "Booking marked as arrived" });
    } catch (error) {
      console.error('Error marking booking as arrived:', error);
      next(error);
    }
  });
  app.post("/api/bookings/:bookingId/cancel", async (req, res, next) => {
    try {
      if (!req.isAuthenticated() || req.user?.type !== 'user' || !req.user?.id) {
        return res.status(401).json({ message: "Not authenticated as user" });
      }

      const bookingId = parseInt(req.params.bookingId);

      // First get the booking to verify ownership
      const [booking] = await db.select()
        .from(bookings)
        .where(
          and(
            eq(bookings.id, bookingId),
            eq(bookings.userId, req.user.id)
          )
        );

      if (!booking) {
        return res.status(404).json({ message: "Booking not found or unauthorized" });
      }

      // Update the booking to be cancelled (confirmed = false)
      await db.update(bookings)
        .set({ confirmed: false })
        .where(eq(bookings.id, bookingId));

      // Notify connected clients about the cancelled booking
      clients.forEach((client, ws) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'booking_cancelled',
            data: { bookingId, userId: req.user?.id }
          }));
        }
      });

      res.json({ message: "Booking cancelled successfully" });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/restaurants", async (req, res, next) => {
    try {
      const query = req.query.q as string;
      const restaurants = query
        ? await storage.searchRestaurants(query)
        : await storage.getRestaurants();
      res.json(restaurants);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/restaurants/:id", async (req, res, next) => {
    try {
      const restaurant = await storage.getRestaurant(parseInt(req.params.id));
      if (!restaurant) {
        res.status(404).json({ message: "Restaurant not found" });
        return;
      }
      res.json(restaurant);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/restaurants/:id/branches", async (req, res, next) => {
    try {
      const branches = await storage.getRestaurantBranches(parseInt(req.params.id));
      res.json(branches);
    } catch (error) {
      next(error);
    }
  });

  // Update the POST /api/bookings endpoint with proper type checking
  app.post("/api/bookings", async (req, res, next) => {
    try {
      if (!req.isAuthenticated() || req.user?.type !== 'user' || typeof req.user?.id !== 'number') {
        return res.status(401).json({ message: "Not authenticated as user" });
      }

      const { branchId, date, partySize } = req.body;

      // Validate required fields
      if (!branchId || !date || !partySize) {
        return res.status(400).json({
          message: "Missing required fields",
          required: ['branchId', 'date', 'partySize']
        });
      }

      // Validate data types
      if (typeof partySize !== 'number' || partySize < 1) {
        return res.status(400).json({ message: "Party size must be a positive number" });
      }

      if (isNaN(Date.parse(date))) {
        return res.status(400).json({ message: "Invalid date format" });
      }

      // Create the booking - now we know req.user.id is a number
      const booking = await storage.createBooking({
        userId: req.user.id,
        branchId,
        date: new Date(date),
        partySize,
        arrived: false
      });

      // Notify connected clients about the new booking
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'new_booking',
            data: booking
          }));
        }
      });

      return res.status(201).json(booking);
    } catch (error) {
      console.error('Error creating booking:', error);
      return res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to create booking"
      });
    }
  });

  app.get("/api/bookings", async (req, res, next) => {
    try {
      if (!req.isAuthenticated() || !req.user?.id) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const bookings = await storage.getUserBookings(req.user.id);
      res.json(bookings);
    } catch (error) {
      next(error);
    }
  });

  // Add restaurant profile endpoints
  app.put("/api/restaurant/profile", requireRestaurantAuth, async (req, res, next) => {
    try {
      await storage.createRestaurantProfile({
        ...req.body,
        restaurantId: req.user.id
      });

      res.json({ message: "Profile updated successfully" });
    } catch (error) {
      next(error);
    }
  });


  // Add saved restaurants endpoints
  app.post("/api/saved-restaurants", async (req, res, next) => {
    try {
      if (!req.isAuthenticated() || req.user?.type !== 'user' || !req.user?.id) {
        console.log('Authentication failed:', {
          isAuthenticated: req.isAuthenticated(),
          userType: req.user?.type,
          userId: req.user?.id
        });
        return res.status(401).json({ message: "Not authenticated as user" });
      }

      const { restaurantId, branchIndex } = req.body;
      console.log('Saving restaurant:', {
        userId: req.user.id,
        restaurantId,
        branchIndex
      });

      if (typeof restaurantId !== 'number' || typeof branchIndex !== 'number') {
        console.log('Invalid request body:', req.body);
        return res.status(400).json({ message: "Invalid request body" });
      }

      // Verify that the restaurant exists before saving
      const [restaurant] = await db
        .select()
        .from(restaurantAuth)
        .where(eq(restaurantAuth.id, restaurantId));

      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      const [saved] = await db.insert(savedRestaurants)
        .values({
          userId: req.user.id,
          restaurantId,
          branchIndex,
          createdAt: new Date()
        })
        .returning();

      console.log('Restaurant saved successfully:', saved);
      res.status(201).json(saved);
    } catch (error) {
      console.error('Error saving restaurant:', error);
      next(error);
    }
  });

  app.get("/api/saved-restaurants", async (req, res, next) => {
    try {
      if (!req.isAuthenticated() || req.user?.type !== 'user' || !req.user?.id) {
        return res.status(401).json({ message: "Not authenticated as user" });
      }

      const userId = req.user.id;
      console.log('Fetching saved restaurants for user:', userId);

      // First get the saved restaurant records
      const savedRecords = await db
        .select()
        .from(savedRestaurants)
        .where(eq(savedRestaurants.userId, userId));

      console.log('Found saved records:', savedRecords);

      // Then fetch complete restaurant data for each saved record
      const results = await Promise.all(
        savedRecords.map(async (saved) => {
          // Get restaurant auth and profile data
          const [restaurantData] = await db
            .select({
              id: restaurantAuth.id,
              name: restaurantAuth.name,
              description: restaurantProfiles.about,
              about: restaurantProfiles.about,
              logo: restaurantProfiles.logo,
              cuisine: restaurantProfiles.cuisine,
              priceRange: restaurantProfiles.priceRange,
            })
            .from(restaurantAuth)
            .innerJoin(
              restaurantProfiles,
              eq(restaurantAuth.id, restaurantProfiles.restaurantId)
            )
            .where(eq(restaurantAuth.id, saved.restaurantId));

          // Get branches data
          const branches = await db
            .select()
            .from(restaurantBranches)
            .where(eq(restaurantBranches.restaurantId, saved.restaurantId));

          // Map branches to locations format
          const locations = branches.map(branch => ({
            id: branch.id,
            address: branch.address,
            tablesCount: branch.tablesCount,
            seatsCount: branch.seatsCount,
            openingTime: branch.openingTime,
            closingTime: branch.closingTime,
            city: branch.city as "Alexandria" | "Cairo"
          }));

          return {
            id: saved.id,
            restaurantId: saved.restaurantId,
            branchIndex: saved.branchIndex,
            createdAt: saved.createdAt,
            restaurant: {
              ...restaurantData,
              locations
            }
          };
        })
      );

      console.log('Mapped saved restaurants results:', results);
      res.json(results);
    } catch (error) {
      console.error('Error fetching saved restaurants:', error);
      next(error);
    }
  });

  app.get("/api/saved-restaurants/:restaurantId/:branchIndex", async (req, res, next) => {
    try {
      if (!req.isAuthenticated() || req.user?.type !== 'user' || !req.user?.id) {
        return res.status(401).json({ message: "Not authenticated as user" });
      }

      const userId = req.user.id;
      const restaurantId = parseInt(req.params.restaurantId);
      const branchIndex = parseInt(req.params.branchIndex);

      const [saved] = await db
        .select()
        .from(savedRestaurants)
        .where(
          and(
            eq(savedRestaurants.userId, userId),
            eq(savedRestaurants.restaurantId, restaurantId),
            eq(savedRestaurants.branchIndex, branchIndex)
          )
        );

      res.json(Boolean(saved));
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/saved-restaurants/:restaurantId/:branchIndex", async (req, res, next) => {
    try {
      if (!req.isAuthenticated() || req.user?.type !== 'user' || !req.user?.id) {
        return res.status(401).json({ message: "Not authenticated as user" });
      }

      const userId = req.user.id;
      const restaurantId = parseInt(req.params.restaurantId);
      const branchIndex = parseInt(req.params.branchIndex);

      await db
        .delete(savedRestaurants)
        .where(
          and(
            eq(savedRestaurants.userId, userId),
            eq(savedRestaurants.restaurantId, restaurantId),
            eq(savedRestaurants.branchIndex, branchIndex)
          )
        );

      res.status(200).json({ message: "Restaurant removed from saved list" });
    } catch (error) {
      next(error);
    }
  });

  // Error handling middleware should be last
  app.use((err: any, req: any, res: any, next: any) => {
    console.error('Error:', err);
    // Ensure we always send JSON response
    res.status(err.status || 500).json({
      message: err.message || "Internal server error"
    });
  });

  return httpServer;
}