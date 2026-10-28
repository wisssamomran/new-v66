import React, { useState, useEffect } from 'react';
import {
  X,
  Database,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  RefreshCw,
  Server,
  Key,
  ShieldAlert,
  Code2,
  FileCode,
  PlayCircle,
  ShieldCheck,
  Lock,
  ListChecks,
  Check,
  ChevronRight
} from 'lucide-react';
import {
  getSupabaseConfig,
  setRuntimeSupabaseConfig,
  clearRuntimeSupabaseConfig,
  SupabaseRuntimeConfig
} from '../lib/supabase';
import {
  testSupabaseConnection,
  SupabaseTestResult
} from '../services/supabaseClientService';
import {
  runSupabaseLifecycleTestSuite,
  LifecycleTestResult,
  LifecycleTestStep
} from '../services/supabaseLifecycleTest';

interface SupabaseConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseConnectionModal: React.FC<SupabaseConnectionModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'connection' | 'lifecycle'>('connection');
  const [config, setConfig] = useState<SupabaseRuntimeConfig>(getSupabaseConfig);
  const [inputUrl, setInputUrl] = useState<string>('');
  const [inputAnonKey, setInputAnonKey] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<SupabaseTestResult | null>(null);
  const [showConfigForm, setShowConfigForm] = useState<boolean>(false);

  // Lifecycle Test Suite State
  const [isLifecycleRunning, setIsLifecycleRunning] = useState<boolean>(false);
  const [lifecycleResult, setLifecycleResult] = useState<LifecycleTestResult | null>(null);
  const [liveSteps, setLiveSteps] = useState<LifecycleTestStep[]>([]);

  useEffect(() => {
    if (isOpen) {
      const active = getSupabaseConfig();
      setConfig(active);
      setInputUrl(active.url);
      setInputAnonKey(active.anonKey);
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRunTest = async (overrideUrl?: string, overrideKey?: string) => {
    setIsLoading(true);
    setTestResult(null);
    try {
      const urlToUse = overrideUrl ?? inputUrl;
      const keyToUse = overrideKey ?? inputAnonKey;
      const res = await testSupabaseConnection(
        urlToUse || keyToUse ? { url: urlToUse, anonKey: keyToUse } : undefined
      );
      setTestResult(res);
      setConfig(getSupabaseConfig());
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveRuntimeConfig = () => {
    setRuntimeSupabaseConfig(inputUrl, inputAnonKey);
    const updated = getSupabaseConfig();
    setConfig(updated);
    handleRunTest(inputUrl, inputAnonKey);
  };

  const handleResetToEnv = () => {
    clearRuntimeSupabaseConfig();
    const updated = getSupabaseConfig();
    setConfig(updated);
    setInputUrl(updated.url);
    setInputAnonKey(updated.anonKey);
    setTestResult(null);
  };

  const handleRunLifecycleSuite = async () => {
    setIsLifecycleRunning(true);
    setLifecycleResult(null);
    setLiveSteps([]);
    try {
      const result = await runSupabaseLifecycleTestSuite((steps) => {
        setLiveSteps([...steps]);
      });
      setLifecycleResult(result);
    } finally {
      setIsLifecycleRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden text-right animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-[#16324F] px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base md:text-lg flex items-center gap-2">
                <span>إدارة وفحص تكامل Supabase</span>
                <span className="text-[10px] bg-emerald-500/30 text-emerald-300 font-mono px-2 py-0.5 rounded-full border border-emerald-400/20">
                  ربط كامل ودورة حياة
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                منصة «دلنّي» العقارية • مهايئ قواعد البيانات واختبار دورة الحياة
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-2">
          <button
            onClick={() => setActiveTab('connection')}
            className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'connection'
                ? 'border-[#12A889] text-[#12A889]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Server className="w-4 h-4" />
            <span>فحص الاتصال والإعدادات</span>
          </button>

          <button
            onClick={() => setActiveTab('lifecycle')}
            className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'lifecycle'
                ? 'border-[#12A889] text-[#12A889]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ListChecks className="w-4 h-4" />
            <span>اختبار دورة حياة العقار (11 مرحلة E2E)</span>
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[72vh] overflow-y-auto">
          {activeTab === 'connection' ? (
            <>
              {/* Security Notice */}
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 text-xs text-amber-900">
                <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold">تنبيه أمان وخصوصية:</span>
                  <p className="text-amber-800 leading-relaxed">
                    التخزين في المتصفح (localStorage) ليس مكانًا آمنًا لحفظ الأسرار. يُسمح فقط باستخدام{' '}
                    <strong className="font-mono">Anon Key (المفتاح العام)</strong> المخصص للواجهة الأمامية، ويُحظر تمامًا إدخال أو كشف{' '}
                    <strong className="font-mono">service_role key</strong>.
                  </p>
                </div>
              </div>

              {/* Current Config Status Bar */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700 flex items-center gap-1.5">
                    <Server className="w-4 h-4 text-slate-500" />
                    <span>مصدر إعدادات الاتصال الحالية:</span>
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      config.source === 'env'
                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                        : config.source === 'custom'
                        ? 'bg-purple-100 text-purple-800 border border-purple-200'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {config.source === 'env'
                      ? 'ملف متغيرات البيئة (.env / VITE_*)'
                      : config.source === 'custom'
                      ? 'إدخال مخصص في المتصفح'
                      : 'غير مهيأ بعد'}
                  </span>
                </div>

                <div className="text-xs font-mono bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between text-slate-600 truncate">
                    <span className="text-slate-400 font-sans text-[11px]">URL:</span>
                    <span className="dir-ltr text-left font-bold text-slate-800 truncate">
                      {config.url || 'لم يتم تحديده (VITE_SUPABASE_URL)'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600 truncate">
                    <span className="text-slate-400 font-sans text-[11px]">Anon Key:</span>
                    <span className="dir-ltr text-left text-slate-800 truncate">
                      {config.anonKey ? `${config.anonKey.substring(0, 16)}...` : 'لم يتم تحديده (VITE_SUPABASE_ANON_KEY)'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => setShowConfigForm(!showConfigForm)}
                    className="text-xs text-[#12A889] hover:underline font-bold flex items-center gap-1"
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>{showConfigForm ? 'إخفاء حقول الإعدادات' : 'تعديل أو إدخال إعدادات الاتصال يدويًا'}</span>
                  </button>

                  {config.source === 'custom' && (
                    <button
                      type="button"
                      onClick={handleResetToEnv}
                      className="text-xs text-rose-600 hover:underline font-medium"
                    >
                      استعادة إعدادات البيئة
                    </button>
                  )}
                </div>
              </div>

              {/* Config Form (Collapsible) */}
              {showConfigForm && (
                <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-4 animate-in fade-in duration-150">
                  <h4 className="text-xs font-bold text-slate-800">إدخال بيانات مشروع Supabase للاختبار والربط:</h4>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      عنوان مشروع Supabase (Project URL)
                    </label>
                    <input
                      type="text"
                      placeholder="https://xyzcompany.supabase.co"
                      value={inputUrl}
                      onChange={(e) => setInputUrl(e.target.value)}
                      className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#12A889] focus:ring-1 focus:ring-[#12A889] outline-hidden dir-ltr text-left"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      المفتاح العام (anon public key)
                    </label>
                    <input
                      type="password"
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      value={inputAnonKey}
                      onChange={(e) => setInputAnonKey(e.target.value)}
                      className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#12A889] focus:ring-1 focus:ring-[#12A889] outline-hidden dir-ltr text-left"
                    />
                    <span className="block text-[10px] text-slate-500 mt-1">
                      ملاحظة: تجد هذا المفتاح في لوحة تحكم Supabase تحت: Project Settings ← API ← Project API keys (anon public).
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleSaveRuntimeConfig}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-[#16324F] hover:bg-slate-800 text-white transition-colors"
                    >
                      حفظ وتحديث الاتصال
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowConfigForm(false)}
                      className="px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              )}

              {/* Test Action Button */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleRunTest()}
                  disabled={isLoading}
                  className={`flex-1 py-3 px-5 rounded-2xl text-xs md:text-sm font-bold flex items-center justify-center gap-2 shadow-md transition-all ${
                    isLoading
                      ? 'bg-slate-300 text-slate-600 cursor-not-allowed'
                      : 'bg-[#12A889] hover:bg-[#0f8e74] text-white active:scale-98'
                  }`}
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>{isLoading ? 'جاري فحص الاتصال بالخادم والجدول...' : 'بدء فحص الاتصال بجدول listings'}</span>
                </button>
              </div>

              {/* Test Results Display */}
              {testResult && (
                <div
                  className={`rounded-2xl p-5 border space-y-3 animate-in fade-in zoom-in-95 duration-150 ${
                    testResult.status === 'success'
                      ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                      : testResult.status === 'table_not_found'
                      ? 'bg-amber-50/80 border-amber-200 text-amber-950'
                      : testResult.status === 'permission_denied'
                      ? 'bg-orange-50/80 border-orange-200 text-orange-950'
                      : testResult.status === 'config_missing' || testResult.status === 'config_invalid_url'
                      ? 'bg-blue-50/80 border-blue-200 text-blue-950'
                      : 'bg-rose-50/80 border-rose-200 text-rose-950'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {testResult.status === 'success' ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                    ) : testResult.status === 'table_not_found' ? (
                      <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                    ) : testResult.status === 'permission_denied' ? (
                      <AlertTriangle className="w-6 h-6 text-orange-600 shrink-0 mt-0.5" />
                    ) : testResult.status === 'config_missing' || testResult.status === 'config_invalid_url' ? (
                      <HelpCircle className="w-6 h-6 text-blue-600 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
                    )}

                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm">
                          {testResult.status === 'success'
                            ? 'نجاح الاتصال الفعلي بقاعدة البيانات'
                            : testResult.status === 'table_not_found'
                            ? 'الاتصال نجح بالخادم ولكن الجدول غير موجود'
                            : testResult.status === 'permission_denied'
                            ? 'خطأ في صلاحيات القراءة أو المفتاح'
                            : testResult.status === 'config_missing'
                            ? 'بيانات الاتصال غير مكتملة'
                            : testResult.status === 'config_invalid_url'
                            ? 'صيغة الرابط غير صالحة'
                            : testResult.status === 'network_error'
                            ? 'تعذر الوصول للشبكة أو خادم Supabase'
                            : 'فشل الفحص'}
                        </span>
                        {testResult.latencyMs !== undefined && (
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-black/5 font-bold">
                            {testResult.latencyMs} ms
                          </span>
                        )}
                      </div>

                      <p className="text-xs leading-relaxed font-medium">{testResult.message}</p>

                      {testResult.details && (
                        <div className="mt-2 text-[11px] bg-white/70 p-3 rounded-xl border border-black/5 font-mono text-slate-700 leading-normal">
                          {testResult.details}
                        </div>
                      )}

                      {testResult.status === 'table_not_found' && (
                        <div className="mt-2 text-xs text-amber-900 bg-amber-100/60 p-3 rounded-xl border border-amber-200/60 space-y-1.5">
                          <div className="font-bold flex items-center gap-1.5">
                            <FileCode className="w-4 h-4 text-amber-700" />
                            <span>خطوة المعالجة المطلوبة في Supabase:</span>
                          </div>
                          <p className="text-[11px] leading-relaxed">
                            قم بفتح لوحة تحكم مشروعك في Supabase ← الدخول إلى <strong>SQL Editor</strong> ← نسخ محتوى الملف الجاهز في المستودع{' '}
                            <code className="bg-amber-200/80 px-1.5 py-0.5 rounded-sm font-bold">database/supabase/schema.sql</code>{' '}
                            ثم الضغط على <strong>Run</strong> لإنشاء الجداول والزنادات.
                          </p>
                        </div>
                      )}

                      {testResult.status === 'config_missing' && (
                        <div className="mt-2 text-xs text-blue-900 bg-blue-100/60 p-3 rounded-xl border border-blue-200/60 space-y-1.5">
                          <div className="font-bold flex items-center gap-1.5">
                            <Code2 className="w-4 h-4 text-blue-700" />
                            <span>طريقة الإعداد:</span>
                          </div>
                          <p className="text-[11px] leading-relaxed">
                            يمكنك إما الضغط على &quot;تعديل أو إدخال إعدادات الاتصال يدويًا&quot; أعلاه، أو إضافة المتغيرات التالية إلى ملف{' '}
                            <code className="bg-blue-200/80 px-1 py-0.5 rounded-sm">.env</code>:
                            <br />
                            <code className="font-mono font-bold block mt-1">
                              VITE_SUPABASE_URL=https://[YOUR-PROJECT].supabase.co
                              <br />
                              VITE_SUPABASE_ANON_KEY=[YOUR-ANON-KEY]
                            </code>
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Lifecycle Test Runner Tab */
            <div className="space-y-5">
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 text-xs text-emerald-950 space-y-2">
                <div className="font-bold text-sm flex items-center gap-2 text-emerald-900">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <span>جناح اختبار دورة حياة العقار الآلي (Lifecycle End-to-End Test Suite)</span>
                </div>
                <p className="text-emerald-800 leading-relaxed text-[11px]">
                  يختبر هذا الجناح دورة حياة العقار الفعلية على Supabase بالكامل:
                  من إنشاء الإعلان، طلب الباحث، الموافقة، الحجز المؤقت الحصري، <strong>اختبار صمام منع الحجز المزدوج</strong>، التفاوض، توثيق العقد والتوقيع الإلكتروني، <strong>إتمام المعاملة وإغلاق العقار تلقائياً</strong>، وأخيراً <strong>اختبار صمام حظر إعادة فتح العقار المكتمل</strong> مع تنظيف شامل للسجلات التجريبية دون المساس بأي بيانات حقيقية.
                </p>
              </div>

              {/* Start Test Button */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleRunLifecycleSuite}
                  disabled={isLifecycleRunning}
                  className={`flex-1 py-3.5 px-6 rounded-2xl text-xs md:text-sm font-bold flex items-center justify-center gap-2 shadow-lg transition-all ${
                    isLifecycleRunning
                      ? 'bg-slate-300 text-slate-600 cursor-not-allowed'
                      : 'bg-[#16324F] hover:bg-slate-800 text-white active:scale-98'
                  }`}
                >
                  {isLifecycleRunning ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                      <span>جاري تنفيذ مراحل الدورة وفحص صمامات الأمان...</span>
                    </>
                  ) : (
                    <>
                      <PlayCircle className="w-5 h-5 text-emerald-400" />
                      <span>بدء تشغيل اختبار دورة الحياة الشاملة (11 خطوة)</span>
                    </>
                  )}
                </button>
              </div>

              {/* Summary Stats if completed */}
              {lifecycleResult && (
                <div
                  className={`rounded-2xl p-4 border flex items-center justify-between text-xs ${
                    lifecycleResult.allPassed
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : 'bg-rose-50 border-rose-300 text-rose-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {lifecycleResult.allPassed ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-rose-600" />
                    )}
                    <span className="font-bold text-sm">
                      {lifecycleResult.allPassed
                        ? 'نجحت جميع مراحل دورة حياة العقار وصمامات الأمان'
                        : 'لم تكتمل جميع خطوات الدورة بنجاح'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 font-mono text-[11px]">
                    <span className="bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold">
                      ناجح: {lifecycleResult.passedSteps}
                    </span>
                    {lifecycleResult.failedSteps > 0 && (
                      <span className="bg-rose-100 text-rose-800 px-2.5 py-0.5 rounded-full font-bold">
                        فشل: {lifecycleResult.failedSteps}
                      </span>
                    )}
                    {lifecycleResult.skippedSteps > 0 && (
                      <span className="bg-slate-200 text-slate-700 px-2.5 py-0.5 rounded-full">
                        تخطي: {lifecycleResult.skippedSteps}
                      </span>
                    )}
                    <span className="text-slate-500 font-sans">
                      ({lifecycleResult.totalDurationMs} ms)
                    </span>
                  </div>
                </div>
              )}

              {/* Steps Progress List */}
              {(liveSteps.length > 0 || (lifecycleResult?.steps && lifecycleResult.steps.length > 0)) && (
                <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 bg-white">
                  {(liveSteps.length > 0 ? liveSteps : lifecycleResult!.steps).map((step, idx) => (
                    <div
                      key={step.id}
                      className={`p-3.5 text-xs transition-colors flex items-start gap-3 ${
                        step.status === 'running'
                          ? 'bg-amber-50/50'
                          : step.status === 'success'
                          ? 'bg-emerald-50/30'
                          : step.status === 'failed'
                          ? 'bg-rose-50/50'
                          : 'bg-white'
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {step.status === 'running' ? (
                          <RefreshCw className="w-4 h-4 text-amber-500 animate-spin" />
                        ) : step.status === 'success' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : step.status === 'failed' ? (
                          <XCircle className="w-4 h-4 text-rose-600" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-slate-300 flex items-center justify-center text-[10px] text-slate-400">
                            {idx + 1}
                          </div>
                        )}
                      </div>

                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className={`font-bold ${
                            step.status === 'failed' ? 'text-rose-900' : 'text-slate-800'
                          }`}>
                            {idx + 1}. {step.title}
                          </span>
                          {step.durationMs !== undefined && (
                            <span className="text-[10px] font-mono text-slate-400">
                              {step.durationMs} ms
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500">{step.description}</p>
                        {step.details && (
                          <p className="text-[11px] text-emerald-800 bg-emerald-100/40 px-2 py-1 rounded-md font-mono mt-1">
                            {step.details}
                          </p>
                        )}
                        {step.errorMessage && (
                          <p className="text-[11px] text-rose-800 bg-rose-100/60 px-2 py-1 rounded-md font-mono mt-1">
                            خطأ: {step.errorMessage}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            منصة «دلنّي» العقارية اليمنية • نظام التحقق السحابي الشامل
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-200 transition-colors"
          >
            إغلاق النافذة
          </button>
        </div>
      </div>
    </div>
  );
};
