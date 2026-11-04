/**
 * منصة «دلنّي» العقارية اليمنية - Dalani Real Estate Platform
 * النظام الفرعي 2: إدارة الأصول العقارية والوثائق والتحقق (Property Assets Repository)
 * 
 * مسؤول حصرياً عن:
 * - طلبات التحقق من الأصول العقارية وصكوك الملكية (البصائر الشرعية)
 * - أرشفة وثائق الملكية وسلاسل البصائر ومطابقتها قانونياً
 * - إدارة شارات التحقق للأصول العقارية (Verification Badges)
 */

import { VerificationRequest, VerificationBadge } from '../../../types';
import { storageManager } from '../../storage/storageManager';

export class PropertyAssetsRepository {
  private static instance: PropertyAssetsRepository;

  private constructor() {}

  public static getInstance(): PropertyAssetsRepository {
    if (!PropertyAssetsRepository.instance) {
      PropertyAssetsRepository.instance = new PropertyAssetsRepository();
    }
    return PropertyAssetsRepository.instance;
  }

  public getVerifications(): VerificationRequest[] {
    return [...storageManager.data.verifications];
  }

  /**
   * استرجاع طلب تحقق معين بواسطة المعرف
   */
  public getVerificationById(id: string): VerificationRequest | undefined {
    return storageManager.data.verifications.find((v: VerificationRequest) => v.id === id);
  }

  /**
   * تقديم طلب توثيق رسمي جديد لصك ملكية أو منظمة عقارية
   */
  public addVerification(req: VerificationRequest): VerificationRequest {
    storageManager.data.verifications.unshift(req);
    storageManager.persist();
    return req;
  }

  /**
   * تحديث حالة طلب التحقق وملاحظات المراجع
   */
  public updateVerification(id: string, updates: Partial<VerificationRequest>): VerificationRequest | undefined {
    const list = storageManager.data.verifications;
    const index = list.findIndex((v: VerificationRequest) => v.id === id);
    if (index === -1) return undefined;
    list[index] = {
      ...list[index],
      ...updates
    };
    storageManager.persist();
    return list[index];
  }

  /**
   * إنشاء شارة توثيق معتمدة لصك الملكية (البصيرة الشرعية)
   */
  public createDeedVerificationBadge(verifiedBy: string, validityNote?: string): VerificationBadge {
    return {
      type: 'deed_reviewed',
      label: 'صك ملكية مفحوص (بصيرة)',
      description: 'تم فحص أصل البصيرة وسندات الملكية ومطابقتها قانونياً عبر طاقم التحقق.',
      verifiedAt: new Date().toISOString().split('T')[0],
      verifiedBy,
      validityNote: validityNote || 'سارية ومطابقة',
      disclaimer: 'إخلاء مسؤولية: لا يعتبر هذا الفحص بديلاً عن التحري لدى الأمين الشرعي أو السجل العقاري.'
    };
  }
}

export const propertyAssetsRepository = PropertyAssetsRepository.getInstance();
