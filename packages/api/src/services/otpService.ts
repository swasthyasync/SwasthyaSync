// packages/api/src/services/otpService.ts
import crypto from 'crypto';
import { supabase } from '../db/supabaseClient';

type Identifier = { phone?: string; email?: string };

// In-memory fallback storage for development
const memoryOtpStore = new Map<string, {
  otpHash: string;
  expiresAt: Date;
  attempts: number;
  createdAt: Date;
}>();

export const otpService = {
  /**
   * Generate a random 6-digit OTP
   */
  generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  },

  /**
   * Hash OTP for secure storage
   */
  hashOTP(otp: string): string {
    const salt = process.env.OTP_SALT || 'dev-salt-change-in-production';
    return crypto.createHash('sha256').update(otp + salt).digest('hex');
  },

  /**
   * Normalize identifier: decide whether this is phone or email
   */
  normalizeIdentifier(identifier: string): Identifier {
    const trimmed = String(identifier).trim();
    if (trimmed.includes('@')) {
      return { email: trimmed.toLowerCase() };
    }
    const digits = trimmed.replace(/\D/g, '');
    const phone =
      digits.startsWith('91') && digits.length === 12
        ? digits.substring(2)
        : digits;
    return { phone };
  },

  /**
   * Store OTP - tries database first, falls back to memory
   */
  async storeOTP(identifierRaw: string, otp: string): Promise<boolean> {
    const identifier = this.normalizeIdentifier(identifierRaw);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry
    const key = identifier.phone || identifier.email || '';

    console.log('[otpService] Attempting to store OTP for:', identifier);
    
    if (!key) {
      console.warn('[otpService] storeOTP called with invalid identifier:', identifierRaw);
      return false;
    }

    // Try database first
    try {
      // Best-effort delete existing OTPs
      if (identifier.phone) {
        await supabase.from('otp_tokens').delete().eq('phone', identifier.phone);
      } else if (identifier.email) {
        await supabase.from('otp_tokens').delete().eq('email', identifier.email);
      }

      // Insert new OTP row
      const insertBody: any = {
        otp_hash: this.hashOTP(otp),
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString(),
        attempts: 0,
      };
      if (identifier.phone) insertBody.phone = identifier.phone;
      if (identifier.email) insertBody.email = identifier.email;

      const { data, error } = await supabase
        .from('otp_tokens')
        .insert(insertBody)
        .select();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      if (!data || data.length === 0) {
        throw new Error('No data returned from insert operation');
      }

      console.log(`✅ OTP stored in database for ${key}, expires at ${expiresAt.toLocaleTimeString()}`);
      return true;

    } catch (dbError: any) {
      console.warn('[otpService] Database storage failed, using memory fallback:', dbError.message);
      
      // Fallback to memory storage
      try {
        // Clean up expired entries first
        this.cleanupMemoryExpired();
        
        // Store in memory
        memoryOtpStore.set(key, {
          otpHash: this.hashOTP(otp),
          expiresAt,
          attempts: 0,
          createdAt: new Date()
        });

        console.log(`✅ OTP stored in memory (fallback) for ${key}, expires at ${expiresAt.toLocaleTimeString()}`);
        console.warn('[otpService] ⚠️  Using memory storage - OTPs will be lost on server restart!');
        return true;

      } catch (memError: any) {
        console.error('[otpService] Memory storage also failed:', memError.message);
        return false;
      }
    }
  },

  /**
   * Verify OTP - checks database first, then memory
   */
  async verifyOTP(identifierRaw: string, inputOtp: string): Promise<boolean> {
    try {
      const identifier = this.normalizeIdentifier(identifierRaw);
      const hashedOTP = this.hashOTP(inputOtp);
      const key = identifier.phone || identifier.email || '';

      if (!key) {
        console.log('❌ Invalid identifier for OTP verification:', identifierRaw);
        return false;
      }

      // Try database first
      try {
        let query = supabase.from('otp_tokens').select('*').eq('otp_hash', hashedOTP);
        if (identifier.phone) query = query.eq('phone', identifier.phone);
        if (identifier.email) query = query.eq('email', identifier.email);

        const { data, error } = await query.maybeSingle();

        if (!error && data) {
          const expiryTime = new Date(data.expires_at);
          if (expiryTime < new Date()) {
            console.log('❌ OTP expired (database):', identifierRaw);
            await supabase.from('otp_tokens').delete().eq('id', data.id);
            return false;
          }

          if (data.attempts && data.attempts >= 3) {
            console.log('❌ Too many attempts (database):', identifierRaw);
            await supabase.from('otp_tokens').delete().eq('id', data.id);
            return false;
          }

          // OTP valid → delete it
          await supabase.from('otp_tokens').delete().eq('id', data.id);
          console.log('✅ OTP verified successfully (database):', identifierRaw);
          return true;
        }
      } catch (dbError) {
        console.warn('[otpService] Database verification failed, checking memory:', (dbError as any).message);
      }

      // Fallback to memory verification
      const memoryRecord = memoryOtpStore.get(key);
      if (!memoryRecord) {
        console.log('❌ OTP not found in memory for:', identifierRaw);
        return false;
      }

      if (memoryRecord.otpHash !== hashedOTP) {
        console.log('❌ OTP hash mismatch in memory for:', identifierRaw);
        return false;
      }

      if (memoryRecord.expiresAt < new Date()) {
        console.log('❌ OTP expired (memory):', identifierRaw);
        memoryOtpStore.delete(key);
        return false;
      }

      if (memoryRecord.attempts >= 3) {
        console.log('❌ Too many attempts (memory):', identifierRaw);
        memoryOtpStore.delete(key);
        return false;
      }

      // OTP valid → delete it
      memoryOtpStore.delete(key);
      console.log('✅ OTP verified successfully (memory):', identifierRaw);
      return true;

    } catch (err) {
      console.error('[otpService] Error verifying OTP:', err);
      return false;
    }
  },

  cleanupMemoryExpired(): void {
    const now = new Date();
    for (const [key, record] of memoryOtpStore.entries()) {
      if (record.expiresAt < now) {
        memoryOtpStore.delete(key);
      }
    }
  },

  async incrementAttempts(identifierRaw: string): Promise<void> {
    try {
      const identifier = this.normalizeIdentifier(identifierRaw);
      const key = identifier.phone || identifier.email || '';

      // Try database first
      try {
        let q = supabase.from('otp_tokens').select('id, attempts');
        if (identifier.phone) q = q.eq('phone', identifier.phone);
        if (identifier.email) q = q.eq('email', identifier.email);

        const { data: otpRecord } = await q.maybeSingle();

        if (otpRecord) {
          await supabase
            .from('otp_tokens')
            .update({ attempts: (otpRecord.attempts || 0) + 1 })
            .eq('id', otpRecord.id);
          return;
        }
      } catch (dbError) {
        console.warn('[otpService] Database increment failed, trying memory');
      }

      // Fallback to memory
      const memoryRecord = memoryOtpStore.get(key);
      if (memoryRecord) {
        memoryRecord.attempts++;
        memoryOtpStore.set(key, memoryRecord);
      }
    } catch (err) {
      console.error('[otpService] Error incrementing attempts:', err);
    }
  },

  async hasActiveOTP(identifierRaw: string): Promise<boolean> {
    try {
      const identifier = this.normalizeIdentifier(identifierRaw);
      const key = identifier.phone || identifier.email || '';

      // Try database first
      try {
        let q = supabase.from('otp_tokens').select('expires_at');
        if (identifier.phone) q = q.eq('phone', identifier.phone);
        if (identifier.email) q = q.eq('email', identifier.email);
        q = q.gt('expires_at', new Date().toISOString());

        const { data, error } = await q.maybeSingle();
        if (!error && data) return true;
      } catch (dbError) {
        // Continue to memory check
      }

      // Check memory
      const memoryRecord = memoryOtpStore.get(key);
      return !!(memoryRecord && memoryRecord.expiresAt > new Date());
    } catch {
      return false;
    }
  },

  async getOTPExpiry(identifierRaw: string): Promise<Date | null> {
    try {
      const identifier = this.normalizeIdentifier(identifierRaw);
      const key = identifier.phone || identifier.email || '';

      // Try database first
      try {
        let q = supabase.from('otp_tokens').select('expires_at');
        if (identifier.phone) q = q.eq('phone', identifier.phone);
        if (identifier.email) q = q.eq('email', identifier.email);

        const { data, error } = await q.maybeSingle();
        if (!error && data) return new Date(data.expires_at);
      } catch (dbError) {
        // Continue to memory check
      }

      // Check memory
      const memoryRecord = memoryOtpStore.get(key);
      return memoryRecord ? memoryRecord.expiresAt : null;
    } catch {
      return null;
    }
  },

  async cleanupExpired(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('otp_tokens')
        .delete()
        .lt('expires_at', new Date().toISOString())
        .select();
      if (error) {
        console.error('[otpService] Failed to cleanup expired OTPs:', error);
      } else {
        console.log(`✅ Cleaned up ${data?.length || 0} expired OTPs`);
      }
    } catch (err) {
      console.error('[otpService] Error in cleanup:', err);
    }
    
    // Also cleanup memory
    this.cleanupMemoryExpired();
  },

  async resendOTP(identifierRaw: string): Promise<string> {
    const existingExpiry = await this.getOTPExpiry(identifierRaw);

    if (existingExpiry) {
      const timeSinceCreation =
        Date.now() - (existingExpiry.getTime() - 5 * 60 * 1000);
      if (timeSinceCreation < 30 * 1000) {
        throw new Error('Please wait 30 seconds before requesting a new OTP');
      }
    }

    const newOTP = this.generateOTP();
    await this.storeOTP(identifierRaw, newOTP);
    return newOTP;
  },

  validatePhoneNumber(phone: string): boolean {
    const cleaned = String(phone).replace(/\D/g, '');
    if (cleaned.length === 10) return /^[6-9]\d{9}$/.test(cleaned);
    if (cleaned.length === 12) return /^91[6-9]\d{9}$/.test(cleaned);
    return false;
  },

  formatPhoneForStorage(phone: string): string {
    const cleaned = String(phone).replace(/\D/g, '');
    if (cleaned.startsWith('91') && cleaned.length === 12) return cleaned.substring(2);
    return cleaned;
  },
};