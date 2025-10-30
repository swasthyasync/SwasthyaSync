// packages/api/src/db/supabaseClient.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import path from 'path';
import dotenv from 'dotenv';
import crypto from 'crypto';
import fetch from 'node-fetch';

// Always load .env explicitly
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Config values
const supabaseUrl = "https://yrgmfzkfrezfminbdfnz.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyZ21memtmcmV6Zm1pbmJkZm56Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzcwMjMxNiwiZXhwIjoyMDczMjc4MzE2fQ.HrEtLWAy8kz5pkI722K-tiL8Ckp-DHIXcjVzWfpDBuY";

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing required environment variables:');
    if (!supabaseUrl) console.error('   - SUPABASE_URL');
    if (!supabaseServiceKey) console.error('   - SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

function mask(s: string | undefined, leave = 6) {
  if (!s) return '<missing>';
  if (s.length <= leave * 2) return s;
  return `${s.slice(0, leave)}...${s.slice(-leave)}`;
}

console.log('=== SUPABASE CONNECTION DEBUG ===');
console.log('SUPABASE_URL:', mask(supabaseUrl));
console.log('SUPABASE_KEY:', mask(supabaseServiceKey));
console.log('Loaded .env from:', path.resolve(__dirname, '../../.env'));
console.log('DEBUG: process.env.SUPABASE_SERVICE_ROLE_KEY present:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

// Configure fetch with node-fetch implementation
const clientConfig: any = {
    auth: { 
        autoRefreshToken: false, 
        persistSession: false 
    },
    global: { 
        fetch: fetch as any,
        headers: { 'Content-Type': 'application/json' }
    }
};

// Create Supabase client
export const supabase: SupabaseClient = createClient(
    supabaseUrl,
    supabaseServiceKey,
    clientConfig
);

// Test connection
(async function testDatabaseConnection() {
  console.log('\n=== TESTING DATABASE CONNECTION ===');

  try {
    // Test 1: Select
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('id')
      .limit(1);
    if (testError) {
      console.error('❌ Basic connection test failed:', JSON.stringify(testError, null, 2));
    } else {
      console.log('✅ Basic connection successful; sample rows:', testData);
    }

    // Test 2: Insert only if service role present
    if (supabaseServiceKey) {
      console.log('Test 2: Insert capability test...');
      const newId = crypto.randomUUID();
      const { data: insertData, error: insertError } = await supabase
        .from('users')
        .insert({
          id: newId, // safe: valid uuid
          first_name: 'Test',
          last_name: 'User',
          role: 'patient',
          consent_given: true,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        console.error('❌ Insert test failed:', JSON.stringify(insertError, null, 2));
      } else {
        console.log('✅ Insert test successful, new id:', insertData?.id);
        if (insertData?.id) {
          await supabase.from('users').delete().eq('id', insertData.id);
          console.log('🧹 Test row cleaned up');
        }
      }
    } else {
      console.warn('⚠️ Skipping insert test: no service role key');
    }
  } catch (err: any) {
    console.error('❌ Database connection test exception:', err?.message || err);
  }
})();
export const supabaseService = createClient(supabaseUrl, supabaseServiceKey, clientConfig); // service role
export const supabaseAnon = createClient(supabaseUrl, process.env.SUPABASE_ANON_KEY || '', clientConfig); // anon
