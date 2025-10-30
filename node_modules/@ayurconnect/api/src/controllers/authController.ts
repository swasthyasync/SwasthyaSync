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

// In-memory user storage for dev fallback
const memoryUserStore = new Map<string, any>();

export const authController = {
  // ======================
  // SEND OTP
  // ======================
  async sendOTP(req: Request, res: Response) {
    try {
      const { phone, email } = req.body;
      if (!phone && !email) {
        return res.status(400).json({ error: 'Phone or email is required' });
      }

      const identifierRaw = (phone ?? email) as string;
      const normalized = otpService.normalizeIdentifier(identifierRaw);

      if (normalized.phone) {
        if (!otpService.validatePhoneNumber(normalized.phone)) {
          return res.status(400).json({ error: 'Invalid Indian phone number' });
        }
      } else if (normalized.email) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized.email)) {
          return res.status(400).json({ error: 'Invalid email address' });
        }
      }

      const otp = otpService.generateOTP();

      // FIXED: always use formatted key for DB storage
      const storeKey = normalized.phone
        ? otpService.formatPhoneForStorage(normalized.phone)
        : normalized.email!;
      await otpService.storeOTP(storeKey, otp);

      if (normalized.phone) {
        await smsService.sendOTP(normalized.phone, otp);
      }
      if (normalized.email) {
        await sendMail({
          to: normalized.email,
          subject: `Your SwasthyaSync verification code: ${otp}`,
          text: `Your verification code is ${otp}`,
          html: `<p>Your verification code is <b>${otp}</b></p>`
        });
      }

      return res.json({
        success: true,
        message: 'OTP sent successfully',
        ...(process.env.NODE_ENV !== 'production' && { otp })
      });
    } catch (err: any) {
      console.error('❌ sendOTP error:', err);
      return res.status(500).json({ error: 'Failed to send OTP' });
    }
  },

  // ======================
  // VERIFY OTP
  // ======================
  async verifyOTP(req: Request, res: Response) {
    try {
      const { phone, email, otp } = req.body;
      if ((!phone && !email) || !otp) {
        return res.status(400).json({ error: 'Phone/email and OTP are required' });
      }

      const identifierRaw = phone ?? email;
      const normalized = otpService.normalizeIdentifier(identifierRaw);

      let lookupPhone: string | undefined;
      let lookupEmail: string | undefined;

      if (normalized.phone) {
        if (!otpService.validatePhoneNumber(normalized.phone)) {
          return res.status(400).json({ error: 'Invalid Indian phone number' });
        }
        lookupPhone = otpService.formatPhoneForStorage(normalized.phone);
      }
      if (normalized.email) {
        lookupEmail = normalized.email.toLowerCase();
      }

      const isValid = await otpService.verifyOTP(lookupPhone ?? lookupEmail!, otp);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid or expired OTP' });
      }

      // Look for existing user
      let query = supabase.from('users').select('*');
      if (lookupPhone && lookupEmail) {
        query = query.or(`phone.eq.${lookupPhone},email.eq.${lookupEmail}` as string);
      } else if (lookupPhone) {
        query = query.eq('phone', lookupPhone);
      } else if (lookupEmail) {
        query = query.eq('email', lookupEmail);
      }

      const { data: existingUser } = await query.maybeSingle();

      if (existingUser) {
        const token = jwt.sign(
          { id: existingUser.id, phone: existingUser.phone, email: existingUser.email, role: existingUser.role },
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
            role: existingUser.role,
            onboarding: {
              personal_details_completed: !!existingUser.personal_details_completed,
              questionnaire_completed: !!existingUser.questionnaire_completed,
              onboarding_completed: !!existingUser.onboarding_completed
            }
          }
        });
      }

      return res.json({
        success: true,
        new: true,
        message: 'OTP verified. Please complete registration.',
        identifier: identifierRaw
      });
    } catch (err: any) {
      console.error('❌ verifyOTP error:', err);
      return res.status(500).json({ error: 'Failed to verify OTP' });
    }
  },

  // ======================
  // REGISTER USER
  // ======================
  async register(req: Request, res: Response) {
  try {
    if ((req as any).user) {
      return res.status(400).json({ error: 'Already authenticated. Please log out before registering a new user.' });
    }

    const { 
      phone, firstName, lastName, email, consent, dateOfBirth, gender, address,
      emergencyContact, emergencyName, emergencyRelation,
      occupation, chronicConditions, currentMedications, allergies,
      previousSurgeries, familyHistory, exerciseFrequency, sleepPattern,
      dietaryPreferences, smokingStatus, alcoholConsumption, stressLevel,
      previousAyurvedicTreatment, specificConcerns, treatmentGoals
    } = req.body;

    if (!consent) {
      return res.status(400).json({ error: 'Consent is required' });
    }

    let normalizedPhone: string | null = null;
    if (phone) {
      const norm = otpService.normalizeIdentifier(phone);
      if (norm.phone) {
        if (!otpService.validatePhoneNumber(norm.phone)) {
          return res.status(400).json({ error: 'Invalid phone number' });
        }
        normalizedPhone = otpService.formatPhoneForStorage(norm.phone);
      }
    }

    if (!normalizedPhone && !email) {
      return res.status(400).json({ error: 'Phone or email required' });
    }

    // Check for existing user
    const orClauses: string[] = [];
    if (normalizedPhone) orClauses.push(`phone.eq.${normalizedPhone}`);
    if (email) orClauses.push(`email.eq.${email.toLowerCase()}`);
    const orQuery: string = orClauses.join(',');

    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .or(orQuery as string)
      .maybeSingle();

    if (existingUser) {
      const token = jwt.sign(
        { id: existingUser.id, phone: existingUser.phone, email: existingUser.email, role: existingUser.role },
        JWT_SECRET,
        { expiresIn: '7d' }
      );
      return res.json({ success: true, token, user: existingUser });
    }

    const userId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Create complete user record with all provided data
    const userData = {
      id: userId,
      phone: normalizedPhone,
      first_name: firstName,
      last_name: lastName,
      email: email ? email.toLowerCase() : null,
      date_of_birth: dateOfBirth,
      gender: gender,
      address: address,
      role: 'patient',
      consent_given: consent,
      consent_timestamp: now,
      is_verified: true,
      personal_details_completed: true,
      questionnaire_completed: false,
      onboarding_completed: false,
      created_at: now,
      // Emergency contact
      emergency_contact: emergencyContact,
      emergency_name: emergencyName,
      emergency_relation: emergencyRelation,
      // Health & lifestyle data
      occupation: occupation,
      chronic_conditions: chronicConditions || [],
      current_medications: currentMedications || [],
      allergies: allergies || [],
      previous_surgeries: previousSurgeries || [],
      family_history: familyHistory || [],
      exercise_frequency: exerciseFrequency,
      sleep_pattern: sleepPattern,
      dietary_preferences: dietaryPreferences || [],
      smoking_status: smokingStatus,
      alcohol_consumption: alcoholConsumption,
      stress_level: stressLevel,
      previous_ayurvedic_treatment: previousAyurvedicTreatment,
      specific_concerns: specificConcerns || [],
      treatment_goals: treatmentGoals || []
    };

    const { data: newUser, error } = await supabase
      .from('users')
      .insert(userData)
      .select()
      .single();

    if (error) {
      console.error('Registration error:', error);
      throw error;
    }

    const token = jwt.sign({ id: newUser.id, phone: newUser.phone, email: newUser.email, role: newUser.role }, JWT_SECRET, { expiresIn: '7d' });
    return res.json({ success: true, token, user: newUser });
  } catch (err: any) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Registration failed', details: err?.message });
  }
},
  // ======================
  // GET PROFILE
  // ======================
  async getProfile(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { data: user } = await supabase.from('users').select('*').eq('id', userId).single();
      if (!user) return res.status(404).json({ error: 'User not found' });

      return res.json({ success: true, user });
    } catch (err: any) {
      console.error('❌ getProfile error:', err);
      return res.status(500).json({ error: 'Failed to fetch profile' });
    }
  },


  // Add this new method to authController object
async updateProfile(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const {
      // Personal details
      firstName, lastName, dateOfBirth, gender, address,
      // Emergency contact
      emergencyContact, emergencyName, emergencyRelation,
      // Health information
      occupation, chronicConditions, currentMedications, allergies,
      previousSurgeries, familyHistory,
      // Lifestyle
      exerciseFrequency, sleepPattern, dietaryPreferences,
      smokingStatus, alcoholConsumption, stressLevel,
      // Ayurvedic
      previousAyurvedicTreatment, specificConcerns, treatmentGoals
    } = req.body;

    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    // Only update provided fields
    if (firstName) updateData.first_name = firstName;
    if (lastName) updateData.last_name = lastName;
    if (dateOfBirth) updateData.date_of_birth = dateOfBirth;
    if (gender) updateData.gender = gender;
    if (address) updateData.address = address;
    if (emergencyContact) updateData.emergency_contact = emergencyContact;
    if (emergencyName) updateData.emergency_name = emergencyName;
    if (emergencyRelation) updateData.emergency_relation = emergencyRelation;
    if (occupation) updateData.occupation = occupation;
    if (exerciseFrequency) updateData.exercise_frequency = exerciseFrequency;
    if (sleepPattern) updateData.sleep_pattern = sleepPattern;
    if (smokingStatus) updateData.smoking_status = smokingStatus;
    if (alcoholConsumption) updateData.alcohol_consumption = alcoholConsumption;
    if (stressLevel) updateData.stress_level = stressLevel;
    if (previousAyurvedicTreatment !== undefined) updateData.previous_ayurvedic_treatment = previousAyurvedicTreatment;

    // Handle JSON arrays
    if (chronicConditions) updateData.chronic_conditions = chronicConditions;
    if (currentMedications) updateData.current_medications = currentMedications;
    if (allergies) updateData.allergies = allergies;
    if (previousSurgeries) updateData.previous_surgeries = previousSurgeries;
    if (familyHistory) updateData.family_history = familyHistory;
    if (dietaryPreferences) updateData.dietary_preferences = dietaryPreferences;
    if (specificConcerns) updateData.specific_concerns = specificConcerns;
    if (treatmentGoals) updateData.treatment_goals = treatmentGoals;

    const { data: updatedUser, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    return res.json({ success: true, user: updatedUser });
  } catch (err: any) {
    console.error('Update profile error:', err);
    return res.status(500).json({ error: 'Failed to update profile' });
  }
},

  // ======================
  // LOGIN (for admin/practitioner)
  // ======================
  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
      }

      const { data: user } = await supabase.from('users').select('*').eq('email', email).maybeSingle();
      if (!user) return res.status(401).json({ error: 'Invalid credentials' });

      if (user.role === 'patient') {
        return res.status(403).json({ error: 'Patients must login with OTP' });
      }

      const valid = user.password_hash ? await bcrypt.compare(password, user.password_hash) : false;
      if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
      return res.json({ success: true, token, user });
    } catch (err: any) {
      console.error('❌ login error:', err);
      return res.status(500).json({ error: 'Login failed' });
    }
  },

  // ======================
  // REFRESH TOKEN
  // ======================
  async refreshToken(req: Request, res: Response) {
    try {
      const { token } = req.body;
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const newToken = jwt.sign({ id: decoded.id, phone: decoded.phone, email: decoded.email, role: decoded.role }, JWT_SECRET, { expiresIn: '7d' });
      return res.json({ success: true, token: newToken });
    } catch {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  },

  // ======================
  // LOGOUT
  // ======================
  async logout(_req: Request, res: Response) {
    return res.json({ success: true, message: 'Logged out successfully' });
  }
};

export default authController;
