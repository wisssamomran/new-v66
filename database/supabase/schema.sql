-- ====================================================================
-- منصة «دلنّي» العقارية اليمنية - Dalani Real Estate Platform
-- المخطط البنائي لقاعدة البيانات المتوافقة كلياً مع Supabase / PostgreSQL
-- الإصدار: 1.0.0 Production Release
-- تاريخ الإنشاء: 2026-10-27
-- ====================================================================

-- --------------------------------------------------------------------
-- 0. التهيئة والإضافات البرمجية الأساسية (Extensions & Prerequisites)
-- --------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- --------------------------------------------------------------------
-- 1. جداول المستخدمين والمنشآت العقارية (Users & Organizations)
-- --------------------------------------------------------------------

-- 1.1 جدول المستخدمين الأساسي (Users)
CREATE TABLE IF NOT EXISTS public.users (
    id VARCHAR(128) PRIMARY KEY,
    supabase_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(64) NOT NULL DEFAULT 'seeker' CHECK (
        role IN (
            'visitor',
            'seeker',
            'advertiser',
            'org_manager',
            'org_agent',
            'moderator',
            'verifier',
            'reporter_admin',
            'support',
            'accountant',
            'system_admin'
        )
    ),
    email VARCHAR(255),
    phone VARCHAR(64),
    phone_verified BOOLEAN NOT NULL DEFAULT TRUE,
    avatar_url TEXT,
    org_id VARCHAR(128),
    org_name VARCHAR(255),
    is_org_admin BOOLEAN NOT NULL DEFAULT FALSE,
    active_status BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.2 جدول المنشآت والمكاتب العقارية (Organizations)
CREATE TABLE IF NOT EXISTS public.organizations (
    id VARCHAR(128) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    commercial_reg_no VARCHAR(128),
    license_number VARCHAR(128),
    phone VARCHAR(64),
    owner_id VARCHAR(128) REFERENCES public.users(id) ON DELETE SET NULL,
    manager_name VARCHAR(255),
    governorate VARCHAR(128),
    city VARCHAR(128),
    address TEXT,
    logo_url TEXT,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    verification_status VARCHAR(64) NOT NULL DEFAULT 'pending' CHECK (
        verification_status IN ('pending', 'under_review', 'verified', 'rejected')
    ),
    verified_at TIMESTAMPTZ,
    members JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 2. جدول العقارات والإعلانات (Listings)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.listings (
    id VARCHAR(128) PRIMARY KEY,
    listing_number VARCHAR(128) UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    property_type VARCHAR(64) NOT NULL CHECK (
        property_type IN ('apartment', 'villa', 'land', 'building', 'commercial', 'office', 'chalet')
    ),
    purpose VARCHAR(64) NOT NULL CHECK (
        purpose IN ('sale', 'rent', 'investment')
    ),
    status VARCHAR(64) NOT NULL DEFAULT 'under_review' CHECK (
        status IN (
            'draft',
            'pending_completion',
            'under_review',
            'pending_verification',
            'needs_changes',
            'published',
            'suspended',
            'expired',
            'rejected',
            'cancelled',
            'completed'
        )
    ),
    price DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (price >= 0),
    currency VARCHAR(16) NOT NULL DEFAULT 'YER' CHECK (currency IN ('YER', 'USD', 'SAR')),
    is_negotiable BOOLEAN NOT NULL DEFAULT FALSE,
    area DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (area >= 0),
    area_unit VARCHAR(32) NOT NULL DEFAULT 'م²' CHECK (
        area_unit IN ('م²', 'لبنة عشاري', 'قصبة', 'هكتار')
    ),
    
    -- حماية الحصرية والحجز المؤقت
    is_reserved BOOLEAN NOT NULL DEFAULT FALSE,
    reserved_until TIMESTAMPTZ,
    active_booking_id VARCHAR(128),
    
    -- إتمام الصفقة والإغلاق النهائي
    deal_outcome VARCHAR(32) CHECK (deal_outcome IN ('sold', 'rented')),
    final_deal_number VARCHAR(128),
    closed_at TIMESTAMPTZ,
    closed_by VARCHAR(128),
    
    -- البيانات الشرعية والتوثيقية
    deed_number VARCHAR(128),
    
    -- الإحصائيات والتمييز
    views_count INTEGER NOT NULL DEFAULT 0,
    favorites_count INTEGER NOT NULL DEFAULT 0,
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    featured_order INTEGER NOT NULL DEFAULT 0,
    
    -- كائنات البيانات المرنة (JSONB) المتوافقة مع الكود
    location JSONB NOT NULL DEFAULT '{"governorate": "صنعاء", "city": "صنعاء", "district": "الأمانة", "lat": 15.3694, "lng": 44.1910, "isApproximate": true}'::jsonb,
    attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
    advertiser JSONB NOT NULL DEFAULT '{}'::jsonb,
    assigned_agent_id VARCHAR(128) REFERENCES public.users(id) ON DELETE SET NULL,
    assigned_agent_name VARCHAR(255),
    
    images JSONB NOT NULL DEFAULT '[]'::jsonb,
    private_documents JSONB NOT NULL DEFAULT '[]'::jsonb,
    verification_badges JSONB NOT NULL DEFAULT '[]'::jsonb,
    status_timeline JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 3. طلبات الباحثين (Property Requests)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.property_requests (
    id VARCHAR(128) PRIMARY KEY,
    request_number VARCHAR(128) UNIQUE NOT NULL,
    listing_id VARCHAR(128) NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
    listing_title TEXT,
    listing_number VARCHAR(128),
    listing_price DOUBLE PRECISION,
    listing_currency VARCHAR(16) DEFAULT 'YER',
    listing_image TEXT,
    listing_governorate VARCHAR(128),
    listing_purpose VARCHAR(64),
    
    seeker_id VARCHAR(128) NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    seeker_name VARCHAR(255),
    seeker_phone VARCHAR(64),
    
    advertiser_id VARCHAR(128) NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    advertiser_name VARCHAR(255),
    advertiser_phone VARCHAR(64),
    
    request_type VARCHAR(64) NOT NULL CHECK (
        request_type IN ('booking_intent', 'visit_inquiry', 'price_offer')
    ),
    status VARCHAR(64) NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'accepted', 'rejected', 'cancelled')
    ),
    notes TEXT,
    offered_price DOUBLE PRECISION,
    preferred_date VARCHAR(64),
    requested_duration_hours INTEGER NOT NULL DEFAULT 48 CHECK (requested_duration_hours BETWEEN 12 AND 168),
    booking_id VARCHAR(128),
    
    -- تفاصيل إضافية للإيجار / الشراء
    payment_method VARCHAR(64),
    rental_usage_type VARCHAR(64),
    lease_duration_months INTEGER,
    payment_frequency VARCHAR(64),
    
    rejection_reason TEXT,
    cancellation_reason TEXT,
    cancelled_by VARCHAR(128),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 4. الحجوزات المؤقتة الحصرية (Property Bookings)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.property_bookings (
    id VARCHAR(128) PRIMARY KEY,
    booking_number VARCHAR(128) UNIQUE NOT NULL,
    request_id VARCHAR(128) NOT NULL REFERENCES public.property_requests(id) ON DELETE CASCADE,
    listing_id VARCHAR(128) NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
    listing_title TEXT,
    listing_number VARCHAR(128),
    listing_image TEXT,
    listing_governorate VARCHAR(128),
    listing_price DOUBLE PRECISION,
    listing_currency VARCHAR(16) DEFAULT 'YER',
    listing_purpose VARCHAR(64),
    
    seeker_id VARCHAR(128) NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    seeker_name VARCHAR(255),
    seeker_phone VARCHAR(64),
    
    advertiser_id VARCHAR(128) NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    advertiser_name VARCHAR(255),
    advertiser_phone VARCHAR(64),
    
    status VARCHAR(64) NOT NULL DEFAULT 'active' CHECK (
        status IN ('active', 'completed', 'cancelled', 'expired')
    ),
    duration_hours INTEGER NOT NULL DEFAULT 48 CHECK (duration_hours BETWEEN 12 AND 168),
    start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    confirmed_by VARCHAR(128),
    deal_stage VARCHAR(64) NOT NULL DEFAULT 'booking_exclusive' CHECK (
        deal_stage IN (
            'request_submitted',
            'booking_exclusive',
            'inspection_deed',
            'terms_negotiation',
            'contract_completed'
        )
    ),
    contract_id VARCHAR(128),
    contract_number VARCHAR(128),
    notes TEXT,
    payment_method VARCHAR(64),
    rental_usage_type VARCHAR(64),
    
    -- المعاينة الميدانية والشروط والتفاوض
    inspection_visit JSONB NOT NULL DEFAULT '{"status": "not_scheduled"}'::jsonb,
    current_terms JSONB,
    agreed_terms JSONB,
    agreed_terms_approved_at TIMESTAMPTZ,
    terms_status VARCHAR(64) DEFAULT 'draft' CHECK (
        terms_status IN ('draft', 'pending_approval', 'accepted', 'rejected', 'superseded', 'pending_reapproval')
    ),
    terms_history JSONB NOT NULL DEFAULT '[]'::jsonb,
    messages JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- إتمام المعاملة والمخالصة النهائية
    deal_outcome VARCHAR(32) CHECK (deal_outcome IN ('sold', 'rented')),
    completed_at TIMESTAMPTZ,
    completed_by VARCHAR(128),
    final_dossier_number VARCHAR(128),
    financial_clearance JSONB,
    handover_protocol JSONB,
    
    -- إدارة النزاعات
    is_disputed BOOLEAN NOT NULL DEFAULT FALSE,
    dispute JSONB,
    
    -- تفاصيل الإلغاء
    cancellation_reason TEXT,
    cancellation_category VARCHAR(64),
    cancelled_by VARCHAR(128),
    cancelled_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 5. العقود الإلكترونية والتواقيع (Property Contracts)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.property_contracts (
    id VARCHAR(128) PRIMARY KEY,
    contract_number VARCHAR(128) UNIQUE NOT NULL,
    booking_id VARCHAR(128) NOT NULL REFERENCES public.property_bookings(id) ON DELETE CASCADE,
    booking_number VARCHAR(128),
    request_id VARCHAR(128),
    listing_id VARCHAR(128) NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
    listing_number VARCHAR(128),
    listing_title TEXT,
    contract_type VARCHAR(32) NOT NULL CHECK (contract_type IN ('sale', 'lease')),
    status VARCHAR(64) NOT NULL DEFAULT 'draft' CHECK (
        status IN ('draft', 'under_review', 'pending_approval', 'approved', 'signed', 'cancelled')
    ),
    current_version INTEGER NOT NULL DEFAULT 1 CHECK (current_version >= 1),
    
    -- بطاقة وبيانات العقار والطرفين
    property_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    first_party JSONB NOT NULL DEFAULT '{}'::jsonb,
    second_party JSONB NOT NULL DEFAULT '{}'::jsonb,
    witnesses JSONB NOT NULL DEFAULT '[]'::jsonb,
    broker_or_agent JSONB,
    
    -- الشروط المالية والزمنية والبنود
    financial_terms JSONB NOT NULL DEFAULT '{}'::jsonb,
    duration_terms JSONB,
    clauses JSONB NOT NULL DEFAULT '[]'::jsonb,
    version_history JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- الاعتمادات والتواقيع الثنائية الرسمية
    first_party_approval BOOLEAN NOT NULL DEFAULT FALSE,
    first_party_approved_at TIMESTAMPTZ,
    first_party_approved_version INTEGER,
    second_party_approval BOOLEAN NOT NULL DEFAULT FALSE,
    second_party_approved_at TIMESTAMPTZ,
    second_party_approved_version INTEGER,
    approved_by VARCHAR(128),
    approved_at TIMESTAMPTZ,
    
    signed_at TIMESTAMPTZ,
    first_party_signed_version INTEGER,
    second_party_signed_version INTEGER,
    electronic_signatures JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- منع التعديل الصامت
    is_modification_pending_approval BOOLEAN NOT NULL DEFAULT FALSE,
    modification_requested_by VARCHAR(128),
    modification_reason TEXT,
    
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 6. طلبات التحقق والوثائق (Verification Requests)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.verification_requests (
    id VARCHAR(128) PRIMARY KEY,
    request_type VARCHAR(64) NOT NULL CHECK (
        request_type IN ('individual_advertiser', 'organization', 'property_deed')
    ),
    target_id VARCHAR(128) NOT NULL,
    target_name VARCHAR(255),
    listing_id VARCHAR(128) REFERENCES public.listings(id) ON DELETE CASCADE,
    listing_title TEXT,
    listing_code VARCHAR(128),
    deed_number VARCHAR(128),
    deed_type VARCHAR(64),
    submitted_by VARCHAR(128) NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    submitted_by_phone VARCHAR(64),
    document_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
    documents JSONB NOT NULL DEFAULT '[]'::jsonb,
    status VARCHAR(64) NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'under_review', 'needs_info', 'approved', 'rejected')
    ),
    moderator_notes TEXT,
    rejection_reason TEXT,
    reviewed_by VARCHAR(128),
    reviewed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 7. البلاغات والقضايا والنزاعات (Reports)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reports (
    id VARCHAR(128) PRIMARY KEY,
    report_number VARCHAR(128) UNIQUE NOT NULL,
    case_number VARCHAR(128),
    reporter_id VARCHAR(128) REFERENCES public.users(id) ON DELETE SET NULL,
    reporter_name VARCHAR(255),
    reporter_phone VARCHAR(64),
    reporter_confidential_notes TEXT,
    target_type VARCHAR(64) NOT NULL CHECK (target_type IN ('listing', 'user', 'organization')),
    target_id VARCHAR(128) NOT NULL,
    listing_id VARCHAR(128),
    listing_title TEXT,
    listing_snapshot_price VARCHAR(128),
    listing_snapshot_advertiser VARCHAR(255),
    reason TEXT NOT NULL,
    details TEXT,
    evidence_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
    priority VARCHAR(32) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(64) NOT NULL DEFAULT 'new' CHECK (
        status IN ('new', 'investigating', 'advertiser_contacted', 'resolved_ad_suspended', 'dismissed')
    ),
    investigated_by VARCHAR(128),
    assigned_officer VARCHAR(128),
    resolution_notes TEXT,
    resolution_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- --------------------------------------------------------------------
-- 8. تذاكر الدعم الفني (Support Tickets)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id VARCHAR(128) PRIMARY KEY,
    ticket_number VARCHAR(128) UNIQUE NOT NULL,
    user_id VARCHAR(128) NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    user_name VARCHAR(255),
    user_phone VARCHAR(64),
    subject TEXT NOT NULL,
    category VARCHAR(64) NOT NULL DEFAULT 'inquiry' CHECK (
        category IN ('account', 'listing_issue', 'verification', 'technical', 'inquiry')
    ),
    priority VARCHAR(32) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    status VARCHAR(64) NOT NULL DEFAULT 'open' CHECK (
        status IN ('open', 'in_progress', 'waiting_user', 'resolved', 'closed')
    ),
    messages JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 9. سجل التدقيق والعمليات الرقابي (Audit Logs)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id VARCHAR(128) PRIMARY KEY,
    user_id VARCHAR(128) NOT NULL,
    user_name VARCHAR(255),
    user_role VARCHAR(64),
    action TEXT NOT NULL,
    category VARCHAR(64),
    target_type VARCHAR(64),
    target_id VARCHAR(128),
    status VARCHAR(64),
    result VARCHAR(64) DEFAULT 'success',
    details TEXT,
    ip_address VARCHAR(128),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 10. إعدادات النظام العامة (System Settings)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.system_settings (
    id VARCHAR(64) PRIMARY KEY DEFAULT 'global',
    settings JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 11. الموظفون وأعضاء الفريق الرقابي (Staff Members)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.staff_members (
    id VARCHAR(128) PRIMARY KEY,
    user_id VARCHAR(128) REFERENCES public.users(id) ON DELETE CASCADE,
    employee_code VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(64),
    role VARCHAR(64) NOT NULL,
    department VARCHAR(128),
    status VARCHAR(32) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled', 'suspended')),
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    custom_permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    two_factor_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    last_login_ip VARCHAR(128),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 12. الإشعارات والتنبيهات (Notifications)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
    id VARCHAR(128) PRIMARY KEY,
    user_id VARCHAR(128) NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(64) NOT NULL DEFAULT 'system',
    link TEXT,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 13. المفضلة للباحثين (User Favorites)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_favorites (
    id VARCHAR(128) PRIMARY KEY,
    user_id VARCHAR(128) NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    listing_id VARCHAR(128) NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_favorite UNIQUE (user_id, listing_id)
);

-- ====================================================================
-- الفهارس وقواعد الأداء (Indexes & Performance Optimization)
-- ====================================================================

CREATE INDEX IF NOT EXISTS idx_listings_status ON public.listings (status);
CREATE INDEX IF NOT EXISTS idx_listings_purpose ON public.listings (purpose);
CREATE INDEX IF NOT EXISTS idx_listings_property_type ON public.listings (property_type);
CREATE INDEX IF NOT EXISTS idx_listings_reserved ON public.listings (is_reserved);
CREATE INDEX IF NOT EXISTS idx_listings_price ON public.listings (price);
CREATE INDEX IF NOT EXISTS idx_listings_created_at ON public.listings (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_location_gin ON public.listings USING gin (location);
CREATE INDEX IF NOT EXISTS idx_listings_advertiser_gin ON public.listings USING gin (advertiser);

CREATE INDEX IF NOT EXISTS idx_requests_listing ON public.property_requests (listing_id);
CREATE INDEX IF NOT EXISTS idx_requests_seeker ON public.property_requests (seeker_id);
CREATE INDEX IF NOT EXISTS idx_requests_advertiser ON public.property_requests (advertiser_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON public.property_requests (status);

CREATE INDEX IF NOT EXISTS idx_bookings_listing ON public.property_bookings (listing_id);
CREATE INDEX IF NOT EXISTS idx_bookings_seeker ON public.property_bookings (seeker_id);
CREATE INDEX IF NOT EXISTS idx_bookings_advertiser ON public.property_bookings (advertiser_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.property_bookings (status);
CREATE INDEX IF NOT EXISTS idx_bookings_expires_at ON public.property_bookings (expires_at);

CREATE INDEX IF NOT EXISTS idx_contracts_booking ON public.property_contracts (booking_id);
CREATE INDEX IF NOT EXISTS idx_contracts_listing ON public.property_contracts (listing_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON public.property_contracts (status);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications (user_id, is_read);

-- ====================================================================
-- منع التعارض والحجز المزدوج (Anti-Conflict Exclusive Lock)
-- ====================================================================

-- قيد الفهرس الفريد: يضمن وجود حجز نشط واحد فقط في أي لحظة للعقار ذاته
CREATE UNIQUE INDEX IF NOT EXISTS idx_single_active_booking_per_listing 
ON public.property_bookings (listing_id) 
WHERE (status = 'active');

-- ====================================================================
-- الدوال الإجرائية والمشغلات الآلية (Functions & Triggers)
-- ====================================================================

-- 1. دالة تحديث توقيت updated_at تلقائياً
CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_set_updated_at_users
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE OR REPLACE TRIGGER trg_set_updated_at_listings
BEFORE UPDATE ON public.listings
FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE OR REPLACE TRIGGER trg_set_updated_at_requests
BEFORE UPDATE ON public.property_requests
FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE OR REPLACE TRIGGER trg_set_updated_at_bookings
BEFORE UPDATE ON public.property_bookings
FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE OR REPLACE TRIGGER trg_set_updated_at_contracts
BEFORE UPDATE ON public.property_contracts
FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- 2. دالة التحقق ومنع تعارض الحجوزات النشطة غير المنتهية الصلاحية
CREATE OR REPLACE FUNCTION public.fn_prevent_booking_conflict()
RETURNS TRIGGER AS $$
DECLARE
    v_conflict_count INTEGER;
    v_is_already_completed BOOLEAN;
BEGIN
    -- التحقق هل العقار مكتمل/مباع مسبقاً
    SELECT (status = 'completed') INTO v_is_already_completed 
    FROM public.listings WHERE id = NEW.listing_id;
    
    IF v_is_already_completed THEN
        RAISE EXCEPTION 'لا يمكن إنشاء حجز على عقار تم إتمام بيعه أو تأجيره نهائياً.';
    END IF;

    -- إذا كان الحجز يُضاف أو يُعدل ليكون نشطاً
    IF NEW.status = 'active' THEN
        SELECT COUNT(*) INTO v_conflict_count
        FROM public.property_bookings
        WHERE listing_id = NEW.listing_id
          AND id <> COALESCE(NEW.id, '')
          AND status = 'active'
          AND expires_at > NOW();

        IF v_conflict_count > 0 THEN
            RAISE EXCEPTION 'تعذر تنفيذ الحجز: العقار محجوز حصرياً لطلب نشط آخر ولم تنتهِ فترة الحجز بعد.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_prevent_booking_conflict
BEFORE INSERT OR UPDATE ON public.property_bookings
FOR EACH ROW EXECUTE FUNCTION public.fn_prevent_booking_conflict();

-- 3. دالة مزامنة حالة العقار عند تفعيل أو إنهاء الحجز المؤقت
CREATE OR REPLACE FUNCTION public.fn_sync_listing_booking_state()
RETURNS TRIGGER AS $$
BEGIN
    -- عند تفعيل حجز جديد أو إعادة تفعيله
    IF NEW.status = 'active' THEN
        UPDATE public.listings
        SET is_reserved = TRUE,
            active_booking_id = NEW.id,
            reserved_until = NEW.expires_at,
            updated_at = NOW()
        WHERE id = NEW.listing_id AND status <> 'completed';
    
    -- عند إلغاء الحجز أو انتهاء مدته
    ELSIF NEW.status IN ('cancelled', 'expired') THEN
        UPDATE public.listings
        SET is_reserved = FALSE,
            active_booking_id = NULL,
            reserved_until = NULL,
            updated_at = NOW()
        WHERE id = NEW.listing_id AND active_booking_id = NEW.id AND status <> 'completed';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_sync_listing_booking_state
AFTER INSERT OR UPDATE OF status, expires_at ON public.property_bookings
FOR EACH ROW EXECUTE FUNCTION public.fn_sync_listing_booking_state();

-- 4. دالة إتمام الصفقة وإغلاق العقار نهائياً عند اكتمال العقد أو الحجز
CREATE OR REPLACE FUNCTION public.fn_complete_deal_and_close_listing()
RETURNS TRIGGER AS $$
DECLARE
    v_purpose VARCHAR(64);
    v_outcome VARCHAR(32);
    v_dossier VARCHAR(128);
    v_actor VARCHAR(128);
BEGIN
    -- في حالة اكتمال الحجز
    IF TG_TABLE_NAME = 'property_bookings' AND NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status <> 'completed') THEN
        SELECT purpose INTO v_purpose FROM public.listings WHERE id = NEW.listing_id;
        v_outcome := COALESCE(NEW.deal_outcome, CASE WHEN v_purpose = 'sale' THEN 'sold' ELSE 'rented' END);
        v_dossier := COALESCE(NEW.final_dossier_number, 'DOS-2026-' || FLOOR(1000 + RANDOM() * 9000)::TEXT);
        v_actor := COALESCE(NEW.completed_by, NEW.advertiser_name, 'إدارة النظام');

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

CREATE OR REPLACE TRIGGER trg_complete_deal_on_booking
AFTER UPDATE OF status ON public.property_bookings
FOR EACH ROW EXECUTE FUNCTION public.fn_complete_deal_and_close_listing();

-- 5. صمام أمان صارم: منع إعادة فتح أو عرض عقار مكتمل أو مباع
CREATE OR REPLACE FUNCTION public.fn_prevent_reopening_completed_listing()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status = 'completed' AND NEW.status <> 'completed' THEN
        RAISE EXCEPTION 'يحظر نظام دلنّي العقاري إعادة نشر أو فتح عقار تم إتمام صفقته (مباع أو مؤجر) نهائياً حفاظاً على حقوق الأطراف ومصداقية السوق.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_prevent_reopening_completed_listing
BEFORE UPDATE OF status ON public.listings
FOR EACH ROW EXECUTE FUNCTION public.fn_prevent_reopening_completed_listing();

-- ====================================================================
-- سياسات الأمان على مستوى الصف (Row Level Security - RLS)
-- ====================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

-- دوال مساعدة لسياسات الأمان
CREATE OR REPLACE FUNCTION public.current_app_user_id()
RETURNS TEXT AS $$
    SELECT id FROM public.users 
    WHERE supabase_user_id = auth.uid() OR id = auth.uid()::text
    LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.current_app_user_role()
RETURNS TEXT AS $$
    SELECT role FROM public.users 
    WHERE supabase_user_id = auth.uid() OR id = auth.uid()::text
    LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin_or_moderator()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.users 
        WHERE (supabase_user_id = auth.uid() OR id = auth.uid()::text)
          AND role IN ('system_admin', 'moderator', 'verifier', 'reporter_admin', 'support', 'accountant')
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 1. سياسات العقارات (Listings RLS)
-- الزوار والجمهور: استعراض الإعلانات المنشورة غير المحجوزة
CREATE POLICY "listings_public_read_available" 
ON public.listings FOR SELECT 
USING (
    status = 'published' AND is_reserved = FALSE
);

-- المعلنون وإدارة المنشآت: استعراض جميع إعلاناتهم بما فيها المحجوزة والمسودة
CREATE POLICY "listings_owner_read_all" 
ON public.listings FOR SELECT 
USING (
    advertiser->>'id' = public.current_app_user_id()
    OR assigned_agent_id = public.current_app_user_id()
    OR public.is_admin_or_moderator()
);

-- الإضافة والتعديل للمعلن الموثق أو الوكيل أو المدير
CREATE POLICY "listings_insert_advertisers" 
ON public.listings FOR INSERT 
WITH CHECK (
    public.current_app_user_role() IN ('advertiser', 'org_manager', 'org_agent', 'system_admin')
);

CREATE POLICY "listings_update_owner_or_admin" 
ON public.listings FOR UPDATE 
USING (
    advertiser->>'id' = public.current_app_user_id()
    OR assigned_agent_id = public.current_app_user_id()
    OR public.is_admin_or_moderator()
);

-- 2. سياسات طلبات الباحثين (Property Requests RLS)
CREATE POLICY "requests_parties_and_admin_read" 
ON public.property_requests FOR SELECT 
USING (
    seeker_id = public.current_app_user_id()
    OR advertiser_id = public.current_app_user_id()
    OR public.is_admin_or_moderator()
);

CREATE POLICY "requests_seeker_insert" 
ON public.property_requests FOR INSERT 
WITH CHECK (
    seeker_id = public.current_app_user_id() 
    OR public.current_app_user_role() IN ('seeker', 'system_admin')
);

CREATE POLICY "requests_parties_update" 
ON public.property_requests FOR UPDATE 
USING (
    seeker_id = public.current_app_user_id()
    OR advertiser_id = public.current_app_user_id()
    OR public.is_admin_or_moderator()
);

-- 3. سياسات الحجوزات المؤقتة (Property Bookings RLS)
CREATE POLICY "bookings_parties_and_admin_read" 
ON public.property_bookings FOR SELECT 
USING (
    seeker_id = public.current_app_user_id()
    OR advertiser_id = public.current_app_user_id()
    OR public.is_admin_or_moderator()
);

CREATE POLICY "bookings_parties_update" 
ON public.property_bookings FOR UPDATE 
USING (
    seeker_id = public.current_app_user_id()
    OR advertiser_id = public.current_app_user_id()
    OR public.is_admin_or_moderator()
);

-- 4. سياسات العقود (Property Contracts RLS)
CREATE POLICY "contracts_parties_and_admin_read" 
ON public.property_contracts FOR SELECT 
USING (
    first_party->>'id' = public.current_app_user_id()
    OR second_party->>'id' = public.current_app_user_id()
    OR public.is_admin_or_moderator()
);

CREATE POLICY "contracts_parties_update" 
ON public.property_contracts FOR UPDATE 
USING (
    first_party->>'id' = public.current_app_user_id()
    OR second_party->>'id' = public.current_app_user_id()
    OR public.is_admin_or_moderator()
);

-- 5. سياسات الإشعارات (Notifications RLS)
CREATE POLICY "notifications_user_isolated" 
ON public.notifications FOR ALL 
USING (user_id = public.current_app_user_id());

-- 6. سياسات تذاكر الدعم (Support Tickets RLS)
CREATE POLICY "tickets_user_read_write" 
ON public.support_tickets FOR ALL 
USING (
    user_id = public.current_app_user_id() 
    OR public.is_admin_or_moderator()
);

-- 7. سياسات سجل التدقيق (Audit Logs RLS)
CREATE POLICY "audit_logs_admin_and_self_read" 
ON public.audit_logs FOR SELECT 
USING (
    user_id = public.current_app_user_id() 
    OR public.is_admin_or_moderator()
);

CREATE POLICY "audit_logs_system_insert" 
ON public.audit_logs FOR INSERT 
WITH CHECK (TRUE);

-- 8. سياسات إعدادات النظام (System Settings RLS)
CREATE POLICY "system_settings_public_read" 
ON public.system_settings FOR SELECT 
USING (TRUE);

CREATE POLICY "system_settings_admin_update" 
ON public.system_settings FOR UPDATE 
USING (public.current_app_user_role() = 'system_admin');
