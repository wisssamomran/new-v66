import { SupabaseAdapter } from '../src/services/supabaseAdapter';

async function testPersistenceMethods() {
  console.log('=====================================================');
  console.log('🧪 TESTING UNLINKED SYSTEMS PERSISTENCE METHODS');
  console.log('=====================================================\n');

  console.log('1. Testing method availability on SupabaseAdapter:');
  const methods = [
    'fetchFavorites',
    'toggleFavoriteInDb',
    'fetchOrgMembers',
    'addOrgMemberInDb',
    'toggleOrgMemberStatusInDb',
    'assignListingAgentInDb',
    'fetchStaffMembersInDb',
    'addStaffMemberInDb',
    'updateStaffPermissionsInDb',
    'fetchIpBlocksInDb',
    'blockIpInDb',
    'unblockIpInDb',
    'logAuditActionInDb',
    'fetchAuditLogsInDb'
  ];

  for (const m of methods) {
    if (typeof (SupabaseAdapter as any)[m] !== 'function') {
      console.error(`❌ FAILED: Method ${m} is missing on SupabaseAdapter`);
      process.exit(1);
    }
    console.log(`  ✅ Method available: SupabaseAdapter.${m}()`);
  }

  console.log('\n2. Testing graceful degradation when Supabase client is not connected:');
  const isConfigured = SupabaseAdapter.isConfigured();
  console.log(`  - Supabase client isConfigured: ${isConfigured}`);

  const favRes = await SupabaseAdapter.fetchFavorites('usr-test-1');
  console.log(`  - fetchFavorites test result: success=${favRes.success}`);

  const auditRes = await SupabaseAdapter.logAuditActionInDb({
    id: 'log-test-1',
    timestamp: new Date().toISOString(),
    userId: 'usr-sys-admin',
    userName: 'مدير النظام الفعلي',
    userRole: 'system_admin',
    action: 'اختبار الحوكمة',
    targetType: 'security',
    targetId: 'sys-1',
    result: 'success',
    details: 'اختبار تسجيل الحوكمة'
  });
  console.log(`  - logAuditActionInDb test result: success=${auditRes.success}`);

  console.log('\n=====================================================');
  console.log('🎉 ALL PERSISTENCE METHOD TESTS COMPLETED SUCCESSFULLY!');
  console.log('=====================================================\n');
  process.exit(0);
}

testPersistenceMethods().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
