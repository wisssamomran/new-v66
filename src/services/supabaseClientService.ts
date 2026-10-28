import { getSupabaseClient, getSupabaseConfig } from '../lib/supabase';

export type SupabaseConnectionStatus =
  | 'success'
  | 'config_missing'
  | 'config_invalid_url'
  | 'permission_denied'
  | 'table_not_found'
  | 'network_error'
  | 'unknown_error';

export interface SupabaseTestResult {
  status: SupabaseConnectionStatus;
  success: boolean;
  message: string;
  details?: string;
  latencyMs?: number;
  url: string;
  hasAnonKey: boolean;
  configSource: 'env' | 'custom' | 'none';
  testedTable: string;
  recordCountSample?: number;
  dataSnippet?: any;
  errorCode?: string;
}

/**
 * Tests real live connection to Supabase by performing a minimal read query
 * against the "listings" table (`select('id').limit(1)`).
 *
 * Categorizes response into:
 * - success: query succeeded, table exists, client can read.
 * - config_missing: URL or Anon Key is missing.
 * - config_invalid_url: URL is malformed.
 * - permission_denied: Supabase / PostgREST returned 401/403 or JWT/RLS error.
 * - table_not_found: table "listings" does not exist (e.g. 42P01 or PGRST204/PGRST200).
 * - network_error: network unreachable, DNS failure, or CORS blocked.
 * - unknown_error: unexpected error code.
 */
export async function testSupabaseConnection(customConfig?: {
  url?: string;
  anonKey?: string;
}): Promise<SupabaseTestResult> {
  const currentConfig = getSupabaseConfig();
  const testUrl = (customConfig?.url ?? currentConfig.url)?.trim();
  const testAnonKey = (customConfig?.anonKey ?? currentConfig.anonKey)?.trim();
  const source = customConfig?.url ? 'custom' : currentConfig.source;

  if (!testUrl || !testAnonKey) {
    return {
      status: 'config_missing',
      success: false,
      message: 'بيانات الاتصال بـ Supabase غير مكتملة (يرجى إدخال Project URL و Anon Key)',
      details: !testUrl && !testAnonKey
        ? 'كل من عنوان المشروع (URL) والمفتاح العام (Anon Key) مفقودان.'
        : !testUrl
        ? 'عنوان المشروع (VITE_SUPABASE_URL) مفقود.'
        : 'المفتاح العام (VITE_SUPABASE_ANON_KEY) مفقود.',
      url: testUrl || '',
      hasAnonKey: Boolean(testAnonKey),
      configSource: source,
      testedTable: 'listings',
    };
  }

  // Validate URL format
  try {
    const parsed = new URL(testUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Invalid protocol');
    }
  } catch {
    return {
      status: 'config_invalid_url',
      success: false,
      message: 'صيغة عنوان مشروع Supabase غير صحيحة (يجب أن تبدأ بـ https://)',
      details: `القيمة المدخلة "${testUrl}" ليست رابط URL صالحًا.`,
      url: testUrl,
      hasAnonKey: Boolean(testAnonKey),
      configSource: source,
      testedTable: 'listings',
    };
  }

  const client = getSupabaseClient(testUrl, testAnonKey);
  if (!client) {
    return {
      status: 'config_missing',
      success: false,
      message: 'تعذر تهيئة عميل Supabase بالبيانات المدخلة',
      url: testUrl,
      hasAnonKey: Boolean(testAnonKey),
      configSource: source,
      testedTable: 'listings',
    };
  }

  const startTime = performance.now();

  try {
    // Perform a minimal, bounded read query on "listings"
    const { data, error, status, statusText } = await client
      .from('listings')
      .select('id')
      .limit(1);

    const latencyMs = Math.round(performance.now() - startTime);

    if (error) {
      const code = error.code || `${status}`;
      const errorMessage = error.message || statusText || 'PostgREST error';
      const errorDetails = error.details || error.hint || '';

      // Check if table not found (42P01 in Postgres or PGRST204 / PGRST200 in PostgREST)
      if (
        code === '42P01' ||
        code === 'PGRST204' ||
        code === 'PGRST205' ||
        status === 404 ||
        errorMessage.toLowerCase().includes('does not exist') ||
        errorMessage.toLowerCase().includes('relation') ||
        errorMessage.toLowerCase().includes('could not find the')
      ) {
        return {
          status: 'table_not_found',
          success: false,
          message: 'الاتصال نجح بـ Supabase لكن جدول "listings" غير موجود في قاعدة البيانات',
          details: `رمز الخطأ: ${code}. تفاصيل: ${errorMessage}. يُرجى تنفيذ ملف "database/supabase/schema.sql" داخل SQL Editor في Supabase لإنشاء الجداول.`,
          latencyMs,
          url: testUrl,
          hasAnonKey: true,
          configSource: source,
          testedTable: 'listings',
          errorCode: code,
        };
      }

      // Check if permission denied / RLS / invalid API key
      if (
        status === 401 ||
        status === 403 ||
        code === '42501' ||
        code === 'PGRST301' ||
        errorMessage.toLowerCase().includes('jwt') ||
        errorMessage.toLowerCase().includes('api key') ||
        errorMessage.toLowerCase().includes('permission') ||
        errorMessage.toLowerCase().includes('unauthorized')
      ) {
        return {
          status: 'permission_denied',
          success: false,
          message: 'فشل التحقق من الصلاحيات أو المفتاح العام (Anon Key)',
          details: `رمز الخطأ: ${code} (${status}). تفاصيل: ${errorMessage} ${errorDetails}. تأكد من صحة Anon Key ومن سياسات الوصول (RLS) للجدول.`,
          latencyMs,
          url: testUrl,
          hasAnonKey: true,
          configSource: source,
          testedTable: 'listings',
          errorCode: code,
        };
      }

      // Other PostgREST error
      return {
        status: 'unknown_error',
        success: false,
        message: `استجابت Supabase برمز خطأ (${code})`,
        details: `${errorMessage} ${errorDetails}`,
        latencyMs,
        url: testUrl,
        hasAnonKey: true,
        configSource: source,
        testedTable: 'listings',
        errorCode: code,
      };
    }

    // Success! Table exists and is readable
    return {
      status: 'success',
      success: true,
      message: 'تم الاتصال بنجاح بقاعدة بيانات Supabase وقراءة جدول "listings"',
      details: `تم تنفيذ الاستعلام بنجاح في ${latencyMs} ملي ثانية. عدد السجلات المعادة كعينة: ${Array.isArray(data) ? data.length : 0}.`,
      latencyMs,
      url: testUrl,
      hasAnonKey: true,
      configSource: source,
      testedTable: 'listings',
      recordCountSample: Array.isArray(data) ? data.length : 0,
      dataSnippet: data,
    };
  } catch (err: any) {
    const latencyMs = Math.round(performance.now() - startTime);
    const errString = String(err?.message || err);

    if (
      errString.toLowerCase().includes('failed to fetch') ||
      errString.toLowerCase().includes('networkerror') ||
      errString.toLowerCase().includes('abort') ||
      errString.toLowerCase().includes('cors')
    ) {
      return {
        status: 'network_error',
        success: false,
        message: 'تعذر الوصول إلى خادم Supabase (خطأ شبكة أو تعذر الاتصال بالرابط)',
        details: `تأكد من الاتصال بالإنترنت وصحة رابط المشروع URL وإمكانية الوصول إليه. الخطأ: ${errString}`,
        latencyMs,
        url: testUrl,
        hasAnonKey: true,
        configSource: source,
        testedTable: 'listings',
      };
    }

    return {
      status: 'unknown_error',
      success: false,
      message: 'حدث خطأ غير متوقع أثناء فحص الاتصال',
      details: errString,
      latencyMs,
      url: testUrl,
      hasAnonKey: true,
      configSource: source,
      testedTable: 'listings',
    };
  }
}
