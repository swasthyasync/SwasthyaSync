// packages/api/src/controllers/authController.ts
import { Request, Response } from 'express';
import { otpService } from '../services/otpService';
import { supabase } from '../db/supabaseClient';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { sendMail } from '../services/emailService';
import { smsService } from '../services/smsService';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';

// In-memory user storage for development fallback
const memoryUserStore = new Map<string, {
  id: string;
  phone?: string;
  email?: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  gender?: string;
  emergency_contact?: string;
  emergency_name?: string;
  address?: string;
  role: string;
  is_verified: boolean;
  consent_given: boolean;
  consent_timestamp: string;
  password_hash?: string;
  created_at: string;
}>();

export const authController = {
  // Send OTP — supports phone OR email
  async sendOTP(req: Request, res: Response) {
    try {
      const { phone, email } = req.body;
      if (!phone && !email) {
        return res.status(400).json({ error: 'Phone or email is required' });
      }

      const identifierRaw = (phone ?? email) as string;
      console.log('📱/📧 OTP request for:', identifierRaw);

      // Normalize and validate identifier
      const normalized = otpService.normalizeIdentifier(identifierRaw);
      if (normalized.phone) {
        if (!otpService.validatePhoneNumber(normalized.phone)) {
          return res.status(400).json({ error: 'Invalid Indian phone number' });
        }
      } else if (normalized.email) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized.email)) {
          return res.status(400).json({ error: 'Invalid email address' });
        }
      } else {
        return res.status(400).json({ error: 'Invalid identifier' });
      }

      const otp = otpService.generateOTP();
      console.log(`🔐 Generated OTP: ${otp} for ${identifierRaw}`);

      // store OTP in Supabase (returns boolean)
      try {
        const stored = await otpService.storeOTP(identifierRaw, otp);
        if (!stored) {
          console.error('❌ storeOTP returned false - aborting OTP send');
          return res.status(502).json({ error: 'Failed to store OTP' });
        }
      } catch (e: any) {
        console.error('❌ storeOTP threw error:', e?.message ?? e);
        return res.status(502).json({ error: 'Failed to store OTP', detail: e?.message });
      }

      // If phone, send/log via smsService (dev-mode)
      if (normalized.phone) {
        try {
          await smsService.sendOTP(normalized.phone, otp);
        } catch (smsErr) {
          console.warn('⚠️ SMS send failed (non-fatal):', smsErr);
        }
      }

      // If email provided, attempt to send email (non-blocking)
      if (normalized.email) {
        try {
          await sendMail({
            to: normalized.email,
            subject: `Your AyurConnect verification code: ${otp}`,
            html: `<p>Your verification code is <strong>${otp}</strong>. It will expire in 5 minutes.</p>`,
            text: `Your AyurConnect verification code is: ${otp}`
          });
          console.log('📧 OTP email sent to', normalized.email);
        } catch (mailErr) {
          console.warn('⚠️ Email send failed (non-fatal):', mailErr);
        }
      }

      // In dev mode return OTP for display
      const isDev = process.env.NODE_ENV !== 'production';
      return res.json({
        success: true,
        message: 'OTP sent successfully',
        ttl_seconds: 300,
        ...(isDev && { otp, displayOTP: true })
      });
    } catch (error: any) {
      console.error('❌ Send OTP error (top-level):', error);
      return res.status(500).json({ error: 'Failed to send OTP', details: error?.message });
    }
  },

  // Verify OTP — supports phone OR email
  async verifyOTP(req: Request, res: Response) {
    try {
      const { phone, email, otp } = req.body;
      if ((!phone && !email) || !otp) {
        return res.status(400).json({ error: 'Phone/email and OTP are required' });
      }

      const identifier = phone ?? email;
      console.log('🔐 Verifying OTP for:', identifier);

      const isValid = await otpService.verifyOTP(identifier, otp);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid or expired OTP' });
      }

      console.log('✅ OTP verified successfully');

      // Now check if user exists (by phone or email)
      try {
        // Try database first
        let query = supabase.from('users').select('*');
        if (phone) query = query.eq('phone', otpService.formatPhoneForStorage(phone));
        if (email) query = query.eq('email', (email as string).toLowerCase());

        const { data: existingUser, error } = await query.single();

        if (existingUser) {
          const token = jwt.sign(
            {
              id: existingUser.id,
              phone: existingUser.phone,
              email: existingUser.email,
              role: existingUser.role
            },
            JWT_SECRET,
            { expiresIn: '7d' }
          );

          return res.json({
            success: true,
            new: false,
            token,
            user: {
              id: existingUser.id,
              name: `${existingUser.first_name} ${existingUser.last_name}`,
              phone: existingUser.phone,
              email: existingUser.email,
              role: existingUser.role
            }
          });
        }
      } catch (dbErr: any) {
        console.log('Database check failed, checking memory store:', dbErr?.message ?? dbErr);
        
        // Fallback to memory store
        const key = phone ? otpService.formatPhoneForStorage(phone) : email?.toLowerCase();
        const memoryUser = Array.from(memoryUserStore.values()).find(user => 
          (phone && user.phone === key) || (email && user.email === key)
        );

        if (memoryUser) {
          const token = jwt.sign(
            {
              id: memoryUser.id,
              phone: memoryUser.phone,
              email: memoryUser.email,
              role: memoryUser.role
            },
            JWT_SECRET,
            { expiresIn: '7d' }
          );

          return res.json({
            success: true,
            new: false,
            token,
            user: {
              id: memoryUser.id,
              name: `${memoryUser.first_name} ${memoryUser.last_name}`,
              phone: memoryUser.phone,
              email: memoryUser.email,
              role: memoryUser.role
            }
          });
        }
      }

      // If user does not exist, instruct client to register
      return res.json({
        success: true,
        new: true,
        message: 'OTP verified. Please complete registration.',
        identifier: identifier
      });
    } catch (error: any) {
      console.error('❌ Verify OTP error:', error);
      return res.status(500).json({ error: 'Failed to verify OTP' });
    }
  },

  // Register new patient with memory fallback
  async register(req: Request, res: Response) {
    try {
      const {
        phone,
        firstName,
        lastName,
        dateOfBirth,
        gender,
        email,
        emergencyContact,
        emergencyName,
        address,
        consent
      } = req.body;

      if (!consent) {
        return res.status(400).json({ error: 'Consent is required' });
      }

      // Normalize phone if present
      let normalizedPhone: string | null = null;
      if (phone) {
        const cleaned = String(phone).replace(/\D/g, '');
        normalizedPhone = cleaned;
        if (normalizedPhone.startsWith('91') && normalizedPhone.length === 12) {
          normalizedPhone = normalizedPhone.substring(2);
        }
        // basic validation if phone provided
        if (normalizedPhone.length !== 10 || !/^[6-9]\d{9}$/.test(normalizedPhone)) {
          return res.status(400).json({ error: 'Invalid Indian phone number' });
        }
      }

      // require at least one identifier: phone or email
      if (!normalizedPhone && !email) {
        return res.status(400).json({ error: 'Either phone or email is required for registration' });
      }

      const userId = crypto.randomUUID();
      const now = new Date().toISOString();

      // Prepare user data
      const userData = {
        id: userId,
        phone: normalizedPhone || undefined,
        first_name: firstName,
        last_name: lastName,
        date_of_birth: dateOfBirth || undefined,
        gender: gender || undefined,
        email: email || undefined,
        emergency_contact: emergencyContact || undefined,
        emergency_name: emergencyName || undefined,
        address: address || undefined,
        role: 'patient',
        consent_given: consent,
        consent_timestamp: now,
        is_verified: true,
        created_at: now
      };

      let newUser: any = null;

      // Try database first
      try {
        const insertPayload = {
          phone: normalizedPhone || null,
          first_name: firstName,
          last_name: lastName,
          date_of_birth: dateOfBirth || null,
          gender: gender || null,
          email: email || null,
          emergency_contact: emergencyContact || null,
          emergency_name: emergencyName || null,
          address: address || null,
          role: 'patient',
          consent_given: consent,
          consent_timestamp: now,
          is_verified: true
        };

        const { data: dbUser, error } = await supabase
          .from('users')
          .insert(insertPayload)
          .select()
          .single();

        if (error) {
          throw new Error(`Database error: ${error.message}`);
        }

        newUser = dbUser;
        console.log('✅ User created in database:', newUser.id);

      } catch (dbError: any) {
        console.warn('Database registration failed, using memory fallback:', dbError.message);
        
        // Fallback to memory storage
        memoryUserStore.set(userId, userData as any);
        newUser = userData;
        console.log('✅ User created in memory (fallback):', userId);
        console.warn('⚠️ User stored in memory - will be lost on server restart!');
      }

      if (!newUser) {
        throw new Error('Failed to create user in both database and memory');
      }

      // Generate JWT token
      const tokenPayload: Record<string, any> = {
        id: newUser.id,
        role: newUser.role
      };
      if (newUser.phone) tokenPayload.phone = newUser.phone;
      if (newUser.email) tokenPayload.email = newUser.email;

      const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });

      // Non-blocking: attempt to send welcome email if we have an email
      if (newUser.email) {
        (async () => {
          try {
            const html = `
              <div style="font-family: Arial, sans-serif; line-height:1.4; color:#111;">
                <h2>Welcome to AyurConnect${newUser.first_name ? ', ' + newUser.first_name : ''}!</h2>
                <p>Thank you for registering. We're excited to help you on your health journey.</p>
                <p>If you have any questions, reply to this email and our support team will help you.</p>
                <p style="font-size:13px;color:#666;margin-top:16px">— AyurConnect Team</p>
              </div>
            `;
            await sendMail({
              to: newUser.email,
              subject: 'Welcome to AyurConnect',
              html,
              text: `Welcome to AyurConnect${newUser.first_name ? ', ' + newUser.first_name : ''}!`
            });
            console.log('✅ Welcome email sent to', newUser.email);
          } catch (emailErr) {
            console.warn('⚠️ Failed to send welcome email (non-fatal):', emailErr);
          }
        })();
      }

      // Respond to client
      return res.json({
        success: true,
        token,
        user: {
          id: newUser.id,
          name: `${newUser.first_name} ${newUser.last_name}`,
          phone: newUser.phone ?? null,
          email: newUser.email ?? null,
          role: newUser.role
        }
      });
    } catch (error: any) {
      console.error('❌ Registration error:', error);
      return res.status(500).json({
        error: 'Registration failed',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      });
    }
  },

  // Login for practitioner/admin (unchanged)
  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      // For development - allow default admin login
      if (email === 'admin@ayurconnect.com' && password === 'admin123') {
        let admin: any = null;

        // Try database first
        try {
          const { data: dbAdmin } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();
          
          admin = dbAdmin;
        } catch (dbErr) {
          console.log('Admin not found in database, checking memory...');
          
          // Check memory store
          admin = Array.from(memoryUserStore.values()).find(user => user.email === email);
        }

        if (!admin) {
          // Create admin in memory if not found
          const hashedPassword = await bcrypt.hash(password, 10);
          const adminId = crypto.randomUUID();
          const adminData = {
            id: adminId,
            phone: '9999999999',
            email: email,
            password_hash: hashedPassword,
            first_name: 'Admin',
            last_name: 'User',
            role: 'admin',
            is_verified: true,
            consent_given: true,
            consent_timestamp: new Date().toISOString(),
            created_at: new Date().toISOString()
          };

          try {
            const { data: newAdmin } = await supabase
              .from('users')
              .insert(adminData)
              .select()
              .single();
            admin = newAdmin;
          } catch (dbErr) {
            console.log('Creating admin in memory fallback');
            memoryUserStore.set(adminId, adminData);
            admin = adminData;
          }
        }

        if (admin) {
          const token = jwt.sign(
            { id: admin.id, email: admin.email, role: admin.role },
            JWT_SECRET,
            { expiresIn: '7d' }
          );

          return res.json({
            success: true,
            token,
            user: {
              id: admin.id,
              name: `${admin.first_name} ${admin.last_name}`,
              email: admin.email,
              role: admin.role
            }
          });
        }
      }

      // Normal login flow - try database first, then memory
      let user: any = null;
      
      try {
        const { data: dbUser, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', email)
          .single();
        user = dbUser;
      } catch (dbErr) {
        // Check memory store
        user = Array.from(memoryUserStore.values()).find(u => u.email === email);
      }

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Check if user is practitioner or admin
      if (user.role === 'patient') {
        return res.status(403).json({ error: 'Please use phone OTP to login' });
      }

      // Verify password if exists
      if (user.password_hash) {
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }
      }

      // Generate token
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.json({
        success: true,
        token,
        user: {
          id: user.id,
          name: `${user.first_name} ${user.last_name}`,
          email: user.email,
          role: user.role
        }
      });
    } catch (error: any) {
      console.error('Login error:', error);
      return res.status(500).json({
        error: 'Login failed',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      });
    }
  },

  // Refresh token
  async refreshToken(req: Request, res: Response) {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({ error: 'Token is required' });
      }

      const decoded = jwt.verify(token, JWT_SECRET) as any;

      const newToken = jwt.sign(
        {
          id: decoded.id,
          phone: decoded.phone || decoded.email,
          role: decoded.role
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.json({ success: true, token: newToken });
    } catch (error: any) {
      console.error('Refresh token error:', error);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  },

  // Logout
  async logout(_req: Request, res: Response) {
    return res.json({
      success: true,
      message: 'Logged out successfully'
    });
  }
};

export default authController;