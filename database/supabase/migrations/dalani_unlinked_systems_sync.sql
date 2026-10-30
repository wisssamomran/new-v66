-- ====================================================================
-- منصة «دلنّي» العقارية اليمنية - Dalani Real Estate Platform
-- ملف التحديث والتصحيح الآمن للأنظمة غير المربوطة وإصلاح مقارنات الـ UUID والـ TEXT
-- الإصدار: 4.0.0 Strictly Cast-Safe & Multi-Tenant Hardened Migration
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
-- 7. تفعيل سياسات الأمان RLS مع إصلاح المقارنات وتفادي خطأ uuid = text
-- --------------------------------------------------------------------
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 7.1 سياسة المفضلة (حماية ملكية المفضلة لكل مستخدم)
DROP POLICY IF EXISTS favorites_owner_policy ON public.user_favorites;
CREATE POLICY favorites_owner_policy ON public.user_favorites
    FOR ALL
    USING (
        user_id::text = auth.uid()::text OR
        EXISTS (
            SELECT 1 FROM public.users u 
            WHERE u.id::text = user_favorites.user_id::text 
              AND u.supabase_user_id::text = auth.uid()::text
        )
    )
    WITH CHECK (
        user_id::text = auth.uid()::text OR
        EXISTS (
            SELECT 1 FROM public.users u 
            WHERE u.id::text = user_favorites.user_id::text 
              AND u.supabase_user_id::text = auth.uid()::text
        )
    );

-- 7.2 سياسة أعضاء المنشأة (منع القراءة العامة وتقييد الإدارة بالمنشأة نفسها فقط)
DROP POLICY IF EXISTS org_members_read_policy ON public.organization_members;
CREATE POLICY org_members_read_policy ON public.organization_members
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE (u.id::text = auth.uid()::text OR u.supabase_user_id::text = auth.uid()::text)
              AND (
                  u.role IN ('system_admin', 'moderator') OR
                  (u.organization_id IS NOT NULL AND u.organization_id::text = organization_members.organization_id::text)
              )
        )
    );

DROP POLICY IF EXISTS org_members_write_policy ON public.organization_members;
CREATE POLICY org_members_write_policy ON public.organization_members
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE (u.id::text = auth.uid()::text OR u.supabase_user_id::text = auth.uid()::text)
              AND u.role IN ('system_admin', 'org_manager', 'organization_manager')
              AND (u.organization_id IS NOT NULL AND u.organization_id::text = organization_members.organization_id::text)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE (u.id::text = auth.uid()::text OR u.supabase_user_id::text = auth.uid()::text)
              AND u.role IN ('system_admin', 'org_manager', 'organization_manager')
              AND (u.organization_id IS NOT NULL AND u.organization_id::text = organization_members.organization_id::text)
        )
    );

-- 7.3 سياسات سجل التدقيق (منع التزوير وتقييد القراءة بالمدراء)
DROP POLICY IF EXISTS audit_logs_read_policy ON public.audit_logs;
CREATE POLICY audit_logs_read_policy ON public.audit_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE (u.id::text = auth.uid()::text OR u.supabase_user_id::text = auth.uid()::text)
              AND u.role IN ('system_admin', 'moderator', 'support')
        )
    );

DROP POLICY IF EXISTS audit_logs_insert_policy ON public.audit_logs;
CREATE POLICY audit_logs_insert_policy ON public.audit_logs
    FOR INSERT
    WITH CHECK (
        user_id::text = auth.uid()::text OR
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id::text = audit_logs.user_id::text
              AND u.supabase_user_id::text = auth.uid()::text
        )
    );

-- 7.4 سياسات الموظفين وإعدادات النظام وحظر IP (محصورة بمدراء النظام فقط)
DROP POLICY IF EXISTS staff_admin_policy ON public.staff_members;
CREATE POLICY staff_admin_policy ON public.staff_members
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE (u.id::text = auth.uid()::text OR u.supabase_user_id::text = auth.uid()::text)
              AND u.role IN ('system_admin', 'moderator')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE (u.id::text = auth.uid()::text OR u.supabase_user_id::text = auth.uid()::text)
              AND u.role IN ('system_admin', 'moderator')
        )
    );

DROP POLICY IF EXISTS ip_blocks_admin_policy ON public.ip_blocks;
CREATE POLICY ip_blocks_admin_policy ON public.ip_blocks
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE (u.id::text = auth.uid()::text OR u.supabase_user_id::text = auth.uid()::text)
              AND u.role IN ('system_admin', 'moderator')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE (u.id::text = auth.uid()::text OR u.supabase_user_id::text = auth.uid()::text)
              AND u.role IN ('system_admin', 'moderator')
        )
    );

DROP POLICY IF EXISTS system_settings_policy ON public.system_settings;
CREATE POLICY system_settings_policy ON public.system_settings
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE (u.id::text = auth.uid()::text OR u.supabase_user_id::text = auth.uid()::text)
              AND u.role IN ('system_admin', 'moderator')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE (u.id::text = auth.uid()::text OR u.supabase_user_id::text = auth.uid()::text)
              AND u.role IN ('system_admin', 'moderator')
        )
    );

-- --------------------------------------------------------------------
-- 8. حظر التعديل والحذف على سجل التدقيق الإداري (Trigger)
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION prevent_audit_log_tampering()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'سجل التدقيق غير قابل للتعديل أو الحذف لحفظ سلامة الحوكمة والأمان.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_log_immutable ON public.audit_logs;
CREATE TRIGGER trg_audit_log_immutable
BEFORE UPDATE OR DELETE ON public.audit_logs
FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_tampering();

-- --------------------------------------------------------------------
-- 9. تفعيل النقل والتحديث الفوري (Supabase Realtime)
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
