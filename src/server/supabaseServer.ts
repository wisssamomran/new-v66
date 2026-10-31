import { createClient, SupabaseClient } from '@supabase/supabase-js';
import postgres from 'postgres';
import { BlockedIp, User } from '../types';

const rawConn = (
  (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres'))
    ? process.env.DATABASE_URL
    : (process.env.VITE_SUPABASE_ANON_KEY && process.env.VITE_SUPABASE_ANON_KEY.startsWith('postgres'))
    ? process.env.VITE_SUPABASE_ANON_KEY
    : ''
);

let pgSql: ReturnType<typeof postgres> | null = null;

export function getPostgresClient(): ReturnType<typeof postgres> | null {
  if (!pgSql && rawConn) {
    try {
      pgSql = postgres(rawConn, { ssl: 'require', connect_timeout: 10 });
    } catch (err) {
      console.warn('[Postgres Direct] Connection initialization failed:', err);
    }
  }
  return pgSql;
}

const SUPABASE_URL = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://xoqfdzemtcpxqracygnb.supabase.co')
  .replace(/\/rest\/v1\/?$/, '')
  .replace(/\/$/, '');

const SUPABASE_KEY = (
  (process.env.VITE_SUPABASE_ANON_KEY && !process.env.VITE_SUPABASE_ANON_KEY.startsWith('postgres'))
    ? process.env.VITE_SUPABASE_ANON_KEY
    : process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvcWZkemVtdGNweHFyYWN5Z25iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwMDk4NjIsImV4cCI6MjEwODU4NTg2Mn0.AT4x-Z5EtZyiS4MzoV7E0ty162MWKuGpRdlRk98rHl'
);

let supabaseServerClient: SupabaseClient | null = null;

export function getSupabaseServer(): SupabaseClient {
  if (!supabaseServerClient) {
    supabaseServerClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }
  return supabaseServerClient;
}

// In-Memory cache for Blocked IPs with TTL (30 seconds) to ensure sub-millisecond middleware latency
interface BlockedIpCache {
  ips: Set<string>;
  lastFetched: number;
}

const ipCache: BlockedIpCache = {
  ips: new Set<string>(),
  lastFetched: 0
};

const CACHE_TTL_MS = 30_000;

export async function refreshBlockedIpsCache(): Promise<Set<string>> {
  const pg = getPostgresClient();
  if (pg) {
    try {
      const rows = await pg`
        SELECT ip_address, is_active FROM public.ip_blocks WHERE is_active = true;
      `;
      ipCache.ips = new Set(rows.map(r => String(r.ip_address).trim().toLowerCase()));
      ipCache.lastFetched = Date.now();
      return ipCache.ips;
    } catch (err) {
      console.warn('[Postgres Direct] Failed to fetch ip_blocks:', err);
    }
  }

  try {
    const client = getSupabaseServer();
    const { data, error } = await client
      .from('ip_blocks')
      .select('*');

    if (!error && data) {
      const activeIps = data
        .filter((row: any) => row.is_active !== false)
        .map((row: any) => String(row.ip_address || row.ip || '').trim().toLowerCase())
        .filter(Boolean);
      ipCache.ips = new Set(activeIps);
      ipCache.lastFetched = Date.now();
    }
  } catch (err) {
    console.warn('[Supabase Server] Failed to fetch ip_blocks from database:', err);
  }
  return ipCache.ips;
}

export async function isIpBlockedInDatabase(clientIp: string): Promise<boolean> {
  if (!clientIp) return false;
  const normalized = clientIp.trim().toLowerCase();

  // If cache is stale, refresh in background
  if (Date.now() - ipCache.lastFetched > CACHE_TTL_MS) {
    refreshBlockedIpsCache().catch(() => {});
  }

  // Fast check
  if (ipCache.ips.has(normalized)) {
    return true;
  }

  // Double check directly if not found in cache and cache was never populated
  if (ipCache.lastFetched === 0) {
    const pg = getPostgresClient();
    if (pg) {
      try {
        const rows = await pg`
          SELECT id FROM public.ip_blocks 
          WHERE ip_address = ${normalized} AND is_active = true 
          LIMIT 1;
        `;
        if (rows.length > 0) {
          ipCache.ips.add(normalized);
          return true;
        }
      } catch {}
    } else {
      try {
        const client = getSupabaseServer();
        const { data } = await client
          .from('ip_blocks')
          .select('id, is_active')
          .eq('ip_address', normalized)
          .limit(1);

        if (data && data.length > 0 && data[0].is_active !== false) {
          ipCache.ips.add(normalized);
          return true;
        }
      } catch {}
    }
  }

  return false;
}

export async function addBlockedIpToDatabase(ip: string, reason: string, blockedBy: string = 'system_admin'): Promise<boolean> {
  const normalized = ip.trim().toLowerCase();
  const pg = getPostgresClient();
  if (pg) {
    try {
      const id = `ipb-${Date.now()}`;
      await pg`
        INSERT INTO public.ip_blocks (id, ip_address, reason, blocked_by, blocked_at, is_active)
        VALUES (${id}, ${normalized}, ${reason}, ${blockedBy}, NOW(), true)
        ON CONFLICT (ip_address) DO UPDATE SET is_active = true, reason = EXCLUDED.reason, blocked_at = NOW();
      `;
      ipCache.ips.add(normalized);
      return true;
    } catch (err) {
      console.warn('[Postgres Direct] Error blocking IP:', err);
    }
  }

  try {
    const client = getSupabaseServer();
    const payload = {
      id: `blk-${Date.now()}`,
      ip_address: normalized,
      reason,
      blocked_by: blockedBy,
      created_at: new Date().toISOString(),
      blocked_at: new Date().toISOString(),
      is_active: true
    };

    const { error } = await client
      .from('ip_blocks')
      .upsert(payload, { onConflict: 'ip_address' });

    if (!error) {
      ipCache.ips.add(normalized);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function removeBlockedIpFromDatabase(ip: string): Promise<boolean> {
  const normalized = ip.trim().toLowerCase();
  const pg = getPostgresClient();
  if (pg) {
    try {
      await pg`
        UPDATE public.ip_blocks 
        SET is_active = false 
        WHERE ip_address = ${normalized};
      `;
      ipCache.ips.delete(normalized);
      return true;
    } catch (err) {
      console.warn('[Postgres Direct] Error unblocking IP:', err);
    }
  }

  try {
    const client = getSupabaseServer();
    const { error } = await client
      .from('ip_blocks')
      .update({ is_active: false })
      .eq('ip_address', normalized);

    if (!error) {
      ipCache.ips.delete(normalized);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function getBlockedIpsFromDatabase(): Promise<BlockedIp[]> {
  const pg = getPostgresClient();
  if (pg) {
    try {
      const rows = await pg`
        SELECT * FROM public.ip_blocks 
        WHERE is_active = true 
        ORDER BY blocked_at DESC;
      `;
      return rows.map((d: any) => ({
        id: d.id,
        ip: d.ip_address || d.ip,
        reason: d.reason || 'حظر أمني تلقائي',
        blockedAt: d.blocked_at ? new Date(d.blocked_at).toISOString() : new Date().toISOString(),
        blockedBy: d.blocked_by || 'system_admin'
      }));
    } catch (err) {
      console.warn('[Postgres Direct] Error fetching blocked IPs:', err);
    }
  }

  try {
    const client = getSupabaseServer();
    const { data, error } = await client
      .from('ip_blocks')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      return data
        .filter((d: any) => d.is_active !== false)
        .map((d: any) => ({
          id: d.id,
          ip: d.ip_address || d.ip,
          reason: d.reason || 'حظر أمني تلقائي',
          blockedAt: d.blocked_at || d.created_at || new Date().toISOString(),
          blockedBy: d.blocked_by || 'system_admin'
        }));
    }
  } catch {}
  return [];
}

// User Profile & Authentication in Supabase
export async function findUserInDatabase(identifier: string): Promise<User | null> {
  if (!identifier) return null;
  const cleanId = identifier.trim();
  const cleanEmail = cleanId.toLowerCase();
  const cleanPhone = cleanId.replace(/[\s\-\(\)\+]/g, '');

  const pg = getPostgresClient();
  if (pg) {
    try {
      const rows = await pg`
        SELECT * FROM public.users 
        WHERE LOWER(email) = ${cleanEmail} 
           OR id = ${cleanId} 
           OR REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '+', '') = ${cleanPhone}
           OR supabase_user_id::text = ${cleanId}
        LIMIT 1;
      `;
      if (rows.length > 0) {
        const data = rows[0];
        return {
          id: data.id,
          supabaseUserId: data.supabase_user_id ? String(data.supabase_user_id) : undefined,
          name: data.name,
          role: data.role,
          email: data.email || undefined,
          phone: data.phone || '',
          phoneVerified: Boolean(data.phone_verified),
          avatarUrl: data.avatar_url || undefined,
          orgId: data.org_id || data.organization_id || undefined,
          orgName: data.org_name || undefined,
          activeStatus: data.active_status ?? true,
          createdAt: data.created_at || new Date().toISOString().split('T')[0]
        };
      }
    } catch (err) {
      console.warn('[Postgres Direct] Error finding user:', err);
    }
  }

  try {
    const client = getSupabaseServer();
    const { data, error } = await client
      .from('users')
      .select('*')
      .or(`email.ilike.${cleanEmail},id.eq.${cleanId},phone.eq.${cleanId},supabase_user_id.eq.${cleanId}`)
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      return {
        id: data.id,
        supabaseUserId: data.supabase_user_id || undefined,
        name: data.name,
        role: data.role,
        email: data.email || undefined,
        phone: data.phone || '',
        phoneVerified: Boolean(data.phone_verified),
        avatarUrl: data.avatar_url || undefined,
        orgId: data.org_id || data.organization_id || undefined,
        orgName: data.org_name || undefined,
        activeStatus: data.active_status ?? true,
        createdAt: data.created_at || new Date().toISOString().split('T')[0]
      };
    }
  } catch (err) {
    console.warn('[Supabase Server] Error finding user:', err);
  }
  return null;
}

export async function updateUserInDatabase(userId: string, updates: Partial<User>): Promise<User | null> {
  const pg = getPostgresClient();
  if (pg) {
    try {
      const existing = await pg`SELECT * FROM public.users WHERE id = ${userId} LIMIT 1;`;
      if (existing.length > 0) {
        const newName = updates.name !== undefined ? updates.name : existing[0].name;
        const newEmail = updates.email !== undefined ? updates.email : existing[0].email;
        const newPhone = updates.phone !== undefined ? updates.phone : existing[0].phone;
        const newAvatar = updates.avatarUrl !== undefined ? updates.avatarUrl : existing[0].avatar_url;
        const newStatus = updates.activeStatus !== undefined ? updates.activeStatus : existing[0].active_status;
        const newOrgId = updates.orgId !== undefined ? updates.orgId : (existing[0].org_id || existing[0].organization_id);
        const newOrgName = updates.orgName !== undefined ? updates.orgName : existing[0].org_name;

        const updated = await pg`
          UPDATE public.users 
          SET name = ${newName},
              email = ${newEmail},
              phone = ${newPhone},
              avatar_url = ${newAvatar},
              active_status = ${newStatus},
              org_id = ${newOrgId},
              org_name = ${newOrgName},
              updated_at = NOW()
          WHERE id = ${userId}
          RETURNING *;
        `;
        if (updated.length > 0) {
          const d = updated[0];
          return {
            id: d.id,
            supabaseUserId: d.supabase_user_id ? String(d.supabase_user_id) : undefined,
            name: d.name,
            role: d.role,
            email: d.email || undefined,
            phone: d.phone || '',
            phoneVerified: Boolean(d.phone_verified),
            avatarUrl: d.avatar_url || undefined,
            orgId: d.org_id || d.organization_id || undefined,
            orgName: d.org_name || undefined,
            activeStatus: d.active_status ?? true,
            createdAt: d.created_at || new Date().toISOString().split('T')[0]
          };
        }
      }
    } catch (err) {
      console.warn('[Postgres Direct] Error updating user:', err);
    }
  }

  try {
    const client = getSupabaseServer();
    const dbUpdates: Record<string, any> = {
      updated_at: new Date().toISOString()
    };

    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.email !== undefined) dbUpdates.email = updates.email;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.avatarUrl !== undefined) dbUpdates.avatar_url = updates.avatarUrl;
    if (updates.activeStatus !== undefined) dbUpdates.active_status = updates.activeStatus;
    if (updates.orgId !== undefined) {
      dbUpdates.org_id = updates.orgId;
      dbUpdates.organization_id = updates.orgId;
    }
    if (updates.orgName !== undefined) dbUpdates.org_name = updates.orgName;

    const { data, error } = await client
      .from('users')
      .update(dbUpdates)
      .eq('id', userId)
      .select('*')
      .maybeSingle();

    if (!error && data) {
      return {
        id: data.id,
        supabaseUserId: data.supabase_user_id || undefined,
        name: data.name,
        role: data.role,
        email: data.email || undefined,
        phone: data.phone || '',
        phoneVerified: Boolean(data.phone_verified),
        avatarUrl: data.avatar_url || undefined,
        orgId: data.org_id || data.organization_id || undefined,
        orgName: data.org_name || undefined,
        activeStatus: data.active_status ?? true,
        createdAt: data.created_at || new Date().toISOString().split('T')[0]
      };
    }
  } catch (err) {
    console.warn('[Supabase Server] Error updating user:', err);
  }
  return null;
}
