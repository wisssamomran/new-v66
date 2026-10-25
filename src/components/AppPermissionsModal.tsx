import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Mic,
  Camera,
  Bell,
  PhoneCall,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ShieldCheck,
  X,
  Sparkles,
  ChevronLeft
} from 'lucide-react';

interface AppPermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAllHandled?: () => void;
}

export interface PermissionStatusMap {
  location: 'granted' | 'denied' | 'prompt';
  microphone: 'granted' | 'denied' | 'prompt';
  camera: 'granted' | 'denied' | 'prompt';
  notifications: 'granted' | 'denied' | 'prompt';
  phoneCall: 'granted' | 'denied' | 'prompt';
}

export const AppPermissionsModal: React.FC<AppPermissionsModalProps> = ({
  isOpen,
  onClose,
  onAllHandled
}) => {
  const [statuses, setStatuses] = useState<PermissionStatusMap>({
    location: 'prompt',
    microphone: 'prompt',
    camera: 'prompt',
    notifications: 'prompt',
    phoneCall: 'prompt'
  });

  const [loadingType, setLoadingType] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    checkExistingPermissions();
  }, [isOpen]);

  const checkExistingPermissions = async () => {
    const updated = { ...statuses };

    // Check localStorage saved statuses
    try {
      const saved = localStorage.getItem('dalani_app_permissions');
      if (saved) {
        const parsed = JSON.parse(saved);
        Object.assign(updated, parsed);
      }
    } catch (e) {
      console.warn(e);
    }

    // Check browser Notification permission if supported
    if ('Notification' in window) {
      if (Notification.permission === 'granted') updated.notifications = 'granted';
      else if (Notification.permission === 'denied') updated.notifications = 'denied';
    }

    // Check Location permission
    if ('permissions' in navigator && navigator.permissions.query) {
      try {
        const locRes = await navigator.permissions.query({ name: 'geolocation' as any });
        if (locRes.state) updated.location = locRes.state as any;
      } catch (e) {
        console.warn(e);
      }
    }

    setStatuses(updated);
  };

  const saveStatus = (key: keyof PermissionStatusMap, status: 'granted' | 'denied' | 'prompt') => {
    setStatuses(prev => {
      const next = { ...prev, [key]: status };
      localStorage.setItem('dalani_app_permissions', JSON.stringify(next));
      return next;
    });
  };

  const requestLocationPermission = async () => {
    setLoadingType('location');
    if (!('geolocation' in navigator)) {
      saveStatus('location', 'denied');
      setLoadingType(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      () => {
        saveStatus('location', 'granted');
        setLoadingType(null);
      },
      (err) => {
        console.warn('Location error/denied:', err);
        saveStatus('location', 'denied');
        setLoadingType(null);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  const requestMicrophonePermission = async () => {
    setLoadingType('microphone');
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        saveStatus('microphone', 'granted');
      } else {
        saveStatus('microphone', 'granted');
      }
    } catch (err) {
      console.warn('Microphone error/denied:', err);
      saveStatus('microphone', 'denied');
    } finally {
      setLoadingType(null);
    }
  };

  const requestCameraPermission = async () => {
    setLoadingType('camera');
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(track => track.stop());
        saveStatus('camera', 'granted');
      } else {
        saveStatus('camera', 'granted');
      }
    } catch (err) {
      console.warn('Camera error/denied:', err);
      saveStatus('camera', 'denied');
    } finally {
      setLoadingType(null);
    }
  };

  const requestNotificationsPermission = async () => {
    setLoadingType('notifications');
    try {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          saveStatus('notifications', 'granted');
        } else {
          saveStatus('notifications', 'denied');
        }
      } else {
        saveStatus('notifications', 'granted');
      }
    } catch (err) {
      console.warn('Notification error:', err);
      saveStatus('notifications', 'granted');
    } finally {
      setLoadingType(null);
    }
  };

  const requestPhoneCallPermission = () => {
    setLoadingType('phoneCall');
    setTimeout(() => {
      saveStatus('phoneCall', 'granted');
      setLoadingType(null);
    }, 300);
  };

  const requestAllPermissions = async () => {
    await requestLocationPermission();
    await requestMicrophonePermission();
    await requestCameraPermission();
    await requestNotificationsPermission();
    requestPhoneCallPermission();
    if (onAllHandled) onAllHandled();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        dir="rtl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#16324F] to-[#1a3d61] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base md:text-lg">صلاحيات وسماحات تطبيق «دلنّي»</h3>
              <p className="text-xs text-slate-300">خصص الصلاحيات لتجربة عقارية كاملة وسريعة على أندرويد</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-slate-800">
          <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200/80 flex items-start gap-3 text-xs text-amber-900">
            <Sparkles className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <strong>خصوصيتك وأمان بياناتك أولويتنا:</strong> التطبيق يطلب الصلاحيات فقط عند الحاجة لتسهيل استخدام الخريطة والصوت والكاميرا دون مشاركة معلوماتك مع أي طرف ثالث.
            </div>
          </div>

          <div className="space-y-3">
            {/* 1. Location */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900">الموقع الجغرافي (GPS)</h4>
                  <p className="text-[11px] text-slate-500 leading-tight">لتحديد موقعك على الخريطة المباشرة واستكشاف العقارات القريبة منك.</p>
                </div>
              </div>
              <button
                onClick={requestLocationPermission}
                disabled={loadingType === 'location'}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shrink-0 ${
                  statuses.location === 'granted'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : statuses.location === 'denied'
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-[#16324F] text-white hover:bg-[#1a3d61]'
                }`}
              >
                {statuses.location === 'granted' ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    مفعلة ✅
                  </>
                ) : statuses.location === 'denied' ? (
                  <>
                    <XCircle className="w-3.5 h-3.5 text-red-500" />
                    مرفوضة ❌
                  </>
                ) : (
                  <>سماح الآن</>
                )}
              </button>
            </div>

            {/* 2. Microphone */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Mic className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900">المايكروفون والتسجيل الصوتي</h4>
                  <p className="text-[11px] text-slate-500 leading-tight">لإجراء البحث الصوتي والتحادث مع مساعد دلنّي الذكي.</p>
                </div>
              </div>
              <button
                onClick={requestMicrophonePermission}
                disabled={loadingType === 'microphone'}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shrink-0 ${
                  statuses.microphone === 'granted'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : statuses.microphone === 'denied'
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-[#16324F] text-white hover:bg-[#1a3d61]'
                }`}
              >
                {statuses.microphone === 'granted' ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    مفعلة ✅
                  </>
                ) : statuses.microphone === 'denied' ? (
                  <>
                    <XCircle className="w-3.5 h-3.5 text-red-500" />
                    مرفوضة ❌
                  </>
                ) : (
                  <>سماح الآن</>
                )}
              </button>
            </div>

            {/* 3. Camera */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900">الكاميرا ومعرض الصور</h4>
                  <p className="text-[11px] text-slate-500 leading-tight">التقاط صور العقار ورفع صور الصكوك والبصائر الشرعية للتوثيق.</p>
                </div>
              </div>
              <button
                onClick={requestCameraPermission}
                disabled={loadingType === 'camera'}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shrink-0 ${
                  statuses.camera === 'granted'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : statuses.camera === 'denied'
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-[#16324F] text-white hover:bg-[#1a3d61]'
                }`}
              >
                {statuses.camera === 'granted' ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    مفعلة ✅
                  </>
                ) : statuses.camera === 'denied' ? (
                  <>
                    <XCircle className="w-3.5 h-3.5 text-red-500" />
                    مرفوضة ❌
                  </>
                ) : (
                  <>سماح الآن</>
                )}
              </button>
            </div>

            {/* 4. Notifications */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900">الإشعارات والتنبيهات الحية</h4>
                  <p className="text-[11px] text-slate-500 leading-tight">لتلقي إشعارات الحجوزات والعقود وتنبيهات العروض الحصرية.</p>
                </div>
              </div>
              <button
                onClick={requestNotificationsPermission}
                disabled={loadingType === 'notifications'}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shrink-0 ${
                  statuses.notifications === 'granted'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : statuses.notifications === 'denied'
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-[#16324F] text-white hover:bg-[#1a3d61]'
                }`}
              >
                {statuses.notifications === 'granted' ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    مفعلة ✅
                  </>
                ) : statuses.notifications === 'denied' ? (
                  <>
                    <XCircle className="w-3.5 h-3.5 text-red-500" />
                    مرفوضة ❌
                  </>
                ) : (
                  <>سماح الآن</>
                )}
              </button>
            </div>

            {/* 5. Phone Calls */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0 mt-0.5">
                  <PhoneCall className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900">الاتصال المباشر بالمعلنين</h4>
                  <p className="text-[11px] text-slate-500 leading-tight">لإجراء مكالمات مباشرة مع ملاك العقارات والوسطاء بضغطة زر.</p>
                </div>
              </div>
              <button
                onClick={requestPhoneCallPermission}
                disabled={loadingType === 'phoneCall'}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shrink-0 ${
                  statuses.phoneCall === 'granted'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-[#16324F] text-white hover:bg-[#1a3d61]'
                }`}
              >
                {statuses.phoneCall === 'granted' ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    مفعلة ✅
                  </>
                ) : (
                  <>سماح الآن</>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            onClick={requestAllPermissions}
            className="flex-1 py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" />
            تفعيل وسماح بكل الصلاحيات ✅
          </button>
          <button
            onClick={onClose}
            className="py-2.5 px-4 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-2xl font-bold text-xs sm:text-sm transition-all"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
