import { NEW_SEEKERS } from '../src/data/yemenData';
import { db } from '../src/server/db';

async function runTests() {
  console.log('=====================================================');
  console.log('🚀 DALANI AUTH & USER ISOLATION VERIFICATION TEST');
  console.log('=====================================================\n');

  console.log(`1. Checking registered NEW_SEEKERS list (Count: ${NEW_SEEKERS.length}):`);
  for (const s of NEW_SEEKERS) {
    console.log(`  - [${s.id}] ${s.name} | ${s.email} | ${s.phone} | supabaseUserId: ${s.supabaseUserId}`);
  }

  console.log('\n2. Testing Database user retrieval by Email:');
  for (const s of NEW_SEEKERS) {
    if (!s.email) continue;
    const user = db.getUserByEmailOrPhone(s.email);
    if (!user) {
      console.error(`❌ FAILED: User not found for email ${s.email}`);
      process.exit(1);
    }
    if (user.id !== s.id || user.name !== s.name) {
      console.error(`❌ FAILED: Expected ${s.name} (${s.id}) but got ${user.name} (${user.id})`);
      process.exit(1);
    }
    if (user.id === 'usr-seeker' || user.name.includes('أصيل')) {
      console.error(`❌ FAILED: Returned previous default user أصيل الحكيمي instead of ${s.name}`);
      process.exit(1);
    }
    console.log(`  ✅ Passed: ${s.email} -> ID: ${user.id}, Name: ${user.name}`);
  }

  console.log('\n3. Testing Database user retrieval by Supabase Auth UID (supabase_user_id):');
  for (const s of NEW_SEEKERS) {
    if (!s.supabaseUserId) continue;
    const user = db.getUserBySupabaseId(s.supabaseUserId);
    if (!user) {
      console.error(`❌ FAILED: User not found for Supabase UID ${s.supabaseUserId}`);
      process.exit(1);
    }
    if (user.id !== s.id || user.name !== s.name) {
      console.error(`❌ FAILED: Expected ${s.name} (${s.id}) but got ${user.name} (${user.id})`);
      process.exit(1);
    }
    console.log(`  ✅ Passed: UID ${s.supabaseUserId} -> ID: ${user.id}, Name: ${user.name}`);
  }

  console.log('\n4. Testing Database user retrieval by Phone Number:');
  for (const s of NEW_SEEKERS) {
    if (!s.phone) continue;
    const user = db.getUserByEmailOrPhone(s.phone);
    if (!user) {
      console.error(`❌ FAILED: User not found for phone ${s.phone}`);
      process.exit(1);
    }
    if (user.id !== s.id || user.name !== s.name) {
      console.error(`❌ FAILED: Expected ${s.name} (${s.id}) but got ${user.name} (${user.id})`);
      process.exit(1);
    }
    console.log(`  ✅ Passed: Phone ${s.phone} -> ID: ${user.id}, Name: ${user.name}`);
  }

  console.log('\n5. Testing user data independence:');
  const ids = new Set(NEW_SEEKERS.map(s => s.id));
  const uids = new Set(NEW_SEEKERS.map(s => s.supabaseUserId));
  const emails = new Set(NEW_SEEKERS.map(s => s.email));

  if (ids.size !== 5 || uids.size !== 5 || emails.size !== 5) {
    console.error('❌ FAILED: Non-unique IDs or UIDs detected across seekers!');
    process.exit(1);
  }
  console.log('  ✅ Passed: All 5 seekers have 100% unique IDs, Supabase Auth UIDs, and Emails.');

  console.log('\n=====================================================');
  console.log('🎉 ALL 5 USER LOGIN & BINDING TESTS PASSED PERFECTLY!');
  console.log('=====================================================\n');
  process.exit(0);
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
