-- ====================================================================
-- منصة «دلنّي» العقارية اليمنية - Dalani Real Estate Platform
-- ملف ترحيل وتكامل الجداول غير المربوطة (المفضلة، أعضاء المنشأة، حوكمة النظام، سجل التدقيق)
-- الإصدار: 3.0.0 Complete Persistence & Governance Migration
-- التاريخ: 2026-10-30
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. جدول مفضلة المستخدمين (public.user_favorites)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_favorites (
    id VARCHAR(128) PRIMARY KEY DEFAULT 'fav-' || uuid_generate_v4()::text,
    user_id VARCHAR(128) NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    listing_id VARCHAR(128) NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_listing_favorite UNIQUE (user_id, listing_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user ON public.user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_listing ON public.user_favorites(listing_id);

-- --------------------------------------------------------------------
-- 2. جدول أعضاء المنشآت العقارية (public.organization_members)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organization_members (
    id VARCHAR(128) PRIMARY KEY DEFAULT 'mem-' || uuid_generate_v4()::text,
    organization_id VARCHAR(128) NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id VARCHAR(128) REFERENCES public.users(id) ON DELETE SET NULL,
    member_name VARCHAR(255) NOT NULL,
    member_phone VARCHAR(64) NOT NULL,
    role_in_org VARCHAR(64) NOT NULL DEFAULT 'agent' CHECK (role_in_org IN ('manager', 'agent', 'assistant')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    assigned_listing_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_members_org ON public.organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON public.organization_members(user_id);

-- --------------------------------------------------------------------
-- 3. جدول موظفي النظام والدعم والرقابة (public.staff_members)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.staff_members (
    id VARCHAR(128) PRIMARY KEY DEFAULT 'stf-' || uuid_generate_v4()::text,
    user_id VARCHAR(128) REFERENCES public.users(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(64) NOT NULL,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(64) NOT NULL CHECK (role IN ('system_admin', 'moderator', 'support', 'legal_auditor', 'financial_auditor')),
    department VARCHAR(64) NOT NULL CHECK (department IN ('moderation', 'verification', 'support', 'disputes', 'system_admin', 'governance')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_user ON public.staff_members(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_email ON public.staff_members(email);

-- --------------------------------------------------------------------
-- 4. جدول حظر عناوين IP والأمان (public.ip_blocks)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ip_blocks (
    id VARCHAR(128) PRIMARY KEY DEFAULT 'ipb-' || uuid_generate_v4()::text,
    ip_address VARCHAR(64) NOT NULL UNIQUE,
    reason TEXT NOT NULL,
    blocked_by VARCHAR(128) REFERENCES public.users(id) ON DELETE SET NULL,
    blocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_ip_blocks_active ON public.ip_blocks(ip_address) WHERE is_active = TRUE;

-- --------------------------------------------------------------------
-- 5. جدول إعدادات وميزات النظام (public.system_settings)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.system_settings (
    key VARCHAR(128) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 6. جدول سجل التدقيق الإداري (public.audit_logs - Append Only)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id VARCHAR(128) PRIMARY KEY DEFAULT 'log-' || uuid_generate_v4()::text,
    user_id VARCHAR(128) REFERENCES public.users(id) ON DELETE SET NULL,
    user_name VARCHAR(255) NOT NULL,
    user_role VARCHAR(64) NOT NULL,
    action VARCHAR(255) NOT NULL,
    target_type VARCHAR(64) NOT NULL,
    target_id VARCHAR(128) NOT NULL,
    result VARCHAR(32) NOT NULL CHECK (result IN ('success', 'warning', 'denied')),
    details TEXT,
    ip_address VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_user ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_target ON public.audit_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.audit_logs(created_at DESC);

-- --------------------------------------------------------------------
-- 7. تفعيل سياسات الأمان RLS للجداول الحسابية المفتوحة
-- --------------------------------------------------------------------
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 7.1 سياسات المفضلة
DROP POLICY IF EXISTS favorites_owner_policy ON public.user_favorites;
CREATE POLICY favorites_owner_policy ON public.user_favorites
    FOR ALL
    USING (
        user_id = auth.uid()::text OR
        EXISTS (
            SELECT 1 FROM public.users u 
            WHERE u.id = user_favorites.user_id 
              AND u.supabase_user_id = auth.uid()::text
        )
    );

-- 7.2 سياسات أعضاء المنشأة
DROP POLICY IF EXISTS org_members_read_policy ON public.organization_members;
CREATE POLICY org_members_read_policy ON public.organization_members
    FOR SELECT
    USING (TRUE);

DROP POLICY IF EXISTS org_members_write_policy ON public.organization_members;
CREATE POLICY org_members_write_policy ON public.organization_members
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE (u.id = auth.uid()::text OR u.supabase_user_id = auth.uid()::text)
              AND u.role IN ('system_admin', 'organization_manager', 'moderator')
        )
    );

-- 7.3 سياسات التدقيق والحوكمة (Append-only لحفظ السلامة)
DROP POLICY IF EXISTS audit_logs_read_policy ON public.audit_logs;
CREATE POLICY audit_logs_read_policy ON public.audit_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE (u.id = auth.uid()::text OR u.supabase_user_id = auth.uid()::text)
              AND u.role IN ('system_admin', 'moderator', 'support')
        )
    );

DROP POLICY IF EXISTS audit_logs_insert_policy ON public.audit_logs;
CREATE POLICY audit_logs_insert_policy ON public.audit_logs
    FOR INSERT
    WITH CHECK (TRUE);

-- --------------------------------------------------------------------
-- 8. تفعيل النقل والتحديث الفوري (Supabase Realtime)
-- --------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.user_favorites;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.organization_members;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_members;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.system_settings;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Realtime publication updated safely.';
END $$;
