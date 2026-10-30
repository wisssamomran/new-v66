/**
 * منصة «دلنّي» العقارية اليمنية - Dalani Real Estate Platform
 * مهايئ الاتصال والعمليات السحابية (Supabase Service Adapter)
 * 
 * ينفذ عمليات القراءة والكتابة المباشرة مع قاعدة بيانات Supabase الحقيقية
 * عند توفر مفاتيح الاتصال، مع العزل الآمن والمعالجة الرصينة للأخطاء
 */

import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
import {
  Listing,
  PropertyRequest,
  PropertyBooking,
  PropertyContract,
  AuditLogEntry,
  User
} from '../types';
import {
  mapListingToSupabase,
  mapListingFromSupabase,
  mapRequestToSupabase,
  mapRequestFromSupabase,
  mapBookingToSupabase,
  mapBookingFromSupabase,
  mapContractToSupabase,
  mapContractFromSupabase,
  mapAuditLogToSupabase,
  mapAuditLogFromSupabase,
  mapUserToSupabase,
  mapUserFromSupabase
} from './supabaseMappers';

export class SupabaseAdapter {
  /**
   * هل إعدادات Supabase متوفرة وقابلة للاستخدام؟
   */
  static isConfigured(): boolean {
    return isSupabaseConfigured();
  }

  /**
   * التأكد من وجود سجل المستخدم في جدول users لمنع خطأ Foreign Key Constraint
   */
  static async ensureUserExists(user: User): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;

    try {
      const payload = mapUserToSupabase(user);
      const { error } = await client
        .from('users')
        .upsert(payload, { onConflict: 'id' });

      if (error) {
        console.warn('[SupabaseAdapter] ensureUserExists warning:', error.message);
        return false;
      }
      return true;
    } catch (e) {
      console.warn('[SupabaseAdapter] ensureUserExists exception:', e);
      return false;
    }
  }

  // ==========================================
  // 0. إدارة المصادقة والمستخدمين (Auth & Users)
  // ==========================================

  /**
   * تسجيل الدخول عبر Supabase Auth والربط بـ public.users
   * المسار: Supabase Auth UID -> public.users.supabase_user_id -> بيانات المستخدم الفعلية
   */
  static async signInWithSupabase(
    identifier: string,
    password?: string
  ): Promise<{ success: boolean; user?: User; error?: string }> {
    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'عميل Supabase غير متصل' };

    try {
      const cleanId = identifier.trim();
      const isEmail = cleanId.includes('@');

      // 1. إذا كان بريداً ولديه كلمة مرور، جرب المصادقة عبر Supabase Auth
      if (isEmail && password) {
        const { data: authData, error: authError } = await client.auth.signInWithPassword({
          email: cleanId.toLowerCase(),
          password: password
        });

        if (!authError && authData?.user) {
          const authUid = authData.user.id;

          // أ) استعلام مباشر عبر: supabase_user_id = auth.uid()
          const { data: profileByUid } = await client
            .from('users')
            .select('*')
            .eq('supabase_user_id', authUid)
            .maybeSingle();

          if (profileByUid) {
            return { success: true, user: mapUserFromSupabase(profileByUid) };
          }

          // ب) إذا لم يكن supabase_user_id مرتبطاً بعد، اربطه فوراً بالبريد
          const { data: profileByEmail } = await client
            .from('users')
            .select('*')
            .ilike('email', cleanId)
            .maybeSingle();

          if (profileByEmail) {
            await client
              .from('users')
              .update({ supabase_user_id: authUid, updated_at: new Date().toISOString() })
              .eq('id', profileByEmail.id);

            return {
              success: true,
              user: mapUserFromSupabase({ ...profileByEmail, supabase_user_id: authUid })
            };
          }
        }
      }

      // 2. استعلام public.users بواسطة البريد أو المعرف أو رقم الهاتف
      const { data: directProfile } = await client
        .from('users')
        .select('*')
        .or(`email.ilike.${cleanId},id.eq.${cleanId},phone.eq.${cleanId}`)
        .maybeSingle();

      if (directProfile) {
        return { success: true, user: mapUserFromSupabase(directProfile) };
      }

      return { success: false, error: 'لم يتم العثور على حساب مطابق' };
    } catch (err: any) {
      return { success: false, error: err.message || 'حدث خطأ أثناء المصادقة' };
    }
  }

  /**
   * جلب ملف المستخدم عبر Supabase Auth UID: supabase_user_id = auth.uid()
   */
  static async fetchUserProfileByAuthUid(authUid: string): Promise<{ success: boolean; user?: User; error?: string }> {
    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Supabase غير متصل' };

    try {
      const { data, error } = await client
        .from('users')
        .select('*')
        .eq('supabase_user_id', authUid)
        .maybeSingle();

      if (error) return { success: false, error: error.message };
      if (!data) return { success: false, error: 'المستخدم غير موجود' };
      return { success: true, user: mapUserFromSupabase(data) };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // ==========================================
  // 1. العقارات والإعلانات (Listings)
  // ==========================================

  static async fetchListings(): Promise<{ success: boolean; data?: Listing[]; error?: string }> {
    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Supabase غير مهيأ' };

    try {
      const { data, error } = await client
        .from('listings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) return { success: false, error: error.message };
      const listings = (data || []).map(mapListingFromSupabase);
      return { success: true, data: listings };
    } catch (err: any) {
      return { success: false, error: err.message || 'خطأ غير متوقع أثناء جلب العقارات' };
    }
  }

  static async fetchListingById(id: string): Promise<{ success: boolean; data?: Listing; error?: string }> {
    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Supabase غير مهيأ' };

    try {
      const { data, error } = await client
        .from('listings')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) return { success: false, error: error.message };
      if (!data) return { success: false, error: 'العقار غير موجود' };
      return { success: true, data: mapListingFromSupabase(data) };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  static async saveListing(listing: Listing): Promise<{ success: boolean; error?: string }> {
    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Supabase غير مهيأ' };

    try {
      const payload = mapListingToSupabase(listing);
      const { error } = await client
        .from('listings')
        .upsert(payload, { onConflict: 'id' });

      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  static async updateListing(id: string, updates: Partial<Listing>): Promise<{ success: boolean; error?: string }> {
    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Supabase غير مهيأ' };

    try {
      // جلب السجل الحالي للدمج
      const current = await this.fetchListingById(id);
      if (!current.success || !current.data) {
        return { success: false, error: current.error || 'العقار غير موجود' };
      }

      const merged: Listing = {
        ...current.data,
        ...updates,
        updatedAt: new Date().toISOString()
      };

      const payload = mapListingToSupabase(merged);
      const { error } = await client
        .from('listings')
        .update(payload)
        .eq('id', id);

      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  static async deleteListing(id: string): Promise<{ success: boolean; error?: string }> {
    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Supabase غير مهيأ' };

    try {
      const { error } = await client
        .from('listings')
        .delete()
        .eq('id', id);

      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // ==========================================
  // 2. طلبات الباحثين (Property Requests)
  // ==========================================

  static async fetchRequests(): Promise<{ success: boolean; data?: PropertyRequest[]; error?: string }> {
    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Supabase غير مهيأ' };

    try {
      const { data, error } = await client
        .from('property_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) return { success: false, error: error.message };
      return { success: true, data: (data || []).map(mapRequestFromSupabase) };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  static async saveRequest(req: PropertyRequest): Promise<{ success: boolean; error?: string }> {
    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Supabase غير مهيأ' };

    try {
      const payload = mapRequestToSupabase(req);
      const { error } = await client
        .from('property_requests')
        .upsert(payload, { onConflict: 'id' });

      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  static async updateRequest(id: string, updates: Partial<PropertyRequest>): Promise<{ success: boolean; error?: string }> {
    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Supabase غير مهيأ' };

    try {
      const { data: current, error: getErr } = await client
        .from('property_requests')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (getErr || !current) return { success: false, error: getErr?.message || 'الطلب غير موجود' };

      const merged = { ...mapRequestFromSupabase(current), ...updates };
      const payload = mapRequestToSupabase(merged);

      const { error } = await client
        .from('property_requests')
        .update(payload)
        .eq('id', id);

      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // ==========================================
  // 3. الحجوزات المؤقتة (Property Bookings)
  // ==========================================

  static async fetchBookings(): Promise<{ success: boolean; data?: PropertyBooking[]; error?: string }> {
    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Supabase غير مهيأ' };

    try {
      const { data, error } = await client
        .from('property_bookings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) return { success: false, error: error.message };
      return { success: true, data: (data || []).map(mapBookingFromSupabase) };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * ترجمة وتفسير أخطاء قاعدة البيانات وخصوصاً خطأ انتهاك الفهرس الفريد 23505 للحجوزات المتزامنة
   */
  static parseBookingError(error: any): { isConflict: boolean; message: string } {
    if (!error) return { isConflict: false, message: 'حدث خطأ غير معروف' };
    const code = error.code || '';
    const msg = error.message || '';
    const details = error.details || '';
    const combined = `${code} ${msg} ${details}`;

    const isConflict =
      code === '23505' ||
      combined.includes('idx_single_active_booking_per_listing') ||
      combined.includes('23505') ||
      combined.includes('duplicate key value') ||
      combined.includes('trg_prevent_booking_conflict') ||
      combined.includes('العقار محجوز');

    if (isConflict) {
      return {
        isConflict: true,
        message: 'تعذر تأكيد الحجز: هذا العقار محجوز حالياً بحجز مؤقت فعال لضمان الحصرية ولا يمكن إنشاء حجز آخر بالتوازي بموجب قيد المنظومة (idx_single_active_booking_per_listing).'
      };
    }

    return {
      isConflict: false,
      message: msg || 'حدث خطأ أثناء معالجة الحجز'
    };
  }

  static async saveBooking(booking: PropertyBooking): Promise<{ success: boolean; error?: string; isConflict?: boolean }> {
    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Supabase غير مهيأ' };

    try {
      const payload = mapBookingToSupabase(booking);
      const { error } = await client
        .from('property_bookings')
        .upsert(payload, { onConflict: 'id' });

      if (error) {
        const parsed = this.parseBookingError(error);
        return { success: false, error: parsed.message, isConflict: parsed.isConflict };
      }
      return { success: true };
    } catch (err: any) {
      const parsed = this.parseBookingError(err);
      return { success: false, error: parsed.message, isConflict: parsed.isConflict };
    }
  }

  static async updateBooking(id: string, updates: Partial<PropertyBooking>): Promise<{ success: boolean; error?: string; isConflict?: boolean }> {
    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Supabase غير مهيأ' };

    try {
      const { data: current, error: getErr } = await client
        .from('property_bookings')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (getErr || !current) return { success: false, error: getErr?.message || 'الحجز غير موجود' };

      const merged = { ...mapBookingFromSupabase(current), ...updates };
      const payload = mapBookingToSupabase(merged);

      const { error } = await client
        .from('property_bookings')
        .update(payload)
        .eq('id', id);

      if (error) {
        const parsed = this.parseBookingError(error);
        return { success: false, error: parsed.message, isConflict: parsed.isConflict };
      }
      return { success: true };
    } catch (err: any) {
      const parsed = this.parseBookingError(err);
      return { success: false, error: parsed.message, isConflict: parsed.isConflict };
    }
  }

  // ==========================================
  // 4. العقود والتوثيق (Property Contracts)
  // ==========================================

  static async fetchContracts(): Promise<{ success: boolean; data?: PropertyContract[]; error?: string }> {
    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Supabase غير مهيأ' };

    try {
      const { data, error } = await client
        .from('property_contracts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) return { success: false, error: error.message };
      return { success: true, data: (data || []).map(mapContractFromSupabase) };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  static async saveContract(contract: PropertyContract): Promise<{ success: boolean; error?: string }> {
    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Supabase غير مهيأ' };

    try {
      const payload = mapContractToSupabase(contract);
      const { error } = await client
        .from('property_contracts')
        .upsert(payload, { onConflict: 'id' });

      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  static async updateContract(id: string, updates: Partial<PropertyContract>): Promise<{ success: boolean; error?: string }> {
    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Supabase غير مهيأ' };

    try {
      const { data: current, error: getErr } = await client
        .from('property_contracts')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (getErr || !current) return { success: false, error: getErr?.message || 'العقد غير موجود' };

      const merged = { ...mapContractFromSupabase(current), ...updates };
      const payload = mapContractToSupabase(merged);

      const { error } = await client
        .from('property_contracts')
        .update(payload)
        .eq('id', id);

      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // ==========================================
  // 5. سجل التدقيق الرقابي (Audit Logs)
  // ==========================================

  static async logAudit(entry: AuditLogEntry): Promise<{ success: boolean; error?: string }> {
    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Supabase غير مهيأ' };

    try {
      const payload = mapAuditLogToSupabase(entry);
      const { error } = await client
        .from('audit_logs')
        .insert(payload);

      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // ==========================================
  // 6. المحادثات والرسائل الفورية (Chat Messages)
  // ==========================================

  static async fetchChatMessages(bookingId: string): Promise<{ success: boolean; data?: any[]; error?: string }> {
    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Supabase غير مهيأ' };

    try {
      const { data, error } = await client
        .from('chat_messages')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: true });

      if (error) return { success: false, error: error.message };
      return { success: true, data: data || [] };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  static async sendChatMessage(
    bookingId: string,
    senderId: string,
    senderName: string,
    senderRole: string,
    messageText: string,
    attachments: any[] = []
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Supabase غير مهيأ' };

    try {
      const payload = {
        booking_id: bookingId,
        sender_id: senderId,
        sender_name: senderName,
        sender_role: senderRole,
        message_text: messageText,
        attachments: attachments,
        is_read: false
      };

      const { data, error } = await client
        .from('chat_messages')
        .insert(payload)
        .select('*')
        .single();

      if (error) return { success: false, error: error.message };
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // ==========================================
  // 7. القائمة المفضلة للمستخدمين (User Favorites)
  // ==========================================

  static async fetchFavorites(userId: string): Promise<{ success: boolean; data?: string[]; error?: string }> {
    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Supabase غير مهيأ' };

    try {
      const { data, error } = await client
        .from('user_favorites')
        .select('listing_id')
        .eq('user_id', userId);

      if (error) return { success: false, error: error.message };
      return { success: true, data: (data || []).map(f => f.listing_id) };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  static async toggleFavoriteInDb(userId: string, listingId: string): Promise<{ success: boolean; isFavorite?: boolean; error?: string }> {
    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Supabase غير مهيأ' };

    try {
      const { data: existing } = await client
        .from('user_favorites')
        .select('id')
        .eq('user_id', userId)
        .eq('listing_id', listingId)
        .maybeSingle();

      if (existing) {
        await client.from('user_favorites').delete().eq('id', existing.id);
        return { success: true, isFavorite: false };
      } else {
        const id = `fav-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        await client.from('user_favorites').insert({ id, user_id: userId, listing_id: listingId });
        return { success: true, isFavorite: true };
      }
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // ==========================================
  // 8. التخزين السحابي والوثائق الموقعة (Supabase Storage)
  // ==========================================

  static async uploadDocumentToStorage(
    bucketName: string,
    filePath: string,
    file: Blob | File
  ): Promise<{ success: boolean; path?: string; publicUrl?: string; error?: string }> {
    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Supabase غير مهيأ' };

    try {
      const { data, error } = await client.storage
        .from(bucketName)
        .upload(filePath, file, { upsert: true });

      if (error) return { success: false, error: error.message };

      const { data: pubUrl } = client.storage.from(bucketName).getPublicUrl(filePath);
      return { success: true, path: data.path, publicUrl: pubUrl?.publicUrl };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  static async getSignedDocumentUrl(
    bucketName: string,
    filePath: string,
    expiresInSeconds: number = 3600
  ): Promise<{ success: boolean; signedUrl?: string; error?: string }> {
    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Supabase غير مهيأ' };

    try {
      const { data, error } = await client.storage
        .from(bucketName)
        .createSignedUrl(filePath, expiresInSeconds);

      if (error) return { success: false, error: error.message };
      return { success: true, signedUrl: data.signedUrl };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}

