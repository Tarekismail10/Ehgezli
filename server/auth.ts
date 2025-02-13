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
    interface User extends SelectUser {}
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
  };

  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
  }

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Update User authentication strategy to use email
  passport.use('local', new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
  }, async (email, password, done) => {
    try {
      const user = await storage.getUserByEmail(email);
      if (!user || !(await comparePasswords(password, user.password))) {
        return done(null, false);
      }
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }));

  // Restaurant authentication strategy remains unchanged
  passport.use('restaurant-local', new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
  }, async (email, password, done) => {
    try {
      const restaurant = await storage.getRestaurantAuthByEmail(email);
      if (!restaurant || !(await comparePasswords(password, restaurant.password))) {
        return done(null, false);
      }
      return done(null, restaurant);
    } catch (err) {
      return done(err);
    }
  }));

  passport.serializeUser((user: any, done) => {
    if (!user) return done(new Error('No user to serialize'));
    const isRestaurant = 'verified' in user; 
    done(null, { id: user.id, type: isRestaurant ? 'restaurant' : 'user' });
  });

  passport.deserializeUser(async (data: { id: number, type: string }, done) => {
    try {
      if (data.type === 'restaurant') {
        const restaurant = await storage.getRestaurantAuth(data.id);
        if (!restaurant) return done(new Error('Restaurant not found'));
        done(null, restaurant);
      } else {
        const user = await storage.getUser(data.id);
        if (!user) return done(new Error('User not found'));
        done(null, user);
      }
    } catch (err) {
      done(err);
    }
  });

  // Update register endpoint to use email
  app.post("/api/register", async (req, res, next) => {
    const existingUser = await storage.getUserByEmail(req.body.email);
    if (existingUser) {
      return res.status(400).send("Email already exists");
    }

    try {
      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(req.body.password),
      });

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (error) {
      next(error);
    }
  });

  // Add back the login route handler
  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    res.status(200).json(req.user);
  });

  // Restaurant routes
  app.post("/api/restaurant/register", async (req, res, next) => {
    const existingRestaurant = await storage.getRestaurantAuthByEmail(req.body.email);
    if (existingRestaurant) {
      return res.status(400).send("Email already registered");
    }

    const restaurant = await storage.createRestaurantAuth({
      ...req.body,
      password: await hashPassword(req.body.password),
    });

    req.login(restaurant, (err) => {
      if (err) return next(err);
      res.status(201).json(restaurant);
    });
  });

  app.post("/api/restaurant/login", passport.authenticate("restaurant-local"), (req, res) => {
    res.status(200).json(req.user);
  });

  // Add restaurant profile setup endpoint
  app.post("/api/restaurant/profile", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      await storage.createRestaurantProfile(req.body);
      res.status(201).json({ message: "Profile created successfully" });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  // Common routes
  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
}