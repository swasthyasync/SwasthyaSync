// packages/api/src/db/supabaseClient.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Import and setup node-fetch for Node.js compatibility
import fetch, { Headers, Request, Response } from 'node-fetch';

// Polyfill fetch for Node.js environment
if (!globalThis.fetch) {
  globalThis.fetch = fetch as any;
  globalThis.Headers = Headers as any;
  globalThis.Request = Request as any;
  globalThis.Response = Response as any;
}

dotenv.config();

const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '').trim();

function mask(s: string | undefined, leave = 6) {
  if (!s) return '<missing>';
  if (s.length <= leave * 2) return s;
  return `${s.slice(0, leave)}...${s.slice(-leave)}`;
}

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    `Missing Supabase environment variables. SUPABASE_URL=${mask(supabaseUrl)} SUPABASE_KEY=${mask(supabaseServiceKey)}`
  );
}

console.log(`[supabaseClient] Initializing with URL: ${mask(supabaseUrl)} and key: ${mask(supabaseServiceKey)}`);

// Custom fetch with better error handling and timeout
const customFetch = async (url: string, options: any = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new Error('Request timeout: Unable to reach Supabase servers');
    }
    
    if (error.code === 'ENOTFOUND') {
      throw new Error(`DNS resolution failed for ${new URL(url).hostname}. Check your internet connection and DNS settings.`);
    }
    
    throw error;
  }
};

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  global: {
    fetch: customFetch as any,
  },
});

// Global flag to track if connection is working
let isConnectionHealthy = false;

/* Network connectivity check with detailed diagnostics */
(async function networkConnectivityCheck() {
  try {
    console.log('[supabaseClient] Starting network connectivity test...');
    
    // First, test basic DNS resolution
    const hostname = new URL(supabaseUrl).hostname;
    console.log(`[supabaseClient] Testing DNS resolution for: ${hostname}`);
    
    const start = Date.now();
    
    // Try a simple connection test first
    const testUrl = `${supabaseUrl}/rest/v1/`;
    const testResponse = await customFetch(testUrl, {
      method: 'GET',
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
    });
    
    const elapsed = Date.now() - start;
    
    if (testResponse.ok) {
      console.log(`[supabaseClient] ✅ Network connection successful! elapsed=${elapsed}ms`);
      isConnectionHealthy = true;
      
      // Now test database access
      try {
        const dbTest = await supabase
          .from('otp_tokens')
          .select('id')
          .limit(1)
          .maybeSingle();
        
        if (dbTest.error) {
          if (dbTest.error.code === 'PGRST116') {
            console.log('[supabaseClient] ⚠️  Table "otp_tokens" not found. Please create it in your Supabase dashboard.');
          } else {
            console.error('[supabaseClient] Database access error:', dbTest.error.message);
          }
        } else {
          console.log('[supabaseClient] ✅ Database access working correctly!');
        }
      } catch (dbErr: any) {
        console.error('[supabaseClient] Database test failed:', dbErr.message);
      }
    } else {
      console.error(`[supabaseClient] ❌ HTTP error ${testResponse.status}: ${testResponse.statusText}`);
    }
    
  } catch (e: any) {
    console.error('[supabaseClient] ❌ Network connectivity test failed:');
    console.error('  Error:', e?.message || e);
    console.error('  URL:', mask(supabaseUrl));
    
    // Provide specific troubleshooting based on error type
    if (e?.message?.includes('DNS resolution failed')) {
      console.error('\n🔧 DNS TROUBLESHOOTING:');
      console.error('  1. Check your internet connection');
      console.error('  2. Try changing DNS servers to 8.8.8.8 and 8.8.4.4');
      console.error('  3. Run: ipconfig /flushdns (Windows) or sudo dscacheutil -flushcache (Mac)');
      console.error('  4. Disable VPN temporarily if using one');
      console.error('  5. Check if firewall/antivirus is blocking the connection');
    } else if (e?.message?.includes('timeout')) {
      console.error('\n🔧 TIMEOUT TROUBLESHOOTING:');
      console.error('  1. Check your internet speed');
      console.error('  2. Try connecting from a different network');
      console.error('  3. Check if your ISP is blocking Supabase');
    }
    
    console.warn('\n[supabaseClient] ⚠️  Server will continue but database operations will fail.');
    console.warn('[supabaseClient] Please fix network connectivity for OTP functionality to work.');
  }
})();

// Export a function to check connection health
export const isSupabaseHealthy = () => isConnectionHealthy;