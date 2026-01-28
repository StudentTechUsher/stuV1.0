/**
 * Script to create a test user for E2E testing
 * Run with: tsx e2e/setup-test-user.ts
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!;
const testEmail = process.env.E2E_TEST_EMAIL || 'e2e-test@example.com';
const testPassword = process.env.E2E_TEST_PASSWORD || 'TestPassword123!';

async function setupTestUser() {
  console.log('🔧 Setting up E2E test user...');

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials in .env file');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users.find((u) => u.email === testEmail);

    if (existingUser) {
      console.log(`✅ Test user already exists: ${testEmail}`);
      console.log(`   User ID: ${existingUser.id}`);

      // Update password for existing user (in case it wasn't set)
      console.log('🔄 Updating password for test user...');
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        existingUser.id,
        { password: testPassword }
      );

      if (updateError) {
        console.error('❌ Failed to update password:', updateError.message);
        process.exit(1);
      }

      console.log('✅ Password updated successfully');
      return;
    }

    // Create new test user
    const { data, error } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        first_name: 'Test',
        last_name: 'User',
      },
    });

    if (error) {
      console.error('❌ Failed to create test user:', error.message);
      process.exit(1);
    }

    console.log(`✅ Test user created successfully: ${testEmail}`);
    console.log(`   User ID: ${data.user.id}`);
    console.log(`   Email confirmed: ${data.user.email_confirmed_at ? 'Yes' : 'No'}`);
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

setupTestUser();
