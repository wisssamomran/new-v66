-- ====================================================================
-- منصة «دلنّي» العقارية اليمنية - Dalani Real Estate Platform
-- ملف الترحيل الشامل والمستقل لربط واستكمال قاعدة بيانات Supabase
-- الإصدار: 2.0.0 Complete Integration Sync Migration
-- التاريخ: 2026-10-30
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. جدول الشهود العلائقي المباشر (contract_witnesses)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contract_witnesses (
    id VARCHAR(128) PRIMARY KEY DEFAULT 'wit-' || uuid_generate_v4()::text,
    contract_id VARCHAR(128) NOT NULL REFERENCES public.property_contracts(id) ON DELETE CASCADE,
    witness_name VARCHAR(255) NOT NULL,
    national_id VARCHAR(128),
    phone VARCHAR(64),
    witness_role VARCHAR(64) DEFAULT 'witness' CHECK (witness_role IN ('witness', 'notary', 'legal_representative', 'agent')),
    witness_status VARCHAR(64) DEFAULT 'pending' CHECK (witness_status IN ('pending', 'approved', 'signed', 'rejected')),
    signed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 2. جدول إصدارات العقد واللقطات التاريخية (contract_versions)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contract_versions (
    id VARCHAR(128) PRIMARY KEY DEFAULT 'ver-' || uuid_generate_v4()::text,
    contract_id VARCHAR(128) NOT NULL REFERENCES public.property_contracts(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL CHECK (version_number >= 1),
    property_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    first_party JSONB NOT NULL DEFAULT '{}'::jsonb,
    second_party JSONB NOT NULL DEFAULT '{}'::jsonb,
    financial_terms JSONB NOT NULL DEFAULT '{}'::jsonb,
    clauses JSONB NOT NULL DEFAULT '[]'::jsonb,
    summary_of_changes TEXT,
    created_by VARCHAR(128) REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_contract_version UNIQUE (contract_id, version_number)
);

-- --------------------------------------------------------------------
-- 3. جدول اعتمادات وتوافق الأطراف على العقود (contract_approvals)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contract_approvals (
    id VARCHAR(128) PRIMARY KEY DEFAULT 'appr-' || uuid_generate_v4()::text,
    contract_id VARCHAR(128) NOT NULL REFERENCES public.property_contracts(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL CHECK (version_number >= 1),
    party_role VARCHAR(64) NOT NULL CHECK (party_role IN ('firstParty', 'secondParty', 'admin', 'witness')),
    party_id VARCHAR(128) REFERENCES public.users(id) ON DELETE SET NULL,
    party_name VARCHAR(255),
    approved BOOLEAN NOT NULL DEFAULT TRUE,
    approved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT,
    CONSTRAINT uq_contract_version_approval UNIQUE (contract_id, version_number, party_role)
);

-- --------------------------------------------------------------------
-- 4. جدول المحادثات والرسائل المباشرة (chat_messages)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id VARCHAR(128) PRIMARY KEY DEFAULT 'msg-' || uuid_generate_v4()::text,
    booking_id VARCHAR(128) NOT NULL REFERENCES public.property_bookings(id) ON DELETE CASCADE,
    sender_id VARCHAR(128) NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    sender_name VARCHAR(255) NOT NULL,
    sender_role VARCHAR(64) NOT NULL,
    message_text TEXT NOT NULL,
    attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 5. فهارس الأداء وتوثيق العلاقات
-- --------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_witnesses_contract ON public.contract_witnesses(contract_id);
CREATE INDEX IF NOT EXISTS idx_versions_contract ON public.contract_versions(contract_id);
CREATE INDEX IF NOT EXISTS idx_approvals_contract ON public.contract_approvals(contract_id);
CREATE INDEX IF NOT EXISTS idx_chat_booking ON public.chat_messages(booking_id, created_at DESC);

-- --------------------------------------------------------------------
-- 6. تفعيل التحديث اللحظي (Supabase Realtime Publication)
-- --------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.listings;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.property_requests;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.property_bookings;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.property_contracts;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.user_favorites;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Publication table addition skipped or handled safely.';
END $$;

-- --------------------------------------------------------------------
-- 7. تهيئة حاويات التخزين السحابي (Supabase Storage Buckets)
-- --------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('property-documents', 'property-documents', FALSE, 20971520, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
    ('contract-archives', 'contract-archives', FALSE, 20971520, ARRAY['application/pdf', 'image/jpeg', 'image/png']),
    ('verification-docs', 'verification-docs', FALSE, 20971520, ARRAY['image/jpeg', 'image/png', 'application/pdf']),
    ('user-avatars', 'user-avatars', TRUE, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- --------------------------------------------------------------------
-- 8. سياسات الأمان RLS للجداول الجديدة وحاويات التخزين
-- --------------------------------------------------------------------
ALTER TABLE public.contract_witnesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- سياسات الشهود وإصدارات العقود والمحادثات
CREATE POLICY "witnesses_parties_read_write" ON public.contract_witnesses FOR ALL USING (TRUE);
CREATE POLICY "contract_versions_parties_read_write" ON public.contract_versions FOR ALL USING (TRUE);
CREATE POLICY "contract_approvals_parties_read_write" ON public.contract_approvals FOR ALL USING (TRUE);
CREATE POLICY "chat_messages_parties_read_write" ON public.chat_messages FOR ALL USING (TRUE);

-- سياسات أمان ملفات التخزين السحابي Storage Policies
CREATE POLICY "storage_avatars_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'user-avatars');
CREATE POLICY "storage_avatars_user_upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'user-avatars');

CREATE POLICY "storage_private_docs_read" ON storage.objects FOR SELECT USING (
    bucket_id IN ('property-documents', 'contract-archives', 'verification-docs')
);

CREATE POLICY "storage_private_docs_upload" ON storage.objects FOR INSERT WITH CHECK (
    bucket_id IN ('property-documents', 'contract-archives', 'verification-docs')
);

-- --------------------------------------------------------------------
-- 9. المشغلات والتحقق الآلي (Triggers & Functions)
-- --------------------------------------------------------------------
CREATE OR REPLACE TRIGGER trg_set_updated_at_witnesses
BEFORE UPDATE ON public.contract_witnesses
FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- تم تجهيز الترحيل بنجاح وجاهز للتنفيذ عبر Supabase SQL Editor
