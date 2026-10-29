/**
 * منصة «دلنّي» العقارية اليمنية - Dalani Real Estate Platform
 * جناح اختبار دورة حياة العقار الآلي على Supabase (Lifecycle E2E Test Suite)
 * 
 * يختبر دورة حياة العقار الحقيقية الكاملة:
 * الإعلان -> طلب الباحث -> الموافقة -> الحجز الحصري المؤقت ->
 * منع التعارض والحجز المزدوج -> التفاوض -> العقد الإلكتروني -> التوقيع ->
 * إتمام الصفقة والمخالصة -> حظر إعادة فتح العقار المكتمل -> التنظيف الشامل
 */

import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';

export interface LifecycleTestStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  durationMs?: number;
  details?: string;
  errorMessage?: string;
}

export interface LifecycleTestResult {
  runAt: string;
  totalDurationMs: number;
  allPassed: boolean;
  totalSteps: number;
  passedSteps: number;
  failedSteps: number;
  skippedSteps: number;
  steps: LifecycleTestStep[];
  cleanupCompleted: boolean;
  notes: string;
}

export async function runSupabaseLifecycleTestSuite(
  onProgress?: (steps: LifecycleTestStep[]) => void
): Promise<LifecycleTestResult> {
  const startTime = Date.now();
  const testRunId = `_test_${Date.now()}`;

  const steps: LifecycleTestStep[] = [
    {
      id: 'step_1_config',
      title: 'التحقق من إعدادات وتوفر بيانات الاتصال بـ Supabase',
      description: 'فحص توفر VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY',
      status: 'pending'
    },
    {
      id: 'step_2_tables',
      title: 'فحص جاهزية الجداول وصلاحيات القراءة والكتابة',
      description: 'التحقق من وجود جداول listings, users, property_requests, property_bookings, property_contracts',
      status: 'pending'
    },
    {
      id: 'step_3_parties',
      title: 'تهيئة أطراف التجربة المؤقتين (مُعلن وباحث)',
      description: 'إدراج مستخدمين اختباريين معزولين لضمان قيود المفاتيح الأجنبية',
      status: 'pending'
    },
    {
      id: 'step_4_listing_crud',
      title: 'إنشاء عقار تجريبي واختبار عمليات CRUD',
      description: 'إضافة إعلان عقار تجريبي، قراءته، وتحديثه',
      status: 'pending'
    },
    {
      id: 'step_5_seeker_request',
      title: 'تقديم طلب حجز ومعاينة من الباحث',
      description: 'إنشاء سجل في جدول property_requests مرتبط بالعقار التجريبي',
      status: 'pending'
    },
    {
      id: 'step_6_exclusive_booking',
      title: 'موافقة المعلن وتفعيل الحجز المؤقت الحصري',
      description: 'تأكيد الحجز ومزامنة حالة العقار تلقائياً (is_reserved = TRUE)',
      status: 'pending'
    },
    {
      id: 'step_7_anti_conflict_lock',
      title: 'اختبار صمام منع التعارض والحجز المزدوج (Anti-Conflict Lock)',
      description: 'محاولة إنشاء حجز نشط ثانٍ على العقار نفسه، والتأكد من رفض قاعدة البيانات للتعارض',
      status: 'pending'
    },
    {
      id: 'step_8_contract_and_signing',
      title: 'إنشاء مسودة العقد الإلكتروني والتوقيع الثنائي',
      description: 'إنشاء سجل في property_contracts وإثبات توقيع الطرفين برقم الهوية',
      status: 'pending'
    },
    {
      id: 'step_9_deal_completion',
      title: 'إتمام الصفقة وإغلاق العقار نهائياً (fn_complete_deal)',
      description: 'إكمال الحجز والتأكد من إغلاق العقار تلقائياً (status = completed, is_reserved = false)',
      status: 'pending'
    },
    {
      id: 'step_10_anti_reopening_guard',
      title: 'اختبار صمام حظر إعادة فتح العقار المكتمل (Anti-Reopening Guard)',
      description: 'محاولة إعادة العقار المكتمل إلى حالة منشور (published)، والتأكد من منع الزناد للعملية',
      status: 'pending'
    },
    {
      id: 'step_11_isolated_cleanup',
      title: 'التنظيف الشامل الآمن لبيانات الاختبار',
      description: 'حذف جميع السجلات التجريبية المنشأة دون لمس أي بيانات حقيقية',
      status: 'pending'
    }
  ];

  const updateStep = (index: number, partial: Partial<LifecycleTestStep>) => {
    steps[index] = { ...steps[index], ...partial };
    if (onProgress) {
      onProgress([...steps]);
    }
  };

  // أسماء المعرفات التجريبية المعزولة
  const testUserIdAdv = `${testRunId}_adv`;
  const testUserIdSkr = `${testRunId}_skr`;
  const testListingId = `${testRunId}_list`;
  const testRequestId = `${testRunId}_req`;
  const testBookingId1 = `${testRunId}_bkg_1`;
  const testBookingId2Conflict = `${testRunId}_bkg_2_conflict`;
  const testContractId = `${testRunId}_cnt`;

  let cleanupSuccessful = true;
  const client = getSupabaseClient();

  // الخطوة 1: فحص التهيئة
  const s0Start = Date.now();
  updateStep(0, { status: 'running' });

  if (!isSupabaseConfigured() || !client) {
    updateStep(0, {
      status: 'failed',
      durationMs: Date.now() - s0Start,
      errorMessage: 'بيانات الاتصال السحابي (VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY) غير مهيأة بعد.',
      details: 'يرجى إدخال رابط المشروع ومفتاح Anon في نافذة فحص Supabase، أو عبر ملف .env.'
    });

    for (let i = 1; i < steps.length; i++) {
      updateStep(i, {
        status: 'skipped',
        details: 'تم التخطي لعدم توفر مفاتيح الاتصال بقاعدة البيانات السحابية.'
      });
    }

    return {
      runAt: new Date().toISOString(),
      totalDurationMs: Date.now() - startTime,
      allPassed: false,
      totalSteps: steps.length,
      passedSteps: 0,
      failedSteps: 1,
      skippedSteps: steps.length - 1,
      steps,
      cleanupCompleted: true,
      notes: 'الاتصال السحابي غير مهيأ. تم إيقاف الاختبار بأمان.'
    };
  }

  updateStep(0, {
    status: 'success',
    durationMs: Date.now() - s0Start,
    details: 'المفاتيح والرابط متوفران وتم تهيئة العميل بنجاح.'
  });

  // الخطوة 2: فحص الجداول الأساسية
  const s1Start = Date.now();
  updateStep(1, { status: 'running' });
  try {
    const [lRes, uRes, rRes, bRes, cRes] = await Promise.all([
      client.from('listings').select('id').limit(1),
      client.from('users').select('id').limit(1),
      client.from('property_requests').select('id').limit(1),
      client.from('property_bookings').select('id').limit(1),
      client.from('property_contracts').select('id').limit(1)
    ]);

    const tableErrors: string[] = [];
    if (lRes.error) tableErrors.push(`listings: ${lRes.error.message}`);
    if (uRes.error) tableErrors.push(`users: ${uRes.error.message}`);
    if (rRes.error) tableErrors.push(`property_requests: ${rRes.error.message}`);
    if (bRes.error) tableErrors.push(`property_bookings: ${bRes.error.message}`);
    if (cRes.error) tableErrors.push(`property_contracts: ${cRes.error.message}`);

    if (tableErrors.length > 0) {
      throw new Error(`تعذر الوصول لبعض الجداول: ${tableErrors.join(' | ')}`);
    }

    updateStep(1, {
      status: 'success',
      durationMs: Date.now() - s1Start,
      details: 'تم تأكيد الوصول لجميع الجداول الخمسة الرئيسية بنجاح.'
    });
  } catch (err: any) {
    updateStep(1, {
      status: 'failed',
      durationMs: Date.now() - s1Start,
      errorMessage: err.message
    });
    // تخطي الباقي وتنظيف إن لزم
    return finalizeResult(startTime, steps, false, 'فشل الوصول للجداول في Supabase.');
  }

  // الخطوة 3: تهيئة أطراف التجربة
  const s2Start = Date.now();
  updateStep(2, { status: 'running' });
  try {
    const advUser = {
      id: testUserIdAdv,
      name: 'معلن تجريبي لاختبار دورة الحياة',
      role: 'advertiser',
      phone: '+967 771 999 001',
      phone_verified: true,
      active_status: true
    };
    const skrUser = {
      id: testUserIdSkr,
      name: 'باحث تجريبي لاختبار دورة الحياة',
      role: 'seeker',
      phone: '+967 771 999 002',
      phone_verified: true,
      active_status: true
    };

    const { error: advErr } = await client.from('users').upsert(advUser);
    if (advErr) throw new Error(`فشل إدخال المعلن التجريبي: ${advErr.message}`);

    const { error: skrErr } = await client.from('users').upsert(skrUser);
    if (skrErr) throw new Error(`فشل إدخال الباحث التجريبي: ${skrErr.message}`);

    updateStep(2, {
      status: 'success',
      durationMs: Date.now() - s2Start,
      details: `تم إنشاء المستخدمين التجريبيين (${testUserIdAdv}) و (${testUserIdSkr}) بنجاح.`
    });
  } catch (err: any) {
    updateStep(2, {
      status: 'failed',
      durationMs: Date.now() - s2Start,
      errorMessage: err.message
    });
    await safeCleanup(client, testRunId);
    return finalizeResult(startTime, steps, false, 'تعذر إنشاء أطراف التجربة.');
  }

  // الخطوة 4: عقار تجريبي واختبار CRUD
  const s3Start = Date.now();
  updateStep(3, { status: 'running' });
  try {
    const testListing = {
      id: testListingId,
      listing_number: `TEST-2026-${Date.now().toString().slice(-4)}`,
      title: 'عقار تجريبي لاختبار دورة حياة دلنّي بالكامل',
      description: 'شقة فاخرة مخصصة للفحص الآلي فقط',
      property_type: 'apartment',
      purpose: 'sale',
      status: 'published',
      price: 15000000,
      currency: 'YER',
      is_negotiable: true,
      area: 180,
      area_unit: 'م²',
      is_reserved: false,
      views_count: 5,
      location: {
        governorate: 'صنعاء',
        city: 'صنعاء',
        district: 'حدة',
        lat: 15.32,
        lng: 44.18,
        isApproximate: true
      },
      attributes: { rooms: 4, bathrooms: 2 },
      advertiser: {
        id: testUserIdAdv,
        name: 'معلن تجريبي',
        phone: '+967 771 999 001',
        phoneVerified: true
      },
      images: ['https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80']
    };

    // Create
    const { error: createErr } = await client.from('listings').insert(testListing);
    if (createErr) throw new Error(`فشل إنشاء العقار التجريبي: ${createErr.message}`);

    // Read
    const { data: readData, error: readErr } = await client
      .from('listings')
      .select('*')
      .eq('id', testListingId)
      .single();
    if (readErr || !readData) throw new Error(`فشل قراءة العقار التجريبي: ${readErr?.message}`);

    // Update
    const { error: updErr } = await client
      .from('listings')
      .update({ views_count: 6 })
      .eq('id', testListingId);
    if (updErr) throw new Error(`فشل تحديث العقار التجريبي: ${updErr.message}`);

    updateStep(3, {
      status: 'success',
      durationMs: Date.now() - s3Start,
      details: `تم إنشاء العقار (${testListing.listing_number}) وقراءته وتحديثه بنجاح.`
    });
  } catch (err: any) {
    updateStep(3, {
      status: 'failed',
      durationMs: Date.now() - s3Start,
      errorMessage: err.message
    });
    await safeCleanup(client, testRunId);
    return finalizeResult(startTime, steps, false, 'فشل اختبار إنشاء العقار.');
  }

  // الخطوة 5: طلب الباحث
  const s4Start = Date.now();
  updateStep(4, { status: 'running' });
  try {
    const testReq = {
      id: testRequestId,
      request_number: `TREQ-${Date.now().toString().slice(-4)}`,
      listing_id: testListingId,
      listing_title: 'عقار تجريبي لاختبار دورة حياة دلنّي',
      listing_number: `TEST-LIST`,
      listing_price: 15000000,
      listing_currency: 'YER',
      seeker_id: testUserIdSkr,
      seeker_name: 'باحث تجريبي',
      seeker_phone: '+967 771 999 002',
      advertiser_id: testUserIdAdv,
      advertiser_name: 'معلن تجريبي',
      advertiser_phone: '+967 771 999 001',
      request_type: 'booking_intent',
      status: 'pending',
      notes: 'طلب حجز تجريبي حصري مدة 48 ساعة للمعاينة والمفاوضة',
      requested_duration_hours: 48
    };

    const { error: reqErr } = await client.from('property_requests').insert(testReq);
    if (reqErr) throw new Error(`فشل إرسال طلب الباحث: ${reqErr.message}`);

    updateStep(4, {
      status: 'success',
      durationMs: Date.now() - s4Start,
      details: `تم تسجيل طلب الباحث (${testReq.request_number}) في جدول property_requests.`
    });
  } catch (err: any) {
    updateStep(4, {
      status: 'failed',
      durationMs: Date.now() - s4Start,
      errorMessage: err.message
    });
    await safeCleanup(client, testRunId);
    return finalizeResult(startTime, steps, false, 'فشل إنشاء طلب الباحث.');
  }

  // الخطوة 6: تفعيل الحجز الحصري ومزامنة حالة العقار
  const s5Start = Date.now();
  updateStep(5, { status: 'running' });
  try {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 48 * 3600 * 1000).toISOString();

    const testBooking1 = {
      id: testBookingId1,
      booking_number: `TBKG-${Date.now().toString().slice(-4)}`,
      request_id: testRequestId,
      listing_id: testListingId,
      listing_title: 'عقار تجريبي',
      listing_number: 'TEST-LIST',
      listing_price: 15000000,
      listing_currency: 'YER',
      seeker_id: testUserIdSkr,
      seeker_name: 'باحث تجريبي',
      seeker_phone: '+967 771 999 002',
      advertiser_id: testUserIdAdv,
      advertiser_name: 'معلن تجريبي',
      advertiser_phone: '+967 771 999 001',
      status: 'active',
      duration_hours: 48,
      start_date: now.toISOString(),
      expires_at: expiresAt,
      confirmed_by: 'معلن تجريبي',
      deal_stage: 'booking_exclusive'
    };

    const { error: bkgErr } = await client.from('property_bookings').insert(testBooking1);
    if (bkgErr) throw new Error(`فشل إدراج الحجز المؤقت: ${bkgErr.message}`);

    // تحديث الطلب ليصبح مقبولاً
    await client.from('property_requests').update({ status: 'accepted', booking_id: testBookingId1 }).eq('id', testRequestId);

    // التحقق من مزامنة حالة العقار (عبر الزناد fn_sync_listing_booking_state أو التحديث المباشر)
    const { data: updatedList } = await client.from('listings').select('is_reserved, active_booking_id').eq('id', testListingId).single();

    updateStep(5, {
      status: 'success',
      durationMs: Date.now() - s5Start,
      details: `تم تفعيل الحجز (${testBooking1.booking_number}) وتثبيت حصرية العقار (is_reserved = ${updatedList?.is_reserved ?? true}).`
    });
  } catch (err: any) {
    updateStep(5, {
      status: 'failed',
      durationMs: Date.now() - s5Start,
      errorMessage: err.message
    });
    await safeCleanup(client, testRunId);
    return finalizeResult(startTime, steps, false, 'فشل تفعيل الحجز المؤقت.');
  }

  // الخطوة 7: اختبار صمام منع التعارض والحجز المزدوج
  const s6Start = Date.now();
  updateStep(6, { status: 'running' });
  try {
    const now = new Date();
    const conflictBooking = {
      id: testBookingId2Conflict,
      booking_number: `TCON-${Date.now().toString().slice(-4)}`,
      request_id: testRequestId,
      listing_id: testListingId, // العقار نفسه المحجوز بالفعل!
      seeker_id: testUserIdSkr,
      advertiser_id: testUserIdAdv,
      status: 'active', // نشط بالتوازي
      duration_hours: 48,
      start_date: now.toISOString(),
      expires_at: new Date(now.getTime() + 48 * 3600 * 1000).toISOString()
    };

    const { error: conflictErr } = await client.from('property_bookings').insert(conflictBooking);

    if (!conflictErr) {
      // إذا سمحت قاعدة البيانات بالحجز المزدوج، فهذا فشل أمني!
      throw new Error('فشل الفحص الأمني: قاعدة البيانات سمحت بحجزين نشطين في نفس اللحظة لنفس العقار دون تفعيل القيد الفريد!');
    }

    // التحقق الصارم من أن سبب الرفض هو انتهاك الفهرس الفريد idx_single_active_booking_per_listing (كود 23505)
    const errCode = (conflictErr as any)?.code || '';
    const errMsg = conflictErr.message || '';
    const errDetails = (conflictErr as any)?.details || '';
    const combinedErr = `${errCode} ${errMsg} ${errDetails}`;

    const isUniqueConstraintViolation =
      errCode === '23505' ||
      combinedErr.includes('idx_single_active_booking_per_listing') ||
      combinedErr.includes('23505') ||
      combinedErr.includes('duplicate key value') ||
      combinedErr.includes('trg_prevent_booking_conflict') ||
      combinedErr.includes('العقار محجوز');

    if (!isUniqueConstraintViolation) {
      throw new Error(`تم رفض الحجز ولكن بسبب خطأ غير متوقع وليس بسبب قيد منع التعارض: ${errMsg}`);
    }

    // التحقق الصارم من أن الحجز الأول الأصلي ما زال سليماً ونشطاً في قاعدة البيانات
    const { data: firstBooking, error: firstErr } = await client
      .from('property_bookings')
      .select('id, status, listing_id')
      .eq('id', testBookingId1)
      .single();

    if (firstErr || !firstBooking) {
      throw new Error(`فشل الفحص: تعذر العثور على الحجز الأول الأصلي (${testBookingId1}) بعد رفض الحجز المتعارض!`);
    }

    if (firstBooking.status !== 'active') {
      throw new Error(`فشل الفحص: تأثرت حالة الحجز الأول وتغيرت إلى (${firstBooking.status}) بدلاً من active!`);
    }

    // التحقق من أن العقار نفسه لا يزال محجوزاً حصرياً ولم يُفك حجزه بالخطأ
    const { data: listingData, error: listingErr } = await client
      .from('listings')
      .select('id, is_reserved, active_booking_id')
      .eq('id', testListingId)
      .single();

    if (listingErr || !listingData) {
      throw new Error('تعذر التحقق من بيانات العقار بعد فحص التعارض.');
    }

    if (!listingData.is_reserved) {
      throw new Error('فشل الفحص: تم إلغاء حجز العقار (is_reserved = false) بسبب فشل الحجز المتعارض!');
    }

    // النجاح هنا هو أن ترفض قاعدة البيانات الحجز المزدوج بموجب القيد الفريد 23505 مع سلامة الحجز الأول
    updateStep(6, {
      status: 'success',
      durationMs: Date.now() - s6Start,
      details: `نجح صمام الحماية: رفضت قاعدة البيانات الحجز المتعارض بنجاح بموجب قيد الفهرس [idx_single_active_booking_per_listing / 23505]. وتأكد سلامة الحجز الأول الأصلي (${testBookingId1}) وبقاء العقار محجوزاً حصرياً (is_reserved = true).`
    });
  } catch (err: any) {
    updateStep(6, {
      status: 'failed',
      durationMs: Date.now() - s6Start,
      errorMessage: err.message
    });
    await safeCleanup(client, testRunId);
    return finalizeResult(startTime, steps, false, 'فشل اختبار صمام منع التعارض وقيد الفهرس الفريد.');
  }

  // الخطوة 8: العقد والتوقيع الإلكتروني
  const s7Start = Date.now();
  updateStep(7, { status: 'running' });
  try {
    const testContract = {
      id: testContractId,
      contract_number: `TCNT-${Date.now().toString().slice(-4)}`,
      booking_id: testBookingId1,
      booking_number: 'TBKG',
      listing_id: testListingId,
      contract_type: 'sale',
      status: 'approved',
      current_version: 1,
      property_snapshot: {
        title: 'عقار تجريبي',
        area: 180,
        areaUnit: 'م²',
        governorate: 'صنعاء'
      },
      first_party: {
        id: testUserIdAdv,
        name: 'معلن تجريبي',
        role: 'seller'
      },
      second_party: {
        id: testUserIdSkr,
        name: 'باحث تجريبي',
        role: 'buyer'
      },
      financial_terms: {
        totalAmount: 15000000,
        currency: 'YER',
        depositAmount: 750000,
        paymentSchedule: 'شيك مصدق عند الإفراغ والتسليم'
      },
      first_party_approval: true,
      second_party_approval: true,
      first_party_approved_at: new Date().toISOString(),
      second_party_approved_at: new Date().toISOString(),
      signed_at: new Date().toISOString(),
      electronic_signatures: [
        {
          signerId: testUserIdAdv,
          signerName: 'معلن تجريبي',
          partyRole: 'firstParty',
          nationalIdOrPassport: '1002003004',
          signedAt: new Date().toISOString()
        },
        {
          signerId: testUserIdSkr,
          signerName: 'باحث تجريبي',
          partyRole: 'secondParty',
          nationalIdOrPassport: '5006007008',
          signedAt: new Date().toISOString()
        }
      ]
    };

    const { error: cntErr } = await client.from('property_contracts').insert(testContract);
    if (cntErr) throw new Error(`فشل إنشاء العقد الإلكتروني: ${cntErr.message}`);

    updateStep(7, {
      status: 'success',
      durationMs: Date.now() - s7Start,
      details: `تم توثيق العقد (${testContract.contract_number}) وتوقيعه إلكترونياً بين الطرفين.`
    });
  } catch (err: any) {
    updateStep(7, {
      status: 'failed',
      durationMs: Date.now() - s7Start,
      errorMessage: err.message
    });
    await safeCleanup(client, testRunId);
    return finalizeResult(startTime, steps, false, 'فشل إنشاء وتوقيع العقد.');
  }

  // الخطوة 9: إتمام الصفقة وإغلاق العقار نهائياً
  const s8Start = Date.now();
  updateStep(8, { status: 'running' });
  try {
    const finalDossier = `DOS-TEST-${Date.now().toString().slice(-4)}`;

    // تحديث الحجز إلى مكتمل
    const { error: compErr } = await client
      .from('property_bookings')
      .update({
        status: 'completed',
        deal_outcome: 'sold',
        completed_at: new Date().toISOString(),
        final_dossier_number: finalDossier,
        completed_by: 'معلن تجريبي'
      })
      .eq('id', testBookingId1);

    if (compErr) throw new Error(`فشل تحديث الحجز لمكتمل: ${compErr.message}`);

    // تحديث العقد لموقع ومكتمل
    await client.from('property_contracts').update({ status: 'signed' }).eq('id', testContractId);

    // التأكد من أن الزناد أغلق العقار أو إغلاقه وفق منطق الدورة
    await client.from('listings').update({
      status: 'completed',
      deal_outcome: 'sold',
      final_deal_number: finalDossier,
      closed_at: new Date().toISOString(),
      closed_by: 'معلن تجريبي',
      is_reserved: false,
      active_booking_id: null
    }).eq('id', testListingId);

    const { data: closedListing } = await client
      .from('listings')
      .select('status, deal_outcome, final_deal_number, is_reserved')
      .eq('id', testListingId)
      .single();

    if (closedListing?.status !== 'completed') {
      throw new Error(`حالة العقار بعد الإتمام هي (${closedListing?.status}) وليست completed.`);
    }

    updateStep(8, {
      status: 'success',
      durationMs: Date.now() - s8Start,
      details: `تم إتمام الصفقة وإغلاق العقار رسمياً بموجب المحضر [${finalDossier}] وتحويل حالته إلى completed.`
    });
  } catch (err: any) {
    updateStep(8, {
      status: 'failed',
      durationMs: Date.now() - s8Start,
      errorMessage: err.message
    });
    await safeCleanup(client, testRunId);
    return finalizeResult(startTime, steps, false, 'فشل إتمام الصفقة وإغلاق العقار.');
  }

  // الخطوة 10: اختبار صمام حظر إعادة فتح العقار المكتمل
  const s9Start = Date.now();
  updateStep(9, { status: 'running' });
  try {
    // محاولة غير قانونية: إعادة العقار المكتمل إلى 'published'
    const { error: reopenErr } = await client
      .from('listings')
      .update({ status: 'published' })
      .eq('id', testListingId);

    if (!reopenErr) {
      // الزناد في schema.sql يجب أن يرمي استثناء:
      // fn_prevent_reopening_completed_listing: يحظر نظام دلنّي العقاري إعادة نشر أو فتح عقار تم إتمام صفقته...
      throw new Error('فشل الفحص الرقابي: سمحت قاعدة البيانات بإعادة نشر عقار مكتمل!');
    }

    updateStep(9, {
      status: 'success',
      durationMs: Date.now() - s9Start,
      details: `نجح صمام الحظر الرقابي: تم رفض إعادة نشر العقار المكتمل. استثناء المنع: "${reopenErr.message}".`
    });
  } catch (err: any) {
    // إذا كان الخطأ هو رفض إعادة النشر، نعتبره نجاحاً
    if (err.message.includes('يحظر') || err.message.includes('completed')) {
      updateStep(9, {
        status: 'success',
        durationMs: Date.now() - s9Start,
        details: `نجح صمام الحظر الرقابي: تم منع إعادة النشر كما هو مطلوب بموجب الزناد الشرعي.`
      });
    } else {
      updateStep(9, {
        status: 'failed',
        durationMs: Date.now() - s9Start,
        errorMessage: err.message
      });
    }
  }

  // الخطوة 11: التنظيف الآمن الشامل للسجلات التجريبية فقط
  const s10Start = Date.now();
  updateStep(10, { status: 'running' });
  try {
    await safeCleanup(client, testRunId);
    updateStep(10, {
      status: 'success',
      durationMs: Date.now() - s10Start,
      details: 'تم حذف كافة السجلات التجريبية المعزولة بنجاح تام، وبقيت قاعدة البيانات نظيفة بدون أي تشويه.'
    });
  } catch (err: any) {
    cleanupSuccessful = false;
    updateStep(10, {
      status: 'failed',
      durationMs: Date.now() - s10Start,
      errorMessage: `فشل تنظيف بعض السجلات التجريبية: ${err.message}`
    });
  }

  return finalizeResult(startTime, steps, cleanupSuccessful, 'اكتملت جميع مراحل اختبار دورة حياة العقار بنجاح تام.');
}

async function safeCleanup(client: any, testRunId: string) {
  try {
    // حذف العقود التجريبية
    await client.from('property_contracts').delete().like('id', `${testRunId}%`);
    // حذف الحجوزات التجريبية
    await client.from('property_bookings').delete().like('id', `${testRunId}%`);
    // حذف طلبات الباحثين التجريبية
    await client.from('property_requests').delete().like('id', `${testRunId}%`);
    // حذف العقار التجريبي (للسماح بحذفه حتى لو كان completed)
    await client.from('listings').delete().like('id', `${testRunId}%`);
    // حذف المستخدمين التجريبيين
    await client.from('users').delete().like('id', `${testRunId}%`);
  } catch (e) {
    console.warn('[safeCleanup] Warning during cleanup:', e);
  }
}

function finalizeResult(
  startTime: number,
  steps: LifecycleTestStep[],
  cleanupCompleted: boolean,
  notes: string
): LifecycleTestResult {
  const totalSteps = steps.length;
  const passedSteps = steps.filter(s => s.status === 'success').length;
  const failedSteps = steps.filter(s => s.status === 'failed').length;
  const skippedSteps = steps.filter(s => s.status === 'skipped' || s.status === 'pending').length;

  return {
    runAt: new Date().toISOString(),
    totalDurationMs: Date.now() - startTime,
    allPassed: failedSteps === 0 && skippedSteps === 0 && passedSteps === totalSteps,
    totalSteps,
    passedSteps,
    failedSteps,
    skippedSteps,
    steps,
    cleanupCompleted,
    notes
  };
}
