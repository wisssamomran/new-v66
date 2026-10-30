-- ====================================================================
-- منصة «دلنّي» العقارية اليمنية - Dalani Real Estate Platform
-- مجموعة البيانات الأولية والاختبارية الواقعية (Seed Data)
-- الإصدار: 1.0.0 Production Seed
-- البيئة المستهدفة: Supabase / PostgreSQL
-- ====================================================================

-- تنظيف أولي اختياري بحسب الحاجة (معطل افتراضياً لتجنب الحذف غير المقصود)
-- TRUNCATE TABLE public.audit_logs, public.notifications, public.support_tickets, public.reports, 
-- public.verification_requests, public.property_contracts, public.property_bookings, public.property_requests, 
-- public.listings, public.organizations, public.staff_members, public.users CASCADE;

-- --------------------------------------------------------------------
-- 1. المستخدمون (Users) - يمثلون الأدوار العشرة للنظام
-- --------------------------------------------------------------------
INSERT INTO public.users (id, name, role, email, phone, phone_verified, avatar_url, org_id, org_name, is_org_admin, active_status, created_at)
VALUES
    -- 1. مدير النظام العام
    ('usr-sys-admin', 'المهندس / مدير النظام العام', 'system_admin', 'admin@dalani.ye', '770000000', TRUE, 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80', NULL, NULL, FALSE, TRUE, '2025-01-01 08:00:00+03'),
    -- 2. مشرف مراجعة المحتوى
    ('usr-mod-1', 'عصام العديني (مسؤول مراجعة المحتوى)', 'moderator', 'issam.mod@dalani.ye', '770112233', TRUE, 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80', NULL, NULL, FALSE, TRUE, '2025-05-01 08:00:00+03'),
    -- 3. مسؤول التحقق والوثائق والبصائر
    ('usr-ver-1', 'سالم بن محفوظ (مسؤول التحقق والوثائق)', 'verifier', 'salem.ver@dalani.ye', '770223344', TRUE, 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80', NULL, NULL, FALSE, TRUE, '2025-05-01 08:00:00+03'),
    -- 4. مسؤول البلاغات والقضايا
    ('usr-rep-1', 'مختار الهمداني (مسؤول البلاغات والقضايا)', 'reporter_admin', 'mukhtar.rep@dalani.ye', '770334455', TRUE, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80', NULL, NULL, FALSE, TRUE, '2025-05-01 08:00:00+03'),
    -- 5. ممثل الدعم الفني
    ('usr-sup-1', 'خلود العبسي (مسؤول الدعم الفني)', 'support', 'support@dalani.ye', '770445566', TRUE, 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80', NULL, NULL, FALSE, TRUE, '2025-05-01 08:00:00+03'),
    -- 6. المحاسب المالي
    ('usr-acc-1', 'جمال الريمي (المحاسب المالي)', 'accountant', 'finance@dalani.ye', '770556677', TRUE, 'https://images.unsplash.com/photo-1556157382-97eda2d62296?auto=format&fit=crop&w=150&q=80', NULL, NULL, FALSE, TRUE, '2025-05-01 08:00:00+03'),
    -- 7. مدير منشأة عقارية
    ('user-org-manager', 'م. نبيل الشامي', 'org_manager', 'nabil@sarh-realestate.ye', '777123456', TRUE, 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=150&q=80', 'org-1', 'شركة الصرح العقارية الحديثة', TRUE, TRUE, '2025-06-10 09:00:00+03'),
    -- 8. وكيل / مسوق منشأة
    ('user-org-agent', 'طارق الأصبحي', 'org_agent', 'tariq@sarh-realestate.ye', '771998877', TRUE, 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=150&q=80', 'org-1', 'شركة الصرح العقارية الحديثة', FALSE, TRUE, '2025-09-01 10:00:00+03'),
    -- 9. معلن فرد موثق 1
    ('adv-1', 'هشام عبد الرحمن القدسي', 'advertiser', 'hisham@example.com', '777012345', TRUE, 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80', NULL, NULL, FALSE, TRUE, '2025-11-10 11:00:00+03'),
    -- 10. معلن فرد موثق 2 (أراضي وبصائر)
    ('adv-3', 'عبد الملك سنان الغولي', 'advertiser', 'alghawli@example.com', '773556677', TRUE, 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80', NULL, NULL, FALSE, TRUE, '2026-01-15 12:00:00+03'),
    -- 11. باحث مسجل 1
    ('usr-seeker', 'أصيل محمد الحكيمي', 'seeker', 'aseel@example.com', '778990011', TRUE, 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80', NULL, NULL, FALSE, TRUE, '2026-01-20 14:00:00+03'),
    -- 12. باحث مسجل 2
    ('usr-seeker-2', 'معاذ سالم باوزير', 'seeker', 'muath@example.com', '772113355', TRUE, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80', NULL, NULL, FALSE, TRUE, '2026-02-01 15:30:00+03'),
    -- الحسابات الخمسة الجديدة للباحثين
    ('new-seeker-001', 'محمد أحمد العريقي', 'seeker', 'seeker1@dalani.ye', '771110001', TRUE, 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80', NULL, NULL, FALSE, TRUE, '2026-03-01 10:00:00+03'),
    ('new-seeker-002', 'عبدالله محمد اليافعي', 'seeker', 'seeker2@dalani.ye', '771110002', TRUE, 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80', NULL, NULL, FALSE, TRUE, '2026-03-01 10:00:00+03'),
    ('new-seeker-003', 'خالد علي الحضرمي', 'seeker', 'seeker3@dalani.ye', '771110003', TRUE, 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=150&q=80', NULL, NULL, FALSE, TRUE, '2026-03-01 10:00:00+03'),
    ('new-seeker-004', 'أحمد صالح الشامي', 'seeker', 'seeker4@dalani.ye', '771110004', TRUE, 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&q=80', NULL, NULL, FALSE, TRUE, '2026-03-01 10:00:00+03'),
    ('new-seeker-005', 'ياسر عبدالرحمن', 'seeker', 'seeker5@dalani.ye', '771110005', TRUE, 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80', NULL, NULL, FALSE, TRUE, '2026-03-01 10:00:00+03')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    phone = EXCLUDED.phone,
    email = EXCLUDED.email,
    active_status = EXCLUDED.active_status;

-- --------------------------------------------------------------------
-- 2. المنشآت والمكاتب العقارية (Organizations)
-- --------------------------------------------------------------------
INSERT INTO public.organizations (id, name, commercial_reg_no, license_number, phone, owner_id, manager_name, governorate, city, address, logo_url, is_verified, verification_status, verified_at, members, created_at)
VALUES
    ('org-1', 'شركة الصرح العقارية الحديثة', 'CR-YE-40912', 'LIC-YE-SAN-2025-08', '777123456', 'user-org-manager', 'م. نبيل الشامي', 'صنعاء (أمانة العاصمة)', 'صنعاء', 'شارع حدة - أمام بريد حدة', 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=200&q=80', TRUE, 'verified', '2026-01-15 10:00:00+03',
    '[
        {"id": "mem-1", "userId": "user-org-manager", "name": "م. نبيل الشامي", "phone": "777123456", "roleInOrg": "manager", "isActive": true, "assignedListingCount": 4, "joinedAt": "2025-06-10"},
        {"id": "mem-2", "userId": "user-org-agent", "name": "طارق الأصبحي", "phone": "771998877", "roleInOrg": "agent", "isActive": true, "assignedListingCount": 2, "joinedAt": "2025-09-01"}
    ]'::jsonb,
    '2025-06-10 09:00:00+03')
ON CONFLICT (id) DO NOTHING;

-- --------------------------------------------------------------------
-- 3. العقارات المعروضة (Listings) عبر المحافظات اليمنية
-- --------------------------------------------------------------------
INSERT INTO public.listings (
    id, listing_number, title, description, property_type, purpose, status, price, currency, is_negotiable, area, area_unit,
    is_reserved, reserved_until, active_booking_id, deed_number, views_count, favorites_count, is_featured, featured_order,
    location, attributes, advertiser, assigned_agent_id, assigned_agent_name, images, verification_badges, status_timeline, created_at
)
VALUES
    -- عقار 1: فيلا سوبر ديلوكس في حدة (USD) - خاضعة حالياً لحجز مؤقت وتفاوض حصري
    (
        'list-101',
        'YEM-2026-101',
        'فيلا سوبر ديلوكس مودرن في أرقى أحياء حدة',
        'فيلا مستقلة راقية بتشطيبات VIP ملكية، حجر حبش أصيل، مسبح خاص وحديقة واسعة، منظومة طاقة شمسية كاملة بقدرة 10 كيلووات، بئر ماء سطحي وخزان أرضي سعة 4 وايتات، حراسة وموقع ديبلوماسي آمن قريب من السفارات.',
        'villa',
        'sale',
        'published',
        320000,
        'USD',
        TRUE,
        450,
        'م²',
        TRUE, -- محجوزة مؤقتاً
        NOW() + INTERVAL '36 hours',
        'bkg-101',
        'SAN-DEED-2024-9982',
        1420,
        48,
        TRUE,
        1,
        '{"governorate": "صنعاء (أمانة العاصمة)", "city": "صنعاء", "district": "حدة", "street": "شارع حدة الحي الدبلوماسي", "lat": 15.3120, "lng": 44.1870, "isApproximate": true}'::jsonb,
        '{"rooms": 7, "bathrooms": 6, "livingRooms": 3, "parkingSpaces": 4, "buildingAgeYears": 2, "hasElevator": true, "hasSolarSystem": true, "hasWaterNetwork": true, "hasElectricity": true, "streetWidthMeters": 16, "zoningType": "سكني"}'::jsonb,
        '{"id": "adv-1", "name": "هشام عبد الرحمن القدسي", "type": "individual", "phone": "777012345", "phoneVerified": true, "allowWhatsapp": true, "allowCall": true}'::jsonb,
        NULL,
        NULL,
        '["https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1000&q=80"]'::jsonb,
        '[
            {"type": "phone_verified", "label": "هاتف المعلن مؤكد", "description": "رقم الاتصال المباشر مؤكد برمز التحقق.", "verifiedAt": "2026-02-10", "verifiedBy": "نظام دلنّي", "validityNote": "سارٍ", "disclaimer": "تأكيد الهاتف لا يعد وثيقة ملكية."},
            {"type": "deed_reviewed", "label": "بصيرة شرعية مفحوصة", "description": "تم فحص صك الملكية والبصيرة الشرعية بواسطة فريق التحقق القانوني.", "verifiedAt": "2026-02-12", "verifiedBy": "مسؤول التحقق", "validityNote": "سجل 2026", "disclaimer": "المراجعة لا تُغني المشتري عن المعاينة الميدانية والتحري الشرعي في المحكمة."}
        ]'::jsonb,
        '[{"status": "published", "timestamp": "2026-02-12 11:00", "changedBy": "عصام العديني", "userRole": "moderator", "notes": "معتمد للنشر العام"}]'::jsonb,
        '2026-02-10 10:00:00+03'
    ),

    -- عقار 2: شقة راقية مفروشة في خورمكسر، عدن (YER / شهر) - متاحة للجمهور
    (
        'list-102',
        'YEM-2026-102',
        'شقة عائلية فاخرة مفروشة في خورمكسر بإطلالة بحرية',
        'شقة مفروشة بالكامل تكييف مركزي وإطلالة مباشرة على ساحل أبين في خورمكسر، أثاث تركي فاخر وجديد، عداد كهرباء مستقل وتوفر دائم للماء مع خزان علوي خاص، موقع متميز قريب من الخدمات والجامعة.',
        'apartment',
        'rent',
        'published',
        350000,
        'YER',
        FALSE,
        140,
        'م²',
        FALSE,
        NULL,
        NULL,
        NULL,
        980,
        31,
        FALSE,
        0,
        '{"governorate": "عدن", "city": "عدن", "district": "خورمكسر", "street": "كورنيش ساحل أبين", "lat": 12.8050, "lng": 45.0450, "isApproximate": true}'::jsonb,
        '{"rooms": 3, "bathrooms": 2, "floorNumber": 2, "totalFloors": 4, "hasElevator": true, "isFurnished": true, "hasElectricity": true, "hasWaterNetwork": true, "zoningType": "سكني"}'::jsonb,
        '{"id": "user-org-manager", "name": "شركة الصرح العقارية الحديثة", "type": "organization", "phone": "777123456", "phoneVerified": true, "allowWhatsapp": true, "allowCall": true, "orgId": "org-1", "orgName": "شركة الصرح العقارية الحديثة"}'::jsonb,
        'user-org-agent',
        'طارق الأصبحي',
        '["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80"]'::jsonb,
        '[
            {"type": "org_reviewed", "label": "منشأة مرخصة", "description": "تم التحقق من السجل التجاري وترخيص الوساطة العقارية.", "verifiedAt": "2026-01-15", "verifiedBy": "إدارة المنصة", "validityNote": "نشط 2026", "disclaimer": "يثبت الصفة التجارية للمكتب."}
        ]'::jsonb,
        '[{"status": "published", "timestamp": "2026-02-14 09:30", "changedBy": "عصام العديني", "userRole": "moderator"}]'::jsonb,
        '2026-02-13 14:00:00+03'
    ),

    -- عقار 3: أرض سكنية تجارية باللبنة الصنعانية في بيت بوس (YER) - متاحة للجمهور
    (
        'list-103',
        'YEM-2026-103',
        'أرض سكنية تجارية ممتازة على شارعين في بيت بوس',
        'أرض معتبرة على شارعين 14 و12 متر، موقع هادئ ومطل، قريبة من شارع الثلاثين في بيت بوس، المساحة الإجمالية 8 لبن عشاري حر مسجلة وموثقة بصيرة شرعية واضحة المعالم، صالحة لبناء برج سكني أو فيلا خاصة استثمارية.',
        'land',
        'sale',
        'published',
        360000000,
        'YER',
        TRUE,
        8,
        'لبنة عشاري',
        FALSE,
        NULL,
        NULL,
        'BOS-LAND-7714',
        1890,
        74,
        TRUE,
        2,
        '{"governorate": "صنعاء (أمانة العاصمة)", "city": "صنعاء", "district": "بيت بوس", "street": "شارع بيت بوس خلف محطة التوفيق", "lat": 15.2890, "lng": 44.2050, "isApproximate": false}'::jsonb,
        '{"streetWidthMeters": 14, "streetDirection": "رأسي على شارعين", "zoningType": "سكني"}'::jsonb,
        '{"id": "adv-3", "name": "عبد الملك سنان الغولي", "type": "individual", "phone": "773556677", "phoneVerified": true, "allowWhatsapp": true, "allowCall": true}'::jsonb,
        NULL,
        NULL,
        '["https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1000&q=80"]'::jsonb,
        '[
            {"type": "phone_verified", "label": "هاتف المعلن مؤكد", "description": "رقم الاتصال المباشر مؤكد برمز التحقق.", "verifiedAt": "2026-02-18", "verifiedBy": "نظام دلنّي", "validityNote": "سارٍ", "disclaimer": "تأكيد الهاتف لا يعد وثيقة ملكية."},
            {"type": "deed_reviewed", "label": "بصيرة شرعية مفحوصة", "description": "تم فحص صك البصيرة الشرعية ومطابقة الحدود الأربعة بمحضر رسمي.", "verifiedAt": "2026-02-20", "verifiedBy": "سالم بن محفوظ", "validityNote": "معتمد 2026", "disclaimer": "تخضع المعاملة للمعاينة ومصادقة قلم التوثيق بالمحكمة المختصة."}
        ]'::jsonb,
        '[{"status": "published", "timestamp": "2026-02-20 16:30", "changedBy": "عصام العديني", "userRole": "moderator"}]'::jsonb,
        '2026-02-18 11:00:00+03'
    ),

    -- عقار 4: عمارة استثمارية 5 أدوار في تعز (USD) - منشأة الصرح
    (
        'list-104',
        'YEM-2026-104',
        'عمارة استثمارية تجارية وسكنية 5 أدوار في الحوبان - تعز',
        'عمارة تجارية استثمارية ركنية على شارع رئيسي 24 متر، تتكون من 4 محلات تجارية و10 شقق سكنية مؤجرة بالكامل بدخل شهري ممتاز ومضمون، بناء حديث خرساني مسلح ضد الزلازل، خزان مائي أرضي سعة 60 متر مكعب.',
        'building',
        'sale',
        'published',
        480000,
        'USD',
        TRUE,
        600,
        'م²',
        FALSE,
        NULL,
        NULL,
        'TAZ-BLD-2025-104',
        640,
        22,
        FALSE,
        0,
        '{"governorate": "تعز", "city": "تعز", "district": "الحوبان", "street": "جولة الحوبان الشارع العام", "lat": 13.6050, "lng": 44.0620, "isApproximate": true}'::jsonb,
        '{"totalFloors": 5, "buildingAgeYears": 3, "streetWidthMeters": 24, "hasElectricity": true, "hasWaterNetwork": true, "zoningType": "تجاري"}'::jsonb,
        '{"id": "user-org-manager", "name": "شركة الصرح العقارية الحديثة", "type": "organization", "phone": "777123456", "phoneVerified": true, "allowWhatsapp": true, "allowCall": true, "orgId": "org-1"}'::jsonb,
        'user-org-agent',
        'طارق الأصبحي',
        '["https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80"]'::jsonb,
        '[]'::jsonb,
        '[{"status": "published", "timestamp": "2026-02-25 10:00", "changedBy": "عصام العديني", "userRole": "moderator"}]'::jsonb,
        '2026-02-24 16:00:00+03'
    ),

    -- عقار 5: شقة راقية في فوه، المكلا بحضرموت (SAR / سنة)
    (
        'list-105',
        'YEM-2026-105',
        'شقة مطلة على البحر تشطيب سوبر في فوه - المكلا',
        'شقة عائلية هادئة في مدينة المكلا بحضرموت، حي فوه المساكن، 4 غرف واسعة وصالة ومطبخ مجهز، إطلالة بحرية رائعة وتيار كهربائي مستقر، مياه التحلية متوفرة باستمرار.',
        'apartment',
        'rent',
        'published',
        28000,
        'SAR',
        TRUE,
        160,
        'م²',
        FALSE,
        NULL,
        NULL,
        NULL,
        510,
        18,
        FALSE,
        0,
        '{"governorate": "حضرموت", "city": "المكلا", "district": "فوه", "street": "حي المساكن", "lat": 14.5240, "lng": 49.0980, "isApproximate": true}'::jsonb,
        '{"rooms": 4, "bathrooms": 3, "floorNumber": 1, "hasWaterNetwork": true, "hasElectricity": true, "zoningType": "سكني"}'::jsonb,
        '{"id": "adv-1", "name": "هشام عبد الرحمن القدسي", "type": "individual", "phone": "777012345", "phoneVerified": true, "allowWhatsapp": true, "allowCall": true}'::jsonb,
        NULL,
        NULL,
        '["https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80"]'::jsonb,
        '[]'::jsonb,
        '[{"status": "published", "timestamp": "2026-02-27 12:00", "changedBy": "عصام العديني", "userRole": "moderator"}]'::jsonb,
        '2026-02-26 10:00:00+03'
    ),

    -- عقار 6: دار أثري تم إتمام بيعه رسمياً (مكتمل الصفقة ومغلق نهائياً) - مثال عملي على دورة العقار المغلقة
    (
        'list-107',
        'YEM-2026-107',
        'دار تقليدي معماري أصيل في صنعاء القديمة (تم البيع ونقل الحيازة)',
        'دار تاريخي عريق من الحجر والطين بقمريات يمنية ملونة وزخارف جصية بديعة، تم استكمال بيعه رسمياً عبر منصة دلنّي واستيفاء كافة إجراءات البصيرة الشرعية والمخالصة المالية وحيازة العقار.',
        'villa',
        'sale',
        'completed', -- مكتمل ومغلق
        85000000,
        'YER',
        FALSE,
        280,
        'م²',
        FALSE,
        NULL,
        NULL,
        'SAN-OLD-DEED-3310',
        3120,
        89,
        FALSE,
        0,
        '{"governorate": "صنعاء (أمانة العاصمة)", "city": "صنعاء", "district": "صنعاء القديمة", "street": "حارة القاسمي", "lat": 15.3530, "lng": 44.2140, "isApproximate": true}'::jsonb,
        '{"rooms": 6, "bathrooms": 4, "totalFloors": 4, "buildingAgeYears": 40, "zoningType": "سكني"}'::jsonb,
        '{"id": "adv-3", "name": "عبد الملك سنان الغولي", "type": "individual", "phone": "773556677", "phoneVerified": true, "allowWhatsapp": true, "allowCall": true}'::jsonb,
        NULL,
        NULL,
        '["https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=1200&q=80"]'::jsonb,
        '[{"type": "deed_reviewed", "label": "بصيرة معتمدة ومفرغة", "description": "تم توثيق إفراغ البصيرة وتنازل المالك الشرعي.", "verifiedAt": "2026-01-10", "verifiedBy": "سالم بن محفوظ", "validityNote": "منتهٍ بالإفراغ", "disclaimer": "أُغلقت المعاملة بعد الإفراغ الشرعي."}]'::jsonb,
        '[
            {"status": "completed", "timestamp": "2026-01-28 17:00", "changedBy": "عبد الملك سنان الغولي", "userRole": "advertiser", "notes": "تم إتمام الصفقة وإغلاق العقار نهائياً بموجب المحضر الرسمي [DOS-2026-4412] والعقد [CNT-2026-1002]. يمنع إعادة العقار لقوائم التوفر تلقائياً."}
        ]'::jsonb,
        '2026-01-05 10:00:00+03'
    )
ON CONFLICT (id) DO NOTHING;

-- تحديث تفاصيل إغلاق دار صنعاء القديمة لضمان صحة حقول الإغلاق
UPDATE public.listings 
SET deal_outcome = 'sold',
    final_deal_number = 'DOS-2026-4412',
    closed_at = '2026-01-28 17:00:00+03',
    closed_by = 'عبد الملك سنان الغولي'
WHERE id = 'list-107';

-- --------------------------------------------------------------------
-- 4. طلبات الباحثين (Property Requests)
-- --------------------------------------------------------------------
INSERT INTO public.property_requests (
    id, request_number, listing_id, listing_title, listing_number, listing_price, listing_currency,
    seeker_id, seeker_name, seeker_phone, advertiser_id, advertiser_name, advertiser_phone,
    request_type, status, notes, offered_price, preferred_date, requested_duration_hours, booking_id, created_at
)
VALUES
    -- طلب 1: تم قبوله وتحويله إلى حجز مؤقت حصري (الصفقة النشطة list-101)
    (
        'req-101',
        'REQ-2026-1001',
        'list-101',
        'فيلا سوبر ديلوكس مودرن في أرقى أحياء حدة',
        'YEM-2026-101',
        320000,
        'USD',
        'usr-seeker',
        'أصيل محمد الحكيمي',
        '778990011',
        'adv-1',
        'هشام عبد الرحمن القدسي',
        '777012345',
        'booking_intent',
        'accepted',
        'أرغب في حجز الفيلا مؤقتاً لمعاينتها برفقة مهندس معماري وفحص أوراق البصيرة الشرعية.',
        310000,
        '2026-03-05',
        48,
        'bkg-101',
        '2026-03-02 10:15:00+03'
    ),
    -- طلب 2: طلب استفسار ومعاينة معلق لشقة خورمكسر
    (
        'req-102',
        'REQ-2026-1002',
        'list-102',
        'شقة عائلية فاخرة مفروشة في خورمكسر بإطلالة بحرية',
        'YEM-2026-102',
        350000,
        'YER',
        'usr-seeker-2',
        'معاذ سالم باوزير',
        '772113355',
        'user-org-manager',
        'شركة الصرح العقارية الحديثة',
        '777123456',
        'visit_inquiry',
        'pending',
        'نحن عائلة من 4 أفراد، هل يتوفر مصعد يعمل أثناء انقطاع الكهرباء؟ ونرغب في تحديد موعد للمعاينة الجمعة القادمة.',
        350000,
        '2026-03-06',
        48,
        NULL,
        '2026-03-03 11:30:00+03'
    )
ON CONFLICT (id) DO NOTHING;

-- --------------------------------------------------------------------
-- 5. الحجوزات المؤقتة الحصرية (Property Bookings)
-- --------------------------------------------------------------------
INSERT INTO public.property_bookings (
    id, booking_number, request_id, listing_id, listing_title, listing_number, listing_price, listing_currency, listing_purpose,
    seeker_id, seeker_name, seeker_phone, advertiser_id, advertiser_name, advertiser_phone,
    status, duration_hours, start_date, expires_at, confirmed_by, deal_stage, contract_id, contract_number,
    inspection_visit, current_terms, agreed_terms, terms_status, messages, created_at
)
VALUES
    -- حجز 1: حجز حصري نشط على فيلا حدة (list-101)
    (
        'bkg-101',
        'BKG-2026-2001',
        'req-101',
        'list-101',
        'فيلا سوبر ديلوكس مودرن في أرقى أحياء حدة',
        'YEM-2026-101',
        320000,
        'USD',
        'sale',
        'usr-seeker',
        'أصيل محمد الحكيمي',
        '778990011',
        'adv-1',
        'هشام عبد الرحمن القدسي',
        '777012345',
        'active',
        48,
        NOW() - INTERVAL '12 hours',
        NOW() + INTERVAL '36 hours',
        'هشام عبد الرحمن القدسي',
        'terms_negotiation',
        'cnt-101',
        'CNT-2026-3001',
        '{"status": "confirmed", "requestedDate": "2026-03-04", "requestedTime": "16:00", "locationNotes": "أمام بوابة الفيلا الرئيسية", "result": "satisfied", "resultNotes": "تمت المعاينة ومطابقة المواصفات ورضا المشتري التام."}'::jsonb,
        '{"price": 315000, "currency": "USD", "paymentMethod": "شيك مصرفي مصدق", "depositAmount": 15000, "depositCurrency": "USD", "handoverDate": "2026-03-15", "feeResponsibility": "shared_equally", "specialConditions": ["فحص أصل البصيرة في قلم التوثيق", "تسليم كافة فواتير الكهرباء والماء السابقة"]}'::jsonb,
        '{"price": 315000, "currency": "USD", "paymentMethod": "شيك مصرفي مصدق", "depositAmount": 15000, "depositCurrency": "USD", "handoverDate": "2026-03-15", "feeResponsibility": "shared_equally", "specialConditions": ["فحص أصل البصيرة في قلم التوثيق", "تسليم كافة فواتير الكهرباء والماء السابقة"]}'::jsonb,
        'accepted',
        '[
            {"id": "msg-101-1", "bookingId": "bkg-101", "senderId": "system", "senderName": "نظام دلنّي الآلي", "senderRole": "system_admin", "type": "system", "text": "تم تفعيل الحجز الحصري لمدة 48 ساعة وقفل العقار عن الجمهور.", "timestamp": "2026-03-02 11:00"},
            {"id": "msg-101-2", "bookingId": "bkg-101", "senderId": "usr-seeker", "senderName": "أصيل الحكيمي", "senderRole": "seeker", "type": "chat", "text": "السلام عليكم، هل يمكن المعاينة اليوم عصراً ومطابقة أصل البصيرة؟", "timestamp": "2026-03-02 11:30"},
            {"id": "msg-101-3", "bookingId": "bkg-101", "senderId": "adv-1", "senderName": "هشام القدسي", "senderRole": "advertiser", "type": "chat", "text": "أهلاً بك أستاذ أصيل، مرحباً بك في تمام الرابعة عصراً، والأصول جاهزة للفحص.", "timestamp": "2026-03-02 11:45"}
        ]'::jsonb,
        '2026-03-02 11:00:00+03'
    ),

    -- حجز 2: حجز مكتمل لدار صنعاء القديمة (list-107) - مسجل في السجل الدائم
    (
        'bkg-102',
        'BKG-2026-2002',
        'req-101', -- رابط الطلب
        'list-107',
        'دار تقليدي معماري أصيل في صنعاء القديمة (تم البيع ونقل الحيازة)',
        'YEM-2026-107',
        85000000,
        'YER',
        'sale',
        'usr-seeker',
        'أصيل محمد الحكيمي',
        '778990011',
        'adv-3',
        'عبد الملك سنان الغولي',
        '773556677',
        'completed',
        48,
        '2026-01-20 09:00:00+03',
        '2026-01-22 09:00:00+03',
        'عبد الملك سنان الغولي',
        'contract_completed',
        'cnt-102',
        'CNT-2026-1002',
        '{"status": "completed", "result": "satisfied"}'::jsonb,
        '{"price": 85000000, "currency": "YER"}'::jsonb,
        '{"price": 85000000, "currency": "YER"}'::jsonb,
        'accepted',
        '[]'::jsonb,
        '2026-01-20 09:00:00+03'
    )
ON CONFLICT (id) DO NOTHING;

-- تحديث المخالصة ومحضر الاستلام للحجز المكتمل bkg-102
UPDATE public.property_bookings
SET deal_outcome = 'sold',
    completed_at = '2026-01-28 17:00:00+03',
    completed_by = 'عبد الملك سنان الغولي',
    final_dossier_number = 'DOS-2026-4412',
    financial_clearance = '{"status": "cleared", "totalAmount": 85000000, "paidAmount": 85000000, "currency": "YER", "receiptVoucherNumber": "RCV-YE-2026-0914", "paymentMethod": "شيك مصرفي مصدق بنك اليمن والكويت", "clearanceDate": "2026-01-28", "clearedBy": "عبد الملك سنان الغولي"}'::jsonb,
    handover_protocol = '{"status": "completed", "handoverDate": "2026-01-28", "handedOverBy": "عبد الملك سنان الغولي", "receivedBy": "أصيل محمد الحكيمي", "deedVerified": true, "originalDeedHandedOver": true, "deedNumber": "SAN-OLD-DEED-3310", "notes": "تم تسليم حيازة الدار وأصل البصيرة الشرعية وإفراغها لدى قلم التوثيق."}'::jsonb
WHERE id = 'bkg-102';

-- --------------------------------------------------------------------
-- 6. العقود والتواقيع الإلكترونية (Property Contracts)
-- --------------------------------------------------------------------
INSERT INTO public.property_contracts (
    id, contract_number, booking_id, booking_number, listing_id, listing_number, listing_title,
    contract_type, status, current_version, property_snapshot, first_party, second_party,
    financial_terms, clauses, version_history, first_party_approval, first_party_approved_at, first_party_approved_version,
    second_party_approval, second_party_approved_at, second_party_approved_version,
    electronic_signatures, created_at
)
VALUES
    -- عقد 1: مسودة معتمدة وموقعة إلكترونياً من الطرفين لفيلا حدة (bkg-101)
    (
        'cnt-101',
        'CNT-2026-3001',
        'bkg-101',
        'BKG-2026-2001',
        'list-101',
        'YEM-2026-101',
        'فيلا سوبر ديلوكس مودرن في أرقى أحياء حدة',
        'sale',
        'approved',
        1,
        '{"title": "فيلا سوبر ديلوكس مودرن في أرقى أحياء حدة", "propertyType": "villa", "purpose": "sale", "governorate": "صنعاء (أمانة العاصمة)", "city": "صنعاء", "district": "حدة", "area": 450, "areaUnit": "م²", "deedNumber": "SAN-DEED-2024-9982"}'::jsonb,
        '{"id": "adv-1", "name": "هشام عبد الرحمن القدسي", "phone": "777012345", "role": "seller", "nationalIdOrPassport": "01010045981", "address": "صنعاء - حدة"}'::jsonb,
        '{"id": "usr-seeker", "name": "أصيل محمد الحكيمي", "phone": "778990011", "role": "buyer", "nationalIdOrPassport": "01020088741", "address": "صنعاء - بيت بوس"}'::jsonb,
        '{"totalAmount": 315000, "currency": "USD", "depositAmount": 15000, "depositCurrency": "USD", "paymentSchedule": "عربون 15,000$ والباقي 300,000$ عند الإفراغ الشرعي والتسليم"}'::jsonb,
        '[
            {"id": "cl-1", "number": 1, "title": "موضوع العقد والبيانات الشرعية", "content": "اتفق الطرفان على بيع وشراء العقار الموصوف أعلاه بكامل مرافقه القانونية بصيرة شرعية حرة وخالية من أي حجة أو رهن."},
            {"id": "cl-2", "number": 2, "title": "الثمن وطريقة السداد", "content": "تم الاتفاق على القيمة الإجمالية 315,000 دولار أمريكي تسدد بموجب شيكات مصرفية مصدقة."},
            {"id": "cl-3", "number": 3, "title": "معاينة العقار والحيازة", "content": "يقر الطرف الثاني بمعاينة العقار المعاينة التامة النافية للجهالة شرعاً وقانوناً."}
        ]'::jsonb,
        '[]'::jsonb,
        TRUE,
        '2026-03-03 14:00:00+03',
        1,
        TRUE,
        '2026-03-03 15:30:00+03',
        1,
        '[
            {"id": "sig-1", "partyRole": "firstParty", "signerId": "adv-1", "signerName": "هشام عبد الرحمن القدسي", "signerPhone": "777012345", "nationalIdOrPassport": "01010045981", "contractVersion": 1, "signedAt": "2026-03-03 14:00", "verificationCode": "OTP-88124", "digitalFingerprint": "SHA256:d9b2e1a4f8c9...", "legalDisclaimerAcknowledged": true},
            {"id": "sig-2", "partyRole": "secondParty", "signerId": "usr-seeker", "signerName": "أصيل محمد الحكيمي", "signerPhone": "778990011", "nationalIdOrPassport": "01020088741", "contractVersion": 1, "signedAt": "2026-03-03 15:30", "verificationCode": "OTP-44091", "digitalFingerprint": "SHA256:b1a7c3d2e9f0...", "legalDisclaimerAcknowledged": true}
        ]'::jsonb,
        '2026-03-03 12:00:00+03'
    )
ON CONFLICT (id) DO NOTHING;

-- --------------------------------------------------------------------
-- 7. طلبات التحقق والوثائق (Verification Requests)
-- --------------------------------------------------------------------
INSERT INTO public.verification_requests (
    id, request_type, target_id, target_name, listing_id, listing_title, listing_code, deed_number,
    submitted_by, submitted_by_phone, status, moderator_notes, reviewed_by, reviewed_at, created_at
)
VALUES
    (
        'ver-1',
        'individual_advertiser',
        'adv-1',
        'هشام عبد الرحمن القدسي',
        NULL,
        NULL,
        NULL,
        NULL,
        'adv-1',
        '777012345',
        'approved',
        'تمت مطابقة صورة البطاقة الشخصية الذكية مع السجل والاسم، وتأكيد الهوية بنجاح.',
        'سالم بن محفوظ (مسؤول التحقق)',
        '2026-02-12 11:30:00+03',
        '2026-02-10 09:00:00+03'
    ),
    (
        'ver-2',
        'organization',
        'org-1',
        'شركة الصرح العقارية الحديثة',
        NULL,
        NULL,
        NULL,
        NULL,
        'user-org-manager',
        '777123456',
        'approved',
        'تم فحص السجل التجاري CR-YE-40912 وترخيص وزارة الأشغال والمكتب الميداني بصنعاء.',
        'سالم بن محفوظ (مسؤول التحقق)',
        '2026-01-15 14:00:00+03',
        '2026-01-12 10:00:00+03'
    ),
    (
        'ver-3',
        'property_deed',
        'list-103',
        'أرض سكنية تجارية على شارعين في بيت بوس',
        'list-103',
        'أرض سكنية تجارية على شارعين في بيت بوس',
        'YEM-2026-103',
        'BOS-LAND-7714',
        'adv-3',
        '773556677',
        'approved',
        'تمت مطابقة البصيرة الشرعية الصادرة من محكمة جنوب غرب الأمانة وفحص حدود الشوارع ومساحة اللبن.',
        'سالم بن محفوظ (مسؤول التحقق)',
        '2026-02-20 16:00:00+03',
        '2026-02-19 11:00:00+03'
    )
ON CONFLICT (id) DO NOTHING;

-- --------------------------------------------------------------------
-- 8. البلاغات والقضايا (Reports)
-- --------------------------------------------------------------------
INSERT INTO public.reports (
    id, report_number, case_number, reporter_id, reporter_name, reporter_phone, target_type, target_id,
    listing_id, listing_title, listing_snapshot_price, reason, details, priority, status, assigned_officer, created_at
)
VALUES
    (
        'rep-1',
        'REP-2026-0041',
        'CASE-2026-881',
        'usr-seeker-2',
        'معاذ سالم باوزير',
        '772113355',
        'listing',
        'list-101',
        'list-101',
        'فيلا سوبر ديلوكس في حدة',
        '320,000 USD',
        'استفسار عن عرض الشارع الميداني',
        'أود التأكد من عرض الشارع الإسفلتي أمام بوابة الفيلا هل هو 14 أم 16 متراً بدقة.',
        'low',
        'investigating',
        'مختار الهمداني',
        '2026-03-01 16:40:00+03'
    )
ON CONFLICT (id) DO NOTHING;

-- --------------------------------------------------------------------
-- 9. تذاكر الدعم الفني (Support Tickets)
-- --------------------------------------------------------------------
INSERT INTO public.support_tickets (
    id, ticket_number, user_id, user_name, user_phone, subject, category, priority, status, messages, created_at
)
VALUES
    (
        'tkt-1',
        'TKT-2026-801',
        'adv-1',
        'هشام القدسي',
        '777012345',
        'استفسار عن إرفاق جولة افتراضية عالية الدقة للفيلا',
        'inquiry',
        'medium',
        'resolved',
        '[
            {"id": "msg-1", "senderId": "adv-1", "senderName": "هشام القدسي", "senderRole": "user", "text": "السلام عليكم، هل يمكن تضمين رابط فيديو يوتيوب أو جولة افتراضية في وصف الإعلان؟", "timestamp": "2026-03-01 14:10"},
            {"id": "msg-2", "senderId": "usr-sup-1", "senderName": "خلود العبسي", "senderRole": "support", "text": "وعليكم السلام ورحمة الله، نعم أستاذ هشام، يمكنك إدراج روابط الفيديو في الوصف أو إرسالها لربطها في المعرض.", "timestamp": "2026-03-01 15:30"}
        ]'::jsonb,
        '2026-03-01 14:10:00+03'
    )
ON CONFLICT (id) DO NOTHING;

-- --------------------------------------------------------------------
-- 10. طاقم العمل والموظفون (Staff Members)
-- --------------------------------------------------------------------
INSERT INTO public.staff_members (
    id, user_id, employee_code, name, email, phone, role, department, status, permissions, custom_permissions, two_factor_enabled, created_at
)
VALUES
    ('staff-01', 'usr-sys-admin', 'EMP-ADM-001', 'المهندس / مدير النظام العام', 'admin@dalani.ye', '770000000', 'system_admin', 'الإدارة العليا للأنظمة', 'active', '["*"]'::jsonb, '["*"]'::jsonb, TRUE, '2025-01-01 08:00:00+03'),
    ('staff-02', 'usr-mod-1', 'EMP-MOD-104', 'عصام العديني', 'issam.mod@dalani.ye', '770112233', 'moderator', 'مراجعة واعتماد المحتوى', 'active', '["view_all_listings", "approve_listings", "reject_listings"]'::jsonb, '[]'::jsonb, TRUE, '2025-05-01 08:00:00+03'),
    ('staff-03', 'usr-ver-1', 'EMP-VER-201', 'سالم بن محفوظ', 'salem.ver@dalani.ye', '770223344', 'verifier', 'فحص الوثائق والبصائر', 'active', '["review_deeds", "verify_advertisers", "grant_badges"]'::jsonb, '[]'::jsonb, TRUE, '2025-05-01 08:00:00+03'),
    ('staff-04', 'usr-rep-1', 'EMP-REP-301', 'مختار الهمداني', 'mukhtar.rep@dalani.ye', '770334455', 'reporter_admin', 'النزاعات والشكاوى', 'active', '["investigate_reports", "freeze_listings", "resolve_disputes"]'::jsonb, '[]'::jsonb, TRUE, '2025-05-01 08:00:00+03')
ON CONFLICT (id) DO NOTHING;

-- --------------------------------------------------------------------
-- 11. إعدادات المنصة العامة (System Settings)
-- --------------------------------------------------------------------
INSERT INTO public.system_settings (id, settings, updated_at)
VALUES (
    'global',
    '{
        "platformName": "دلنّي - المنصة العقارية اليمنية المعتمدة",
        "platformTagline": "الأمان والتوثيق والشفافية في السوق العقاري اليمني",
        "officialEmail": "info@dalani.ye",
        "supportPhone": "+967 1 200 300",
        "maintenanceMode": false,
        "defaultCurrency": "YER",
        "allowNewRegistrations": true,
        "allowPublicAdSubmissions": true,
        "enforce2FAForStaff": true,
        "requirePhoneOtp": true,
        "strictKycForHighValue": true,
        "sessionTimeoutMinutes": 120,
        "maxBookingDurationHours": 168,
        "defaultBookingDurationHours": 48,
        "commissionPercentage": 1.0
    }'::jsonb,
    NOW()
)
ON CONFLICT (id) DO UPDATE SET settings = EXCLUDED.settings, updated_at = NOW();

-- --------------------------------------------------------------------
-- 12. سجل التدقيق والعمليات الرقابي (Audit Logs)
-- --------------------------------------------------------------------
INSERT INTO public.audit_logs (id, user_id, user_name, user_role, action, category, target_type, target_id, status, result, details, ip_address, created_at)
VALUES
    ('log-1', 'usr-mod-1', 'عصام العديني', 'moderator', 'اعتماد ونشر إعلان', 'listings', 'listing', 'list-101', 'success', 'success', 'فحص الموقع الجغرافي والخصائص والموافقة على نشر فيلا حدة', '185.190.22.40 (صنعاء)', '2026-02-12 11:00:00+03'),
    ('log-2', 'usr-ver-1', 'سالم بن محفوظ', 'verifier', 'منح شارة بصيرة شرعية مفحوصة', 'verification', 'listing', 'list-103', 'success', 'success', 'فحص صك ملكية أرض بيت بوس ومطابقة الحدود والأختام', '185.190.22.41 (صنعاء)', '2026-02-20 16:00:00+03'),
    ('log-3', 'usr-sys-admin', 'مدير النظام', 'system_admin', 'تفعيل الحجز المؤقت الحصري', 'bookings', 'booking', 'bkg-101', 'success', 'success', 'تأكيد حجز فيلا حدة وقفل العقار حصرياً لمدة 48 ساعة', '185.190.22.10 (صنعاء)', '2026-03-02 11:00:00+03'),
    ('log-4', 'adv-3', 'عبد الملك سنان الغولي', 'advertiser', 'إتمام صفقة البيع والإغلاق', 'deals', 'booking', 'bkg-102', 'success', 'success', 'إتمام بيع دار صنعاء القديمة وإصدار المحضر النهائي DOS-2026-4412', '185.190.22.88 (صنعاء)', '2026-01-28 17:00:00+03')
ON CONFLICT (id) DO NOTHING;

-- --------------------------------------------------------------------
-- 13. الإشعارات النموذجية (Notifications)
-- --------------------------------------------------------------------
INSERT INTO public.notifications (id, user_id, title, message, type, is_read, metadata, created_at)
VALUES
    ('ntf-1', 'usr-seeker', 'تم قبول طلب الحجز المؤقت', 'وافق المعلن هشام القدسي على طلب الحجز للفيلا YEM-2026-101، وتم قفل العقار حصرياً لصالحك.', 'booking', FALSE, '{"bookingId": "bkg-101", "listingId": "list-101"}'::jsonb, '2026-03-02 11:00:00+03'),
    ('ntf-2', 'adv-1', 'طلب معاينة جديد على عقارك', 'تلقيت طلباً جديداً من الأستاذ أصيل الحكيمي لمعاينة فيلا حدة.', 'request', TRUE, '{"requestId": "req-101", "listingId": "list-101"}'::jsonb, '2026-03-02 10:15:00+03')
ON CONFLICT (id) DO NOTHING;
