import { Express } from "express";
import * as authController from "@server/controllers/authController";
import { authenticate } from "@server/middleware/authMiddleware";

export function registerAuthRoutes(app: Express) {
    //Public Routes
  app.post("/api/auth/login", authController.loginUserController);
  app.post("/api/auth/restaurant-login", authController.loginRestaurantController);
  app.post("/api/auth/register", authController.registerUserController);
  app.post("/api/auth/restaurant-register", authController.registerRestaurantUserController);
  //Public Password Reset Routes
  app.post("/api/auth/password-reset", authController.createPasswordResetTokenController);
  app.post("/api/auth/restaurant-password-reset", authController.createRestaurantPasswordResetTokenController);
  app.post("/api/auth/validate-password-reset-token", authController.validatePasswordResetTokenController);
  app.post("/api/auth/validate-restaurant-password-reset-token", authController.validateRestaurantPasswordResetTokenController);
  app.post("/api/auth/mark-password-reset-token-as-used", authController.markPasswordResetTokenAsUsedController);
  app.post("/api/auth/mark-restaurant-password-reset-token-as-used", authController.markRestaurantPasswordResetTokenAsUsedController);
  //Protected Password Reset Routes
  app.post("/api/auth/update-user-password", authenticate, authController.updateUserPasswordController);
  app.post("/api/auth/update-restaurant-password", authenticate, authController.updateRestaurantPasswordController);
}