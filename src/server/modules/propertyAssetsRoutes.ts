/**
 * منصة «دلنّي» العقارية اليمنية - Dalani Real Estate Platform
 * خادم النظام الفرعي 2: إدارة الأصول العقارية والوثائق والتحقق (Property Assets Server Routes)
 */

import { Router, Request, Response } from 'express';
import { db } from '../db';
import { propertyAssetsRepository } from './propertyAssets/propertyAssetsRepository';
import { identityRepository } from './identity/identityRepository';
import { requireRoles, recordAuditLog } from '../rbac';
import { VerificationRequest } from '../../types';

export const propertyAssetsRouter = Router();

// 1. Get All Verification Requests
propertyAssetsRouter.get(
  '/api/verifications',
  requireRoles('verifier', 'system_admin'),
  (req: Request, res: Response) => {
    return res.json({ verifications: propertyAssetsRepository.getVerifications() });
  }
);

// 2. Submit Verification Request (Deeds, Ownership, Identity)
propertyAssetsRouter.post(
  '/api/verifications',
  requireRoles('advertiser', 'org_manager', 'system_admin'),
  (req: Request, res: Response) => {
    const { requestType, targetId, targetName, notes } = req.body;

    const newRequest: VerificationRequest = {
      id: `ver-${Date.now()}`,
      requestType,
      targetId,
      targetName,
      submittedBy: req.currentUser.name,
      submittedByPhone: req.currentUser.phone,
      status: 'under_review',
      documents: [],
      moderatorNotes: notes,
      createdAt: new Date().toISOString().split('T')[0]
    };

    propertyAssetsRepository.addVerification(newRequest);

    recordAuditLog(
      req.currentUser,
      'تقديم طلب توثيق رسمي',
      'verification',
      newRequest.id,
      'success',
      `طلب توثيق نوع [${requestType}] للهدف: ${targetName}`
    );

    return res.status(201).json({
      message: 'تم استلام طلب التوثيق وسيقوم المسؤول بمراجعته',
      verification: newRequest
    });
  }
);

// 3. Approve or Reject Verification (Grant Official Badges to Properties/Assets)
propertyAssetsRouter.patch(
  '/api/verifications/:id',
  requireRoles('verifier', 'system_admin'),
  (req: Request, res: Response) => {
    const { status, badgeType, validityNote } = req.body;
    const existing = propertyAssetsRepository.getVerificationById(req.params.id);

    if (!existing) {
      return res.status(404).json({ error: 'طلب التحقق غير موجود' });
    }

    const updated = propertyAssetsRepository.updateVerification(existing.id, {
      status,
      reviewedBy: req.currentUser.name,
      reviewedAt: new Date().toISOString().split('T')[0]
    });

    // If approved, attach verification badge to target listing or organization
    if (status === 'approved' && badgeType) {
      if (existing.requestType === 'property_deed') {
        const listing = db.getListingById(existing.targetId);
        if (listing) {
          const badge = propertyAssetsRepository.createDeedVerificationBadge(
            req.currentUser.name,
            validityNote
          );
          db.updateListing(listing.id, {
            verificationBadges: [badge, ...(listing.verificationBadges || [])]
          });
        }
      } else if (existing.requestType === 'organization') {
        const org = identityRepository.getOrganizationById(existing.targetId);
        if (org) {
          identityRepository.updateOrganization(org.id, {
            isVerified: true,
            verifiedAt: new Date().toISOString().split('T')[0]
          });
        }
      }
    }

    recordAuditLog(
      req.currentUser,
      `اتخاذ قرار بالتحقق [${status}]`,
      'verification',
      existing.id,
      'success',
      `طلب التحقق ${existing.targetName} تم تحويله إلى ${status}`
    );

    return res.json({ message: `تم تحديث الطلب إلى ${status}`, verification: updated });
  }
);

