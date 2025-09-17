// packages/api/src/routes/auth.ts
import express from 'express';
import { authController } from '../controllers/authController';

const router = express.Router();

// Send OTP to phone number
router.post('/send-otp', authController.sendOTP);

// Verify OTP
router.post('/verify-otp', authController.verifyOTP);

// Register new patient
router.post('/register', authController.register);

// Login for practitioner/admin
router.post('/login', authController.login);

// Refresh token
router.post('/refresh', authController.refreshToken);

// Logout
router.post('/logout', authController.logout);

export default router;