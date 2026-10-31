import { getPostgresClient } from '../src/server/supabaseServer';

async function grantPrivileges() {
  console.log('Granting schema and table privileges to anon, authenticated, service_role...');
  const sql = getPostgresClient();
  if (!sql) {
    console.error('Failed to get postgres client');
    process.exit(1);
  }

  try {
    await sql`GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;`;
    await sql`GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;`;
    await sql`GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;`;
    await sql`GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;`;
    await sql`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;`;
    await sql`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;`;
    await sql`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;`;
    console.log('✅ SUCCESS: Granted all table & schema privileges to anon, authenticated, and service_role!');
  } catch (err: any) {
    console.error('❌ Error granting privileges:', err.message);
  }
}

grantPrivileges();
