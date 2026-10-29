-- ====================================================================
-- مهارة ترحيل قاعدة البيانات: إضافة أعمدة إتمام الصفقة لجدولي الحجوزات والعقارات
-- منصة «دلنّي» العقارية اليمنية (Dalani Real Estate Platform)
-- يرجى تنفيذ هذا الملف في Supabase SQL Editor لتجهيز كافة أعمدة إتمام الصفقات
-- ====================================================================

-- 1. إضافة الأعمدة الناقصة لجدول property_bookings
ALTER TABLE public.property_bookings ADD COLUMN IF NOT EXISTS deal_outcome VARCHAR(32) CHECK (deal_outcome IN ('sold', 'rented'));
ALTER TABLE public.property_bookings ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE public.property_bookings ADD COLUMN IF NOT EXISTS completed_by VARCHAR(128);
ALTER TABLE public.property_bookings ADD COLUMN IF NOT EXISTS final_dossier_number VARCHAR(128);
ALTER TABLE public.property_bookings ADD COLUMN IF NOT EXISTS financial_clearance JSONB;
ALTER TABLE public.property_bookings ADD COLUMN IF NOT EXISTS handover_protocol JSONB;
ALTER TABLE public.property_bookings ADD COLUMN IF NOT EXISTS is_disputed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.property_bookings ADD COLUMN IF NOT EXISTS dispute JSONB;
ALTER TABLE public.property_bookings ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE public.property_bookings ADD COLUMN IF NOT EXISTS cancellation_category VARCHAR(64);
ALTER TABLE public.property_bookings ADD COLUMN IF NOT EXISTS cancelled_by VARCHAR(128);
ALTER TABLE public.property_bookings ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- 2. إضافة الأعمدة الناقصة لجدول listings (خاصة بأعمدة إتمام الإعلان والإغلاق النهائي)
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS deal_outcome VARCHAR(32) CHECK (deal_outcome IN ('sold', 'rented'));
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS final_deal_number VARCHAR(128);
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS closed_by VARCHAR(128);

-- 3. تحديث دالة إتمام الصفقة (fn_complete_deal_and_close_listing) مع القفل التشاؤمي الذري
CREATE OR REPLACE FUNCTION public.fn_complete_deal_and_close_listing()
RETURNS TRIGGER AS $$
DECLARE
    v_purpose VARCHAR(64);
    v_outcome VARCHAR(32);
    v_dossier VARCHAR(128);
    v_actor VARCHAR(128);
BEGIN
    -- في حالة اكتمال الحجز وانتقاله إلى status = completed
    IF TG_TABLE_NAME = 'property_bookings' AND NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status <> 'completed') THEN
        
        -- قفل تشاؤمي على سطر العقار لمنع أي تضارب أو إتمام مزدوج بالتوازي
        PERFORM 1 FROM public.listings WHERE id = NEW.listing_id FOR UPDATE;

        SELECT purpose INTO v_purpose FROM public.listings WHERE id = NEW.listing_id;
        v_outcome := COALESCE(NEW.deal_outcome, CASE WHEN v_purpose = 'sale' THEN 'sold' ELSE 'rented' END);
        v_dossier := COALESCE(NEW.final_dossier_number, 'DOS-2026-' || FLOOR(1000 + RANDOM() * 9000)::TEXT);
        v_actor := COALESCE(NEW.completed_by, NEW.advertiser_name, 'إدارة النظام');

        -- تحديث العقار المرتبط بشكل ذري وآمن
        UPDATE public.listings
        SET status = 'completed',
            deal_outcome = v_outcome,
            final_deal_number = v_dossier,
            closed_at = NOW(),
            closed_by = v_actor,
            is_reserved = FALSE,
            active_booking_id = NULL,
            reserved_until = NULL,
            status_timeline = status_timeline || jsonb_build_array(jsonb_build_object(
                'status', 'completed',
                'timestamp', TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI'),
                'changedBy', v_actor,
                'userRole', 'advertiser',
                'notes', 'تم إتمام الصفقة وإغلاق العقار نهائياً بموجب المحضر الرسمي [' || v_dossier || '].'
            )),
            updated_at = NOW()
        WHERE id = NEW.listing_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. إعادة ربط الـ Trigger بجدول property_bookings
DROP TRIGGER IF EXISTS trg_complete_deal_on_booking ON public.property_bookings;
CREATE TRIGGER trg_complete_deal_on_booking
AFTER UPDATE OF status ON public.property_bookings
FOR EACH ROW EXECUTE FUNCTION public.fn_complete_deal_and_close_listing();
