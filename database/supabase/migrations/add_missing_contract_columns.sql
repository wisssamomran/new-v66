-- ====================================================================
-- مهارة ترحيل قاعدة البيانات: إضافة الأعمدة الناقصة لجدول العقود
-- منصة «دلنّي» العقارية اليمنية (Dalani Real Estate Platform)
-- يرجى تنفيذ هذا الملف في Supabase SQL Editor لضمان نجاح اختبار المرحلة 8
-- ====================================================================

ALTER TABLE public.property_contracts ADD COLUMN IF NOT EXISTS request_id VARCHAR(128);
ALTER TABLE public.property_contracts ADD COLUMN IF NOT EXISTS witnesses JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.property_contracts ADD COLUMN IF NOT EXISTS broker_or_agent JSONB;
ALTER TABLE public.property_contracts ADD COLUMN IF NOT EXISTS duration_terms JSONB;
ALTER TABLE public.property_contracts ADD COLUMN IF NOT EXISTS first_party_approved_at TIMESTAMPTZ;
ALTER TABLE public.property_contracts ADD COLUMN IF NOT EXISTS first_party_approved_version INTEGER;
ALTER TABLE public.property_contracts ADD COLUMN IF NOT EXISTS second_party_approval BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.property_contracts ADD COLUMN IF NOT EXISTS second_party_approved_at TIMESTAMPTZ;
ALTER TABLE public.property_contracts ADD COLUMN IF NOT EXISTS second_party_approved_version INTEGER;
ALTER TABLE public.property_contracts ADD COLUMN IF NOT EXISTS approved_by VARCHAR(128);
ALTER TABLE public.property_contracts ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE public.property_contracts ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ;
ALTER TABLE public.property_contracts ADD COLUMN IF NOT EXISTS first_party_signed_version INTEGER;
ALTER TABLE public.property_contracts ADD COLUMN IF NOT EXISTS second_party_signed_version INTEGER;
ALTER TABLE public.property_contracts ADD COLUMN IF NOT EXISTS is_modification_pending_approval BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.property_contracts ADD COLUMN IF NOT EXISTS modification_requested_by VARCHAR(128);
ALTER TABLE public.property_contracts ADD COLUMN IF NOT EXISTS modification_reason TEXT;
ALTER TABLE public.property_contracts ADD COLUMN IF NOT EXISTS notes TEXT;
