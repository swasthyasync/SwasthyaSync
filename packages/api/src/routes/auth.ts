// packages/api/src/routes/auth.ts - UPDATED VERSION
import express from 'express';
import { authController } from '../controllers/authController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = express.Router();

/**
 * Utility wrapper to catch async errors and forward to Express error handler
 */
const asyncHandler =
  (fn: any) => (req: express.Request, res: express.Response, next: express.NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch(next);

// -------------------- PUBLIC AUTH ROUTES --------------------

// Send OTP to phone or email
router.post('/send-otp', authController.sendOTP);

router.post('/send-otp', asyncHandler(authController.sendOTP));

// Verify OTP → returns token + user (existing) OR requires registration (new user)
router.post('/verify-otp', asyncHandler(authController.verifyOTP));

// Register new patient (after OTP verification for new users)
router.post('/register', asyncHandler(authController.register));


// Practitioner/Admin login with email + password
router.post('/login', asyncHandler(authController.login));

// Refresh JWT token (client provides old token)
router.post('/refresh', asyncHandler(authController.refreshToken));

// Logout current user
router.post('/logout', asyncHandler(authController.logout));

// -------------------- PROTECTED AUTH ROUTES --------------------

// Get current user profile (requires authentication)
router.get('/me', authMiddleware, asyncHandler(authController.getProfile));

// alias for backwards compatibility
router.get('/profile', authMiddleware, asyncHandler(authController.getProfile));

// Add this line after the existing protected routes
router.put('/profile', authMiddleware, asyncHandler(authController.updateProfile));

// Health check endpoint to verify token validity
router.get('/verify', authMiddleware, asyncHandler(async (req: express.Request, res: express.Response) => {
  return res.json({
    success: true,
    user: (req as any).user,
    message: 'Token is valid'
  });
}));

export default router;