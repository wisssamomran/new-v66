import { Router, Request, Response } from 'express';
import { buildInitialGreeting, generateAiAssistantResponse } from '../aiAssistant';
import { recordAuditLog } from '../rbac';
import { getPostgresClient } from '../supabaseServer';

export const sharedRouter = Router();

// ==========================================
// SUPABASE PING / HEALTHCHECK PROXY ENDPOINT
// ==========================================
sharedRouter.post('/api/supabase/ping', async (req: Request, res: Response) => {
  const { url, anonKey } = req.body || {};
  const targetUrl = (url || process.env.VITE_SUPABASE_URL || 'https://xoqfdzemtcpxqracygnb.supabase.co')
    .replace(/\/rest\/v1\/?$/, '')
    .replace(/\/$/, '');
  const targetAnonKey = (anonKey || process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvcWZkemVtdGNweHFyYWN5Z25iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwMDk4NjIsImV4cCI6MjEwODU4NTg2Mn0.AT4x-Z5EtZyiS4MzoV7E0ty162MWKuGpRdlRk98rHl');

  const startTime = Date.now();

  // 1. Direct PostgreSQL query (sub-50ms latency)
  const pgSql = getPostgresClient();
  if (pgSql) {
    try {
      const rows = await pgSql`SELECT id FROM public.listings LIMIT 1;`;
      const latencyMs = Date.now() - startTime;
      return res.json({
        success: true,
        result: {
          status: 'success',
          success: true,
          message: 'تم الاتصال بنجاح بقاعدة بيانات Supabase وقراءة جدول "listings"',
          details: `تم تنفيذ الاستعلام بنجاح عبر محرك PostgreSQL الموثوق في ${latencyMs} ملي ثانية. عدد السجلات المعادة كعينة: ${rows.length}.`,
          latencyMs,
          url: targetUrl,
          hasAnonKey: true,
          configSource: 'env',
          testedTable: 'listings',
          recordCountSample: rows.length,
          dataSnippet: rows
        }
      });
    } catch (pgErr: any) {
      console.warn('[Supabase Ping] PostgreSQL direct query error, trying REST client fallback:', pgErr?.message);
    }
  }

  // 2. Fallback to Supabase JS Client with timeout
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const client = createClient(targetUrl, targetAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('تجاوز الاتصال المهلة المحددة (Timeout)')), 5000)
    );

    const queryPromise = client.from('listings').select('id').limit(1);
    const { data, error }: any = await Promise.race([queryPromise, timeoutPromise]);

    const latencyMs = Date.now() - startTime;

    if (error) {
      return res.json({
        success: false,
        result: {
          status: 'unknown_error',
          success: false,
          message: `استجابت Supabase برمز خطأ (${error.code || 'ERR'})`,
          details: error.message,
          latencyMs,
          url: targetUrl,
          hasAnonKey: true,
          configSource: 'env',
          testedTable: 'listings',
          errorCode: error.code
        }
      });
    }

    return res.json({
      success: true,
      result: {
        status: 'success',
        success: true,
        message: 'تم الاتصال بنجاح بقاعدة بيانات Supabase وقراءة جدول "listings"',
        details: `تم تنفيذ الاستعلام بنجاح عبر الخادم الموثوق في ${latencyMs} ملي ثانية. عدد السجلات المعادة كعينة: ${Array.isArray(data) ? data.length : 0}.`,
        latencyMs,
        url: targetUrl,
        hasAnonKey: true,
        configSource: 'env',
        testedTable: 'listings',
        recordCountSample: Array.isArray(data) ? data.length : 0,
        dataSnippet: data
      }
    });
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    return res.json({
      success: false,
      result: {
        status: 'network_error',
        success: false,
        message: 'تعذر الوصول إلى خادم Supabase REST',
        details: err.message || 'فشل الاتصال',
        latencyMs,
        url: targetUrl,
        hasAnonKey: true,
        configSource: 'env',
        testedTable: 'listings'
      }
    });
  }
});

// ==========================================
// DALANI AI ASSISTANT APIS (GEMINI POWERED)
// ==========================================

// Initial Greeting & Role-Aware Context
sharedRouter.post('/api/ai/greet', (req: Request, res: Response) => {
  try {
    const { currentView = 'home' } = req.body || {};
    const greeting = buildInitialGreeting(req.currentUser, currentView);
    return res.json({
      success: true,
      user: {
        id: req.currentUser.id,
        name: req.currentUser.name,
        role: req.currentUser.role
      },
      greeting
    });
  } catch (error: any) {
    console.error('[Dalani AI] Greet Error:', error);
    return res.status(500).json({ error: 'تعذر تهيئة مساعد الذكاء الاصطناعي' });
  }
});

// Real-Time Chat with Gemini AI
sharedRouter.post('/api/ai/chat', async (req: Request, res: Response) => {
  try {
    const { message, history = [], currentView = 'home' } = req.body || {};

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'رسالة المحادثة مطلوبة' });
    }

    const aiResult = await generateAiAssistantResponse(
      req.currentUser,
      message.trim(),
      Array.isArray(history) ? history : [],
      currentView
    );

    if (req.currentUser.role !== 'visitor') {
      recordAuditLog(
        req.currentUser,
        'محادثة مع مساعد دلنّي الذكي',
        'security',
        req.currentUser.id,
        'success',
        `استشارة الذكاء الاصطناعي في شاشة [${currentView}] باستخدام نموذج [${aiResult.modelUsed}]`
      );
    }

    return res.json({
      success: true,
      response: aiResult.text,
      modelUsed: aiResult.modelUsed,
      navigationSuggestions: aiResult.navigationSuggestions
    });
  } catch (error: any) {
    console.error('[Dalani AI] Chat Error:', error);
    return res.status(500).json({
      error: 'حدث خطأ أثناء معالجة استفسارك عبر الذكاء الاصطناعي',
      details: error?.message || String(error)
    });
  }
});
