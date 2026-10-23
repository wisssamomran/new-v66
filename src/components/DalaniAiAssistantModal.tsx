import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  Sparkles,
  Send,
  X,
  RotateCcw,
  Compass,
  ArrowRight,
  ChevronLeft,
  Bot,
  User as UserIcon,
  HelpCircle,
  ExternalLink,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';

interface DalaniAiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentView: string;
  onNavigate: (view: string, params?: any) => void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  modelUsed?: string;
  navigationSuggestions?: Array<{ view: string; title: string }>;
}

export const DalaniAiAssistantModal: React.FC<DalaniAiAssistantModalProps> = ({
  isOpen,
  onClose,
  currentView,
  onNavigate
}) => {
  const { currentUser, showToast } = useApp();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [quickPrompts, setQuickPrompts] = useState<string[]>([]);
  const [contextBadge, setContextBadge] = useState<string>('');
  const [roleTitle, setRoleTitle] = useState<string>('');
  const [isInitialized, setIsInitialized] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  }, [isOpen, messages]);

  // Load greeting and role context upon opening or role switch
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    async function fetchGreeting() {
      try {
        const res = await fetch('/api/ai/greet', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-role': currentUser.role,
            'x-user-id': currentUser.id,
            'x-user-name': encodeURIComponent(currentUser.name)
          },
          body: JSON.stringify({ currentView })
        });

        if (!res.ok) throw new Error('Greet API failed');
        const data = await res.json();

        if (isMounted && data.success && data.greeting) {
          setRoleTitle(data.greeting.roleTitle || '');
          setContextBadge(data.greeting.contextBadge || '');
          setQuickPrompts(data.greeting.quickPrompts || []);

          // Only set initial greeting if messages are empty or after role switch
          if (messages.length === 0 || !isInitialized) {
            setMessages([
              {
                id: `msg-welcome-${Date.now()}`,
                role: 'assistant',
                content: data.greeting.greetingMessage,
                timestamp: new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })
              }
            ]);
            setIsInitialized(true);
          }
        }
      } catch (err) {
        console.error('Greeting fetch error:', err);
        if (messages.length === 0 && isMounted) {
          setMessages([
            {
              id: `msg-fallback-${Date.now()}`,
              role: 'assistant',
              content: `أهلاً بك يا **${currentUser.name}** في منصة دلنّي العقارية 🇾🇪!\nأنا مساعدك الذكي ومستعد لمساعدتك في أي استفسار أو حل أي مشكلة وتوجيهك لأي قسم بالمنصة وفق صلاحياتك.`,
              timestamp: new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })
            }
          ]);
        }
      }
    }

    fetchGreeting();

    return () => {
      isMounted = false;
    };
  }, [isOpen, currentUser.role, currentUser.id, currentView]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isLoading) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const historyPayload = messages.slice(-6).map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        text: m.content
      }));

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentUser.role,
          'x-user-id': currentUser.id,
          'x-user-name': encodeURIComponent(currentUser.name)
        },
        body: JSON.stringify({
          message: text,
          history: historyPayload,
          currentView
        })
      });

      if (!res.ok) {
        throw new Error('فشل الرد من خادم الذكاء الاصطناعي');
      }

      const data = await res.json();
      const assistantMessage: Message = {
        id: `msg-ai-${Date.now()}`,
        role: 'assistant',
        content: data.response || 'عذراً، لم أتمكن من الحصول على رد محدد.',
        timestamp: new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' }),
        modelUsed: data.modelUsed,
        navigationSuggestions: data.navigationSuggestions
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error('AI chat error:', err);
      setMessages(prev => [
        ...prev,
        {
          id: `msg-err-${Date.now()}`,
          role: 'assistant',
          content: 'عذراً، حدث انقطاع مؤقت في الاتصال بنموذج الذكاء الاصطناعي. يمكنك استخدام الروابط السريعة أدناه للوصول لأي شاشة:',
          timestamp: new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' }),
          navigationSuggestions: [
            { view: 'search', title: 'البحث والخريطة' },
            { view: 'my_ads', title: 'إدارة إعلاناتي' },
            { view: 'bookings', title: 'الحجوزات والصفقات' }
          ]
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetChat = () => {
    setMessages([]);
    setIsInitialized(false);
    showToast('تمت إعادة ضبط جلسة المحادثة', 'info');
  };

  const handleNavigateFromAi = (view: string, title?: string) => {
    onNavigate(view);
    showToast(`جاري الانتقال إلى ${title || view}...`, 'info');
    // On small screens, close the chat modal so the user sees the page
    if (window.innerWidth < 768) {
      onClose();
    }
  };

  // Helper to render text with markdown and clickable [GO:view|title] buttons
  const renderFormattedContent = (content: string) => {
    // Split into segments by [GO:view|title]
    const goRegex = /\[GO:([a-z_]+)\|([^\]]+)\]/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = goRegex.exec(content)) !== null) {
      const precedingText = content.substring(lastIndex, match.index);
      if (precedingText) {
        parts.push(renderMarkdownParagraphs(precedingText, `text-${lastIndex}`));
      }

      const targetView = match[1];
      const linkTitle = match[2];

      parts.push(
        <div key={`go-${match.index}`} className="my-2.5">
          <button
            onClick={() => handleNavigateFromAi(targetView, linkTitle)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#12A889] to-[#0F2942] text-white text-xs font-bold shadow-md hover:shadow-lg hover:brightness-110 active:scale-95 transition-all duration-200 cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5 text-teal-200 animate-spin" style={{ animationDuration: '8s' }} />
            <span>{linkTitle}</span>
            <ChevronLeft className="w-3.5 h-3.5 text-teal-200" />
          </button>
        </div>
      );

      lastIndex = goRegex.lastIndex;
    }

    if (lastIndex < content.length) {
      parts.push(renderMarkdownParagraphs(content.substring(lastIndex), `text-${lastIndex}`));
    }

    return parts;
  };

  const renderMarkdownParagraphs = (raw: string, keyPrefix: string) => {
    const lines = raw.split('\n');
    return (
      <div key={keyPrefix} className="space-y-1.5">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) return <div key={idx} className="h-1" />;

          // Headers
          if (trimmed.startsWith('### ')) {
            return (
              <h4 key={idx} className="font-bold text-slate-900 text-sm mt-2 border-b border-slate-100 pb-1">
                {trimmed.replace('### ', '')}
              </h4>
            );
          }
          if (trimmed.startsWith('## ')) {
            return (
              <h3 key={idx} className="font-extrabold text-[#16324F] text-sm mt-2.5">
                {trimmed.replace('## ', '')}
              </h3>
            );
          }

          // Bullet points
          if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            const bulletText = trimmed.substring(2);
            return (
              <div key={idx} className="flex items-start gap-1.5 text-xs text-slate-700 leading-relaxed pr-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#12A889] mt-1.5 flex-shrink-0" />
                <span>{renderInlineStyles(bulletText)}</span>
              </div>
            );
          }

          // Numbered lists
          const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
          if (numMatch) {
            return (
              <div key={idx} className="flex items-start gap-2 text-xs text-slate-700 leading-relaxed pr-1">
                <span className="flex-shrink-0 w-4 h-4 rounded-full bg-teal-50 text-teal-700 font-bold text-[10px] flex items-center justify-center mt-0.5">
                  {numMatch[1]}
                </span>
                <span>{renderInlineStyles(numMatch[2])}</span>
              </div>
            );
          }

          // Horizontal rule
          if (trimmed === '---') {
            return <hr key={idx} className="my-2 border-slate-200" />;
          }

          return (
            <p key={idx} className="text-xs text-slate-700 leading-relaxed">
              {renderInlineStyles(trimmed)}
            </p>
          );
        })}
      </div>
    );
  };

  const renderInlineStyles = (text: string) => {
    // Match **bold**
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-bold text-slate-900">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed bottom-14 md:bottom-20 left-0 md:left-7 z-50 w-full md:w-[450px] max-w-full md:max-w-[calc(100vw-2rem)] h-[84vh] md:h-[670px] max-h-[calc(100vh-4.5rem)] md:max-h-[calc(100vh-6rem)] bg-white rounded-t-3xl md:rounded-3xl shadow-2xl border border-slate-200/80 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-300 backdrop-blur-xl"
      dir="rtl"
    >
      {/* 1. Header with Dalani AI Identity & User Recognition */}
      <div className="relative px-4 py-3.5 bg-gradient-to-r from-[#0F2942] via-[#16324F] to-[#12A889] text-white flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Blended Icon Avatar */}
            <div className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-inner">
              <svg
                width="22"
                height="22"
                viewBox="0 0 200 200"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M 24 162 L 24 72 L 95 14 L 140 44 C 172 70 192 100 192 130 C 192 165 166 186 112 186 C 142 180 170 156 170 128 C 170 102 152 76 128 58 L 95 34 L 44 74 L 44 156 Z"
                  fill="#FFFFFF"
                />
                <polygon points="63,90 81,78 81,146 63,146" fill="#FFFFFF" />
                <polygon points="88,64 108,78 108,136 88,136" fill="#FFFFFF" />
                <path
                  d="M 40 186 C 65 182 86 168 110 150 C 130 136 141 125 144 122 C 137 127 120 144 96 162 C 73 178 56 184 40 186Z"
                  fill="#12A889"
                />
                <circle cx="144" cy="107" r="4" fill="#12A889" />
              </svg>
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400 border border-white" />
              </span>
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-extrabold text-sm text-white tracking-wide">مساعد دلنّي الذكي</h3>
                <span className="text-[10px] bg-white/20 text-teal-200 px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5 text-teal-300" />
                  Gemini
                </span>
              </div>
              <p className="text-[11px] text-teal-100/90 truncate max-w-[210px]">
                {currentUser.name} • {roleTitle || 'زائر'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleResetChat}
              title="إعادة ضبط المحادثة"
              className="p-1.5 rounded-xl hover:bg-white/10 text-white/80 hover:text-white transition duration-200"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              title="إغلاق"
              className="p-1.5 rounded-xl hover:bg-white/10 text-white/80 hover:text-white transition duration-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Live System Context Ribbon */}
        {contextBadge && (
          <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-teal-100">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>{contextBadge}</span>
            </div>
            <span className="text-white/60">حالة النظام: 100% نشط</span>
          </div>
        )}
      </div>

      {/* 2. Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/70">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === 'user' ? 'items-start' : 'items-end'}`}
          >
            <div className="flex items-end gap-2 max-w-[92%]">
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-[#0F2942] text-teal-300 flex items-center justify-center flex-shrink-0 mb-1 shadow-sm">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`p-3.5 rounded-2xl text-sm shadow-xs ${
                  msg.role === 'user'
                    ? 'bg-[#16324F] text-white rounded-br-xs mr-auto'
                    : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-xs ml-auto shadow-sm'
                }`}
              >
                {msg.role === 'user' ? (
                  <p className="text-xs leading-relaxed text-white whitespace-pre-wrap">{msg.content}</p>
                ) : (
                  <div>{renderFormattedContent(msg.content)}</div>
                )}

                {/* Additional Navigation Buttons Suggestion block if any */}
                {msg.navigationSuggestions && msg.navigationSuggestions.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap gap-1.5">
                    {msg.navigationSuggestions.map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleNavigateFromAi(item.view, item.title)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-[#12A889] text-[11px] font-bold border border-teal-200 transition-colors"
                      >
                        <Compass className="w-3 h-3" />
                        <span>{item.title}</span>
                      </button>
                    ))}
                  </div>
                )}

                <div
                  className={`mt-1.5 text-[9px] ${
                    msg.role === 'user' ? 'text-teal-200/70 text-left' : 'text-slate-400 text-left'
                  }`}
                >
                  {msg.timestamp}
                  {msg.modelUsed && <span className="mr-2 opacity-80">• {msg.modelUsed}</span>}
                </div>
              </div>

              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-full bg-teal-600 text-white flex items-center justify-center flex-shrink-0 mb-1 shadow-sm">
                  <UserIcon className="w-4 h-4" />
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-center gap-2 text-slate-500 text-xs py-2 pr-2">
            <div className="w-7 h-7 rounded-full bg-[#0F2942] text-teal-300 flex items-center justify-center flex-shrink-0 shadow-sm">
              <Bot className="w-4 h-4 animate-bounce" />
            </div>
            <div className="bg-white border border-slate-200 px-3.5 py-2.5 rounded-2xl rounded-bl-xs flex items-center gap-2 shadow-xs">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-teal-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-teal-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-teal-500 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-[11px] font-medium text-slate-600">مساعد دلنّي يفكر ويحلل طلبك...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 3. Quick Suggested Prompts (Filtered for current role) */}
      {quickPrompts.length > 0 && !isLoading && (
        <div className="px-3.5 py-2 bg-slate-100/70 border-t border-slate-200/60 overflow-x-auto flex items-center gap-1.5 no-scrollbar flex-shrink-0">
          <span className="text-[10px] font-bold text-slate-500 flex-shrink-0 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-teal-600" />
            اقتراحات:
          </span>
          {quickPrompts.slice(0, 4).map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(prompt)}
              className="text-[11px] font-medium bg-white hover:bg-teal-50 text-slate-700 hover:text-teal-800 border border-slate-200 hover:border-teal-300 px-2.5 py-1 rounded-full whitespace-nowrap transition duration-150 shadow-2xs active:scale-95"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* 4. Input Box */}
      <div className="p-3 bg-white border-t border-slate-200/80 flex-shrink-0">
        <form
          onSubmit={e => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            placeholder={
              currentUser.role === 'visitor'
                ? 'اسأل عن البحث، الخريطة، أو كيفية التسجيل...'
                : currentUser.role === 'advertiser'
                ? 'اسأل عن إضافة عقار، إعلاناتك، أو الحجوزات...'
                : currentUser.role === 'seeker'
                ? 'اسأل عن حجز عقار، التواصل، أو المفضلة...'
                : 'اكتب استفسارك وسيقوم مساعد دلنّي بإرشادك...'
            }
            disabled={isLoading}
            className="flex-1 bg-slate-100/80 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#12A889]/30 focus:border-[#12A889] transition duration-200 disabled:opacity-50"
          />

          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="w-10 h-10 rounded-2xl bg-gradient-to-r from-[#12A889] to-[#0F2942] text-white flex items-center justify-center shadow-md hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 active:scale-95 transition-all duration-200 flex-shrink-0 cursor-pointer"
            aria-label="إرسال"
          >
            <Send className="w-4 h-4 transform -rotate-90 text-white" />
          </button>
        </form>

        <div className="flex items-center justify-between mt-2 px-1 text-[10px] text-slate-400">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            مطابق لصلاحيات حسابك ونظام الحوكمة
          </span>
          <span className="font-mono text-[9px] text-slate-400">Google Gemini AI</span>
        </div>
      </div>
    </div>
  );
};
