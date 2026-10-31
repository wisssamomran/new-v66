-- ====================================================================
-- منصة «دلنّي» العقارية اليمنية - Dalani Real Estate Platform
-- سكريبت التحديث الشامل والتكامل الآمن لمنصة دلنّي وقاعدة بيانات Supabase
-- الإصدار: 5.0.0 Production Schema Sync & Multi-Tenant RLS Hardening
-- التاريخ: 2026-10-31
-- ====================================================================

-- --------------------------------------------------------------------
-- 0.0 تفعيل الملحقات وتثبيت الدوال المساعدة الموثوقة (Helper Functions)
-- --------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 0.1 دالة استخراج معرف المستخدم من الجلسة بتحويل صريح (Cast-Safe User ID)
CREATE OR REPLACE FUNCTION public.dalani_current_user_id()
RETURNS TEXT AS $$
BEGIN
    RETURN COALESCE(auth.uid()::text, '');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 0.2 دالة استخراج دور المستخدم الحقيقي من جدول المستخدمين (User Role Helper)
CREATE OR REPLACE FUNCTION public.dalani_current_user_role()
RETURNS TEXT AS $$
DECLARE
    v_role TEXT;
BEGIN
    SELECT role INTO v_role FROM public.users
    WHERE id::text = auth.uid()::text OR supabase_user_id::text = auth.uid()::text
    LIMIT 1;
    RETURN COALESCE(v_role, 'client');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 0.3 دالة استخراج معرف المنشأة التابع لها المستخدم (Organization ID Helper)
CREATE OR REPLACE FUNCTION public.dalani_current_org_id()
RETURNS TEXT AS $$
DECLARE
    v_org_id TEXT;
BEGIN
    SELECT COALESCE(organization_id, org_id) INTO v_org_id FROM public.users
    WHERE id::text = auth.uid()::text OR supabase_user_id::text = auth.uid()::text
    LIMIT 1;
    RETURN COALESCE(v_org_id, '');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;


-- --------------------------------------------------------------------
-- 1.0 مزامنة أعمدة المنشأة وحسابات المستخدمين في جدول public.users
-- --------------------------------------------------------------------
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS organization_id VARCHAR(128);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS org_id VARCHAR(128);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS supabase_user_id VARCHAR(128);

UPDATE public.users SET organization_id = org_id WHERE organization_id IS NULL AND org_id IS NOT NULL;
UPDATE public.users SET org_id = organization_id WHERE org_id IS NULL AND organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_supabase_user_id ON public.users(supabase_user_id);
CREATE INDEX IF NOT EXISTS idx_users_org_id ON public.users(organization_id);


-- --------------------------------------------------------------------
-- 2.0 جدول مفضلة المستخدمين (public.user_favorites)
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
-- 3.0 جدول أعضاء المنشآت العقارية (public.organization_members)
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
-- 4.0 جدول موظفي النظام والدعم والرقابة (public.staff_members)
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
-- 5.0 جدول حظر عناوين IP والأمان (public.ip_blocks)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ip_blocks (
    id VARCHAR(128) PRIMARY KEY DEFAULT 'ipb-' || uuid_generate_v4()::text,
    ip_address VARCHAR(64) UNIQUE,
    ip VARCHAR(64) UNIQUE,
    reason TEXT NOT NULL,
    blocked_by VARCHAR(128) REFERENCES public.users(id) ON DELETE SET NULL,
    blocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

ALTER TABLE public.ip_blocks ADD COLUMN IF NOT EXISTS ip_address VARCHAR(64);
ALTER TABLE public.ip_blocks ADD COLUMN IF NOT EXISTS ip VARCHAR(64);
UPDATE public.ip_blocks SET ip = ip_address WHERE ip IS NULL AND ip_address IS NOT NULL;
UPDATE public.ip_blocks SET ip_address = ip WHERE ip_address IS NULL AND ip IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ip_blocks_active ON public.ip_blocks(COALESCE(ip_address, ip)) WHERE is_active = TRUE;


-- --------------------------------------------------------------------
-- 6.0 جدول إعدادات وميزات النظام (public.system_settings)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.system_settings (
    key VARCHAR(128) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- --------------------------------------------------------------------
-- 7.0 جدول سجل التدقيق الإداري (public.audit_logs - Append Only)
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
-- 8.0 تفعيل وتحديد سياسات أمان Row Level Security (RLS) الشاملة
-- --------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- 8.1 سياسة المستخدمين (تعديل الملف الشخصي وحفظ الحساب الذاتي)
DROP POLICY IF EXISTS users_read_policy ON public.users;
CREATE POLICY users_read_policy ON public.users FOR SELECT USING (true);

DROP POLICY IF EXISTS users_self_write ON public.users;
CREATE POLICY users_self_write ON public.users
    FOR UPDATE
    USING (
        id::text = auth.uid()::text 
        OR supabase_user_id::text = auth.uid()::text 
        OR public.dalani_current_user_role() IN ('system_admin', 'moderator')
    )
    WITH CHECK (
        (
            id::text = auth.uid()::text 
            OR supabase_user_id::text = auth.uid()::text
        ) AND (
            role IS NULL 
            OR role = (SELECT u_old.role FROM public.users u_old WHERE u_old.id = users.id)
            OR public.dalani_current_user_role() = 'system_admin'
        )
    );

-- 8.2 سياسة المفضلة (معالجة مشكلة المقارنة UUID = TEXT)
DROP POLICY IF EXISTS favorites_owner_policy ON public.user_favorites;
CREATE POLICY favorites_owner_policy ON public.user_favorites
    FOR ALL
    USING (
        user_id::text = auth.uid()::text OR
        EXISTS (
            SELECT 1 FROM public.users u 
            WHERE u.id::text = user_favorites.user_id::text 
              AND (u.supabase_user_id::text = auth.uid()::text OR u.id::text = auth.uid()::text)
        )
    )
    WITH CHECK (
        user_id::text = auth.uid()::text OR
        EXISTS (
            SELECT 1 FROM public.users u 
            WHERE u.id::text = user_favorites.user_id::text 
              AND (u.supabase_user_id::text = auth.uid()::text OR u.id::text = auth.uid()::text)
        )
    );

-- 8.3 سياسة أعضاء المنشآت (منع القراءة العامة وتقييد الإدارة بالمنشأة نفسها فقط)
DROP POLICY IF EXISTS org_members_read_policy ON public.organization_members;
CREATE POLICY org_members_read_policy ON public.organization_members
    FOR SELECT
    USING (
        public.dalani_current_user_role() IN ('system_admin', 'moderator')
        OR (public.dalani_current_org_id() <> '' AND public.dalani_current_org_id() = organization_members.organization_id::text)
    );

DROP POLICY IF EXISTS org_members_write_policy ON public.organization_members;
CREATE POLICY org_members_write_policy ON public.organization_members
    FOR ALL
    USING (
        public.dalani_current_user_role() IN ('system_admin', 'org_manager', 'organization_manager', 'office_admin')
        AND (public.dalani_current_org_id() <> '' AND public.dalani_current_org_id() = organization_members.organization_id::text)
    )
    WITH CHECK (
        public.dalani_current_user_role() IN ('system_admin', 'org_manager', 'organization_manager', 'office_admin')
        AND (public.dalani_current_org_id() <> '' AND public.dalani_current_org_id() = organization_members.organization_id::text)
    );

-- 8.4 سياسات المنشآت العقارية (تعديل وتوثيق المنشأة)
DROP POLICY IF EXISTS orgs_read_policy ON public.organizations;
CREATE POLICY orgs_read_policy ON public.organizations FOR SELECT USING (true);

DROP POLICY IF EXISTS orgs_write ON public.organizations;
CREATE POLICY orgs_write ON public.organizations
    FOR ALL
    USING (
        public.dalani_current_user_role() IN ('system_admin', 'moderator')
        OR (public.dalani_current_org_id() <> '' AND public.dalani_current_org_id() = organizations.id::text AND public.dalani_current_user_role() IN ('org_manager', 'organization_manager', 'office_admin'))
    )
    WITH CHECK (
        public.dalani_current_user_role() IN ('system_admin', 'moderator')
        OR (public.dalani_current_org_id() <> '' AND public.dalani_current_org_id() = organizations.id::text AND public.dalani_current_user_role() IN ('org_manager', 'organization_manager', 'office_admin'))
    );

-- 8.5 سياسات الإعلانات العقارية (إضافة وتعديل للعقار التابع للمعلن المالك)
DROP POLICY IF EXISTS listings_read_policy ON public.listings;
CREATE POLICY listings_read_policy ON public.listings FOR SELECT USING (true);

DROP POLICY IF EXISTS listings_insert_advertisers ON public.listings;
CREATE POLICY listings_insert_advertisers ON public.listings
    FOR INSERT
    WITH CHECK (
        advertiser_id::text = auth.uid()::text
        OR EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id::text = listings.advertiser_id::text
              AND (u.supabase_user_id::text = auth.uid()::text OR u.id::text = auth.uid()::text)
        )
        OR public.dalani_current_user_role() IN ('system_admin', 'moderator')
    );

DROP POLICY IF EXISTS listings_update_owner_or_admin ON public.listings;
CREATE POLICY listings_update_owner_or_admin ON public.listings
    FOR UPDATE
    USING (
        advertiser_id::text = auth.uid()::text
        OR EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id::text = listings.advertiser_id::text
              AND (u.supabase_user_id::text = auth.uid()::text OR u.id::text = auth.uid()::text)
        )
        OR public.dalani_current_user_role() IN ('system_admin', 'moderator')
    );

-- 8.6 سياسات سجل التدقيق (منع التزوير وتقييد الإدراج بالجلسة الفعلية)
DROP POLICY IF EXISTS audit_logs_read_policy ON public.audit_logs;
CREATE POLICY audit_logs_read_policy ON public.audit_logs
    FOR SELECT
    USING (public.dalani_current_user_role() IN ('system_admin', 'moderator', 'support', 'legal_auditor', 'financial_auditor'));

DROP POLICY IF EXISTS audit_logs_insert_policy ON public.audit_logs;
CREATE POLICY audit_logs_insert_policy ON public.audit_logs
    FOR INSERT
    WITH CHECK (
        user_id::text = auth.uid()::text OR
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id::text = audit_logs.user_id::text
              AND (u.supabase_user_id::text = auth.uid()::text OR u.id::text = auth.uid()::text)
        )
    );

-- 8.7 سياسات جداول النظام والحظر والموظفين (محصورة بمدراء النظام والرقابة)
DROP POLICY IF EXISTS staff_admin_policy ON public.staff_members;
CREATE POLICY staff_admin_policy ON public.staff_members
    FOR ALL
    USING (public.dalani_current_user_role() IN ('system_admin', 'moderator'))
    WITH CHECK (public.dalani_current_user_role() IN ('system_admin', 'moderator'));

DROP POLICY IF EXISTS ip_blocks_admin_policy ON public.ip_blocks;
CREATE POLICY ip_blocks_admin_policy ON public.ip_blocks
    FOR ALL
    USING (public.dalani_current_user_role() IN ('system_admin', 'moderator'))
    WITH CHECK (public.dalani_current_user_role() IN ('system_admin', 'moderator'));

DROP POLICY IF EXISTS system_settings_policy ON public.system_settings;
CREATE POLICY system_settings_policy ON public.system_settings
    FOR ALL
    USING (public.dalani_current_user_role() IN ('system_admin', 'moderator'))
    WITH CHECK (public.dalani_current_user_role() IN ('system_admin', 'moderator'));


-- --------------------------------------------------------------------
-- 9.0 حماية سجل التدقيق الإداري من التعديل أو الحذف (Audit Log Immutability Trigger)
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION prevent_audit_log_tampering()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'سجل التدقيق في منصة دلنّي غير قابل للتعديل أو الحذف نهائياً لضمان الحوكمة والسلامة القانونية.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_log_immutable ON public.audit_logs;
CREATE TRIGGER trg_audit_log_immutable
BEFORE UPDATE OR DELETE ON public.audit_logs
FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_tampering();


-- --------------------------------------------------------------------
-- 10.0 أتمتة إغلاق العقار عند اكتمال الحجز أو الصفقة (Automatic Deal Closing)
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_complete_deal_and_close_listing()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status <> 'completed') THEN
        UPDATE public.listings
        SET status = 'sold', updated_at = NOW()
        WHERE id = NEW.listing_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_complete_deal_on_booking ON public.property_bookings;
CREATE TRIGGER trg_complete_deal_on_booking
AFTER UPDATE ON public.property_bookings
FOR EACH ROW EXECUTE FUNCTION fn_complete_deal_and_close_listing();


-- --------------------------------------------------------------------
-- 11.0 تفعيل النقل والتحديث الفوري (Supabase Realtime Subscriptions)
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
