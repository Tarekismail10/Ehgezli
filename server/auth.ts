import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser, RestaurantAuth as SelectRestaurantAuth } from "@shared/schema";

declare global {
  namespace Express {
    // Extend Express.User to allow both User and RestaurantAuth types
    interface User extends Partial<SelectUser>, Partial<SelectRestaurantAuth> {
      type?: 'user' | 'restaurant';
    }
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.REPL_ID!,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: app.get("env") === "production",
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  };

  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
  }

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // User authentication strategy
  passport.use('local', new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
  }, async (email, password, done) => {
    try {
      const user = await storage.getUserByEmail(email);
      if (!user || !(await comparePasswords(password, user.password))) {
        return done(null, false);
      }
      return done(null, { ...user, type: 'user' });
    } catch (err) {
      return done(err);
    }
  }));

  // Restaurant authentication strategy
  passport.use('restaurant-local', new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
  }, async (email, password, done) => {
    try {
      const restaurant = await storage.getRestaurantAuthByEmail(email);
      if (!restaurant || !(await comparePasswords(password, restaurant.password))) {
        return done(null, false);
      }
      return done(null, { ...restaurant, type: 'restaurant' });
    } catch (err) {
      return done(err);
    }
  }));

  passport.serializeUser((user: Express.User, done) => {
    if (!user || !user.id || !user.type) {
      return done(new Error('Invalid user data for serialization'));
    }
    done(null, { id: user.id, type: user.type });
  });

  passport.deserializeUser(async (data: { id: number, type: 'user' | 'restaurant' }, done) => {
    try {
      if (data.type === 'restaurant') {
        const restaurant = await storage.getRestaurantAuth(data.id);
        if (!restaurant) {
          return done(new Error('Restaurant not found'));
        }
        done(null, { ...restaurant, type: 'restaurant' });
      } else {
        const user = await storage.getUser(data.id);
        if (!user) {
          return done(new Error('User not found'));
        }
        done(null, { ...user, type: 'user' });
      }
    } catch (err) {
      done(err);
    }
  });

  // User registration endpoint
  app.post("/api/register", async (req, res, next) => {
    try {
      const existingUser = await storage.getUserByEmail(req.body.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already exists" });
      }

      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(req.body.password),
      });

      req.login({ ...user, type: 'user' }, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Restaurant registration endpoint
  app.post("/api/restaurant/register", async (req, res, next) => {
    try {
      const existingRestaurant = await storage.getRestaurantAuthByEmail(req.body.email);
      if (existingRestaurant) {
        return res.status(400).json({ message: "Email already registered" });
      }

      const restaurant = await storage.createRestaurantAuth({
        ...req.body,
        password: await hashPassword(req.body.password),
      });

      req.login({ ...restaurant, type: 'restaurant' }, (err) => {
        if (err) return next(err);
        res.status(201).json(restaurant);
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // User login endpoint
  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    res.status(200).json(req.user);
  });

  // Restaurant login endpoint
  app.post("/api/restaurant/login", passport.authenticate("restaurant-local"), (req, res) => {
    res.status(200).json(req.user);
  });

  // Restaurant profile setup endpoint
  app.post("/api/restaurant/profile", async (req, res) => {
    if (!req.isAuthenticated() || req.user?.type !== 'restaurant') {
      return res.status(401).json({ message: "Not authenticated as restaurant" });
    }

    try {
      await storage.createRestaurantProfile(req.body);
      res.status(201).json({ message: "Profile created successfully" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Common logout route
  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  // Current user route
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });

  // Current restaurant route
  app.get("/api/restaurant", (req, res) => {
    if (!req.isAuthenticated() || req.user?.type !== 'restaurant') {
      return res.sendStatus(401);
    }
    res.json(req.user);
  });
}