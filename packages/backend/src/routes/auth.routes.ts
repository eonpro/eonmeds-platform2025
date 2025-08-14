<<<<<<< HEAD
import { Router } from 'express';
import { syncAuth0User, getCurrentUser, updateProfile } from '../controllers/auth.controller';
import { checkJwt } from '../middleware/auth0';
=======
import { Router } from "express";
import {
  syncAuth0User,
  getCurrentUser,
  updateProfile,
} from "../controllers/auth.controller";
import { checkJwt } from "../middleware/auth0";
>>>>>>> 359f4b14e96ab063f3b7ea40b7d90ddb9502ca33

const router = Router();

// Public routes - Auth0 handles these:
// - Login: Use Auth0 Universal Login
// - Register: Use Auth0 Sign Up
// - Password Reset: Use Auth0 Password Reset Flow

// Protected routes (require Auth0 token)

// Sync Auth0 user with local database (call after login)
router.post("/sync", checkJwt, syncAuth0User);

// Get current user data
router.get("/me", checkJwt, getCurrentUser);

// Update user profile
router.patch("/profile", checkJwt, updateProfile);

// Auth0 callback info (for frontend reference)
router.get("/config", (_req, res) => {
  res.json({
    domain: process.env.AUTH0_DOMAIN,
    clientId: process.env.AUTH0_CLIENT_ID,
    audience: process.env.AUTH0_AUDIENCE,
<<<<<<< HEAD
    redirectUri: process.env.AUTH0_REDIRECT_URI || 'http://localhost:3001/callback',
    logoutUri: process.env.AUTH0_LOGOUT_URI || 'http://localhost:3001',
=======
    redirectUri:
      process.env.AUTH0_REDIRECT_URI || "http://localhost:3001/callback",
    logoutUri: process.env.AUTH0_LOGOUT_URI || "http://localhost:3001",
>>>>>>> 359f4b14e96ab063f3b7ea40b7d90ddb9502ca33
  });
});

export default router;
