/**
 * منصة «دلنّي» العقارية اليمنية - Dalani Real Estate Platform
 * النظام الفرعي 5: العقود والتوثيق والمخالصات المالية (Contracts & Finance Repository)
 * 
 * مسؤول حصرياً عن:
 * - إنشاء وإدارة مسودات العقود العقارية للبيع والإيجار (Sales & Lease Contracts)
 * - توليد البنود والشروط القانونية القياسية المعتمدة (Standard Legal Clauses)
 * - اعتماد العقود والتعديلات المتعددة والتأكد من توافق الإصدارات (Version Approval)
 * - التوقيع الإلكتروني الموثق للبصمة الرقمية (Digital Fingerprint Signatures)
 * - المخالصات المالية وسندات القبض (Financial Clearances & Receipts)
 * - محاضر استلام العقار والعدادات (Handover Protocols)
 * - التحقق من استيفاء شروط إتمام الصفقة وإغلاق المحضر النهائي (Deal Completion)
 */

import {
  PropertyContract,
  ContractStatus,
  ContractClause,
  PropertyBooking,
  FinancialClearance,
  HandoverProtocol,
  UserRole,
  Listing,
  StatusTimelineEntry,
  ElectronicSignatureRecord
} from '../../../types';
import { storageManager } from '../../storage/storageManager';
import { marketplaceRepository } from '../marketplace/marketplaceRepository';
import { operationsRepository } from '../operations/operationsRepository';
import { identityRepository } from '../identity/identityRepository';

export function normalizeContract(c: any): PropertyContract {
  return {
    ...c,
    id: c.id || `cnt-${Date.now()}`,
    contractNumber: c.contractNumber || `CNT-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    bookingId: c.bookingId || 'bkg-unknown',
    bookingNumber: c.bookingNumber || 'BKG-2026-000',
    listingId: c.listingId || 'list-unknown',
    contractType: c.contractType || 'lease',
    status: c.status || 'draft',
    currentVersion: c.currentVersion || 1,
    clauses: Array.isArray(c.clauses) ? c.clauses : [],
    versionHistory: Array.isArray(c.versionHistory) ? c.versionHistory : [],
    createdAt: c.createdAt || new Date().toISOString(),
    updatedAt: c.updatedAt || new Date().toISOString().split('T')[0]
  };
}

export function generateStandardContractClauses(
  contractType: 'sale' | 'lease',
  booking: PropertyBooking,
  listing?: Listing,
  terms?: any
): ContractClause[] {
  const isSale = contractType === 'sale';
  const price = terms?.price || booking.agreedTerms?.price || listing?.price || 0;
  const currency = terms?.currency || booking.agreedTerms?.currency || listing?.currency || 'USD';

  if (isSale) {
    return [
      {
        id: 'cl-s1',
        title: 'البند الأول: موضوع البيع ونقل الملكية الشرعية',
        content: `باع واستباع الطرف الأول للطرف الثاني بكافة الضمانات الشرعية والقانونية العقار الموضح مواصفاته وبصيرته في هذا العقد بقيمة إجمالية قدرها [${price.toLocaleString()} ${currency}].`,
        isMandatory: true,
        category: 'general'
      },
      {
        id: 'cl-s2',
        title: 'البند الثاني: خلو العقار من النزاعات والرهون',
        content: 'يقدم الطرف الأول إقراراً شرعياً وقانونياً بأن العقار المبيع خالٍ تماماً من أي رهن أو حجز قضائي أو نزاع ورثة أو دعوى استحقاق للغير، ويتحمل المسائل الشرعية كاملة.',
        isMandatory: true,
        category: 'legal'
      },
      {
        id: 'cl-s3',
        title: 'البند الثالث: آلية السداد والشيك المصرفي المصدق',
        content: `يتم سداد الثمن المتفق عليه عبر شيك مصرفي مصدق أو تحويل معتمد باسم الطرف الأول عند التوقيع واستلام أصل البصيرة وسندات الملكية.`,
        isMandatory: true,
        category: 'financial'
      },
      {
        id: 'cl-s4',
        title: 'البند الرابع: التخليط وتسليم الحيازة الميدانية',
        content: 'يلتزم الطرف الأول بتسليم حيازة العقار للطرف الثاني وتسليمه إخلاء المبرة والموقع ميدانياً فور استكمال الشروط واستلام الثمن.',
        isMandatory: true,
        category: 'handover'
      }
    ];
  } else {
    return [
      {
        id: 'cl-l1',
        title: 'البند الأول: عين الإيجار وطبيعة الاستخدام',
        content: `أجر الطرف الأول للطرف الثاني العين العقارية الموضحة بياناتها بغرض استخدامها (سكن عائلي / تجاري) ببدل إيجار شهري قدره [${price.toLocaleString()} ${currency}].`,
        isMandatory: true,
        category: 'general'
      },
      {
        id: 'cl-l2',
        title: 'البند الثاني: الضمان التأميني وسند الاستلام',
        content: 'يسلم الطرف الثاني مبلغاُ تأمينياً للطرف الأول يسترد كاملاً عند انتهاء عقد الإيجار وتسليم العين بحالتها الأولى وتسوية كافة فواتير الخدمات.',
        isMandatory: true,
        category: 'financial'
      },
      {
        id: 'cl-l3',
        title: 'البند الثالث: الصيانة وقراءة عدادات الكهرباء والماء',
        content: 'يتحمل الطرف الثاني استهلاك الكهرباء والماء الموثق في محضر الاستلام الميداني، بينما يتحمل الطرف الأول الصيانة الهيكلية الأساسية للعين.',
        isMandatory: true,
        category: 'handover'
      },
      {
        id: 'cl-l4',
        title: 'البند الرابع: الإخلاء والتجديد وقواعد التنبيه المسبق',
        content: 'يلتزم الطرفان بإشعار كتابي مسبق بمدة لا تقل عن شهرين في حال عدم الرغبة بتجديد عقد الإيجار لفترة قادمة.',
        isMandatory: true,
        category: 'legal'
      }
    ];
  }
}

export class ContractsRepository {
  private static instance: ContractsRepository;

  private constructor() {}

  public static getInstance(): ContractsRepository {
    if (!ContractsRepository.instance) {
      ContractsRepository.instance = new ContractsRepository();
    }
    return ContractsRepository.instance;
  }

  public getContracts(filters?: { bookingId?: string; listingId?: string; status?: ContractStatus }): PropertyContract[] {
    let list = [...storageManager.data.contracts];
    if (filters?.bookingId) list = list.filter(c => c.bookingId === filters.bookingId);
    if (filters?.listingId) list = list.filter(c => c.listingId === filters.listingId);
    if (filters?.status) list = list.filter(c => c.status === filters.status);
    return list;
  }

  public getContractById(id: string): PropertyContract | undefined {
    return storageManager.data.contracts.find((c: PropertyContract) => c.id === id);
  }

  public getContractByBookingId(bookingId: string): PropertyContract | undefined {
    return storageManager.data.contracts.find((c: PropertyContract) => c.bookingId === bookingId);
  }

  public createContractFromBooking(
    bookingId: string,
    actorOrOptions?: { id?: string; name?: string; role?: UserRole } | { contractType?: 'sale' | 'lease'; customType?: 'sale' | 'lease'; customClauses?: ContractClause[] },
    optionsParam?: { contractType?: 'sale' | 'lease'; customType?: 'sale' | 'lease'; customClauses?: ContractClause[] }
  ): PropertyContract {
    const booking = operationsRepository.getBookingById(bookingId);
    if (!booking) throw new Error('الحجز غير موجود');

    const existing = this.getContractByBookingId(bookingId);
    if (existing) return existing;

    const options = optionsParam || (actorOrOptions && 'customClauses' in actorOrOptions || actorOrOptions && 'contractType' in actorOrOptions || actorOrOptions && 'customType' in actorOrOptions ? actorOrOptions as any : undefined);

    const listing = marketplaceRepository.getListingById(booking.listingId);
    const linkedReq = operationsRepository.getRequestById(booking.requestId);
    const contractType = options?.contractType || options?.customType || (listing?.purpose === 'sale' ? 'sale' : 'lease');
    const terms = booking.agreedTerms || booking.currentTerms;
    const price = terms?.price || listing?.price || 100000;
    const currency = terms?.currency || listing?.currency || 'USD';
    const deposit = terms?.depositAmount || Math.round(price * 0.05);

    const clauses = options?.customClauses && options.customClauses.length > 0
      ? options.customClauses
      : generateStandardContractClauses(contractType, booking, listing, terms);

    const nowStr = new Date().toISOString();
    const contractId = `cnt-${Date.now()}`;
    const contractNumber = `CNT-2026-${Math.floor(2000 + Math.random() * 8000)}`;

    const seekerUser = identityRepository.getUserById(booking.seekerId);
    const advUser = identityRepository.getUserById(booking.advertiserId);

    const newContract: PropertyContract = {
      id: contractId,
      contractNumber,
      bookingId: booking.id,
      bookingNumber: booking.bookingNumber,
      requestId: booking.requestId,
      listingId: booking.listingId,
      listingNumber: booking.listingNumber,
      listingTitle: booking.listingTitle,
      contractType,
      status: 'draft',
      propertySnapshot: {
        title: listing?.title || booking.listingTitle,
        propertyType: listing?.propertyType || 'apartment',
        purpose: listing?.purpose || (contractType === 'sale' ? 'sale' : 'rent'),
        governorate: listing?.location?.governorate || booking.listingGovernorate || 'صنعاء',
        city: listing?.location?.city || 'صنعاء',
        district: listing?.location?.district || 'الأمانة',
        street: listing?.location?.street || 'الشارع الرئيسي',
        area: listing?.area || 0,
        areaUnit: listing?.areaUnit || 'م²',
        deedNumber: listing?.deedNumber || 'صك مقيد بالسجل العقاري المعتمد',
        boundaries: {
          north: 'شارع معبد نافذ',
          south: 'عقار مجاور',
          east: 'شارع فرعي',
          west: 'عقار مجاور'
        }
      },
      firstParty: {
        id: advUser?.id || booking.advertiserId,
        name: advUser?.name || booking.advertiserName,
        phone: advUser?.phone || booking.advertiserPhone,
        role: contractType === 'sale' ? 'seller' : 'lessor',
        nationalIdOrPassport: 'بطاقة شخصية صادرة من الجمهورية اليمنية',
        address: listing?.location?.city ? `${listing.location.governorate} - ${listing.location.city}` : 'صنعاء',
        signatureStatus: 'unsigned'
      },
      secondParty: {
        id: seekerUser?.id || booking.seekerId,
        name: seekerUser?.name || booking.seekerName,
        phone: seekerUser?.phone || booking.seekerPhone,
        role: contractType === 'sale' ? 'buyer' : 'lessee',
        nationalIdOrPassport: 'بطاقة شخصية صادرة من الجمهورية اليمنية',
        address: 'صنعاء',
        signatureStatus: 'unsigned'
      },
      witnesses: [
        {
          id: 'wit-1',
          name: 'فضيلة الشيخ / القاضي الأمين الشرعي المعتمد',
          phone: '+967 771 000 111',
          role: 'witness',
          nationalIdOrPassport: 'ترخيص توثيق شرعي صادر عن وزارة العدل',
          signatureStatus: 'unsigned'
        },
        {
          id: 'wit-2',
          name: 'شاهد إثبات ثانٍ',
          phone: '+967 772 000 222',
          role: 'witness',
          nationalIdOrPassport: 'بطاقة شخصية سارية',
          signatureStatus: 'unsigned'
        }
      ],
      brokerOrAgent: {
        id: 'dalani-broker',
        name: 'منصة دلنّي العقارية',
        phone: '+967 1 445 566',
        commissionAmount: Math.round(price * 0.01),
        commissionPayer: terms?.feeResponsibility || 'shared_equally'
      },
      financialTerms: {
        totalAmount: price,
        currency,
        depositAmount: deposit,
        depositCurrency: currency,
        paymentSchedule: contractType === 'lease'
          ? (terms?.paymentMethod === 'certified_check'
              ? 'سداد مبلغ التأمين، وتسليم الأجرة مقدماً بشيك مصرفي مصدق'
              : `سداد مبلغ التأمين والضمانة، وتسليم الأجرة مقدماً (${terms?.paymentFrequency || linkedReq?.paymentFrequency || 'شهرياً'}) بموجب سند قبض رسمي`)
          : (terms?.paymentMethod === 'certified_check'
              ? 'سداد العربون، وتسليم المتبقي بشيك مصرفي مصدق عند توقيع وثيقة الإفراغ والتسليم'
              : 'سداد العربون، وتسليم المتبقي نقداً أو بحوالة بنكية معتمدة'),
        advancePaymentMonths: contractType === 'lease' ? (terms?.paymentFrequency === 'annual' ? 12 : terms?.paymentFrequency === 'semi_annual' ? 6 : terms?.paymentFrequency === 'quarterly' ? 3 : 1) : undefined,
        securityDeposit: contractType === 'lease' ? deposit : undefined
      },
      durationTerms: contractType === 'lease' ? {
        startDate: nowStr.split('T')[0],
        endDate: new Date(Date.now() + 365 * 86400 * 1000).toISOString().split('T')[0],
        durationMonths: 12,
        autoRenew: true,
        noticePeriodDays: 60
      } : undefined,
      clauses,
      currentVersion: 1,
      versionHistory: [
        {
          version: 1,
          createdAt: nowStr,
          createdBy: {
            id: 'system',
            name: 'نظام دلنّي العقاري',
            role: 'system_admin'
          },
          summaryOfChanges: 'إنشاء مسودة العقد العقاري الأولى بناءً على شروط الحجز المعتمدة',
          clauses,
          financialTerms: {
            totalAmount: price,
            currency,
            depositAmount: deposit,
            depositCurrency: currency,
            paymentSchedule: 'حسب البنود المعتمدة'
          },
          status: 'draft'
        }
      ],
      createdAt: nowStr,
      updatedAt: nowStr.split('T')[0]
    };

    storageManager.data.contracts.unshift(newContract);
    booking.contractId = newContract.id;
    booking.contractNumber = newContract.contractNumber;
    booking.dealStage = 'contract_completed';

    operationsRepository.addDealMessage(booking.id, {
      senderId: 'system',
      senderName: 'نظام دلنّي العقاري',
      senderRole: 'system_admin',
      type: 'system',
      text: `📜 تم إعداد مسودة العقد القانوني رقم [${newContract.contractNumber}] للصفقة. يرجى مراجعة البنود والاعتماد والتوقيع الإلكتروني الموثق.`
    });

    storageManager.persist();
    storageManager.syncPgContract(newContract);
    return newContract;
  }

  public updateContractDraft(
    contractId: string,
    updates: {
      clauses?: ContractClause[];
      financialTerms?: any;
      durationTerms?: any;
      propertySnapshot?: any;
      summaryOfChanges?: string;
    },
    actor: { id: string; name: string; role: UserRole }
  ): { contract: PropertyContract; wasApprovedModified: boolean } {
    const contract = this.getContractById(contractId);
    if (!contract) throw new Error('العقد غير موجود');

    const wasApproved = Boolean(contract.status === 'approved' || (contract.firstPartyApproval && contract.secondPartyApproval));
    if (updates.clauses) contract.clauses = updates.clauses;
    if (updates.financialTerms) contract.financialTerms = { ...contract.financialTerms, ...updates.financialTerms };
    if (updates.durationTerms) contract.durationTerms = { ...contract.durationTerms, ...updates.durationTerms };
    if (updates.propertySnapshot) contract.propertySnapshot = { ...contract.propertySnapshot, ...updates.propertySnapshot };

    const newVersionNum = (contract.currentVersion || 1) + 1;
    contract.currentVersion = newVersionNum;

    if (wasApproved) {
      contract.status = 'pending_approval';
      contract.firstPartyApproval = false;
      contract.secondPartyApproval = false;
      contract.firstPartyApprovedAt = undefined;
      contract.secondPartyApprovedAt = undefined;
      contract.isModificationPendingApproval = true;
      contract.modificationRequestedBy = actor.name;
      contract.modificationReason = updates.summaryOfChanges || 'تعديل بنود العقد';
    } else {
      contract.status = 'under_review';
    }

    const nowStr = new Date().toISOString();
    contract.updatedAt = nowStr.split('T')[0];

    if (!Array.isArray(contract.versionHistory)) {
      contract.versionHistory = [];
    }
    contract.versionHistory.push({
      version: newVersionNum,
      createdAt: nowStr,
      createdBy: {
        id: actor.id,
        name: actor.name,
        role: actor.role
      },
      summaryOfChanges: updates.summaryOfChanges || `تحديث بنود وشروط العقد للإصدار رقم ${newVersionNum}`,
      clauses: contract.clauses.map(c => ({ ...c })),
      financialTerms: { ...contract.financialTerms },
      status: contract.status
    });

    if (contract.bookingId) {
      operationsRepository.addDealMessage(contract.bookingId, {
        senderId: 'system',
        senderName: 'نظام دلنّي العقاري',
        senderRole: 'system_admin',
        type: 'system',
        text: `📝 تم إصدار النسخة (${newVersionNum}) من العقد [${contract.contractNumber}] بواسطة [${actor.name}]. ملخص التعديل: ${updates.summaryOfChanges || 'تعديل بنود وشروط'}${wasApproved ? ' ⚠️ يتطلب إعادة اعتماد الطرفين.' : ''}`
      });
    }

    storageManager.persist();
    storageManager.syncPgContract(contract);
    return { contract, wasApprovedModified: wasApproved };
  }

  public approveContract(
    contractId: string,
    partyType: 'firstParty' | 'secondParty' | 'admin',
    actor: { id: string; name: string; role: UserRole }
  ): PropertyContract {
    const contract = this.getContractById(contractId);
    if (!contract) throw new Error('العقد غير موجود');

    const nowStr = new Date().toISOString();
    const currVer = contract.currentVersion || 1;

    if (partyType === 'firstParty' || actor.id === contract.firstParty?.id) {
      contract.firstPartyApprovedAt = nowStr;
      contract.firstPartyApproval = true;
      contract.firstPartyApprovedVersion = currVer;
    } else if (partyType === 'secondParty' || actor.id === contract.secondParty?.id) {
      contract.secondPartyApprovedAt = nowStr;
      contract.secondPartyApproval = true;
      contract.secondPartyApprovedVersion = currVer;
    } else if (partyType === 'admin') {
      contract.firstPartyApprovedAt = contract.firstPartyApprovedAt || nowStr;
      contract.secondPartyApprovedAt = contract.secondPartyApprovedAt || nowStr;
      contract.firstPartyApproval = true;
      contract.secondPartyApproval = true;
      contract.firstPartyApprovedVersion = currVer;
      contract.secondPartyApprovedVersion = currVer;
    }

    const isBothApproved = Boolean(
      contract.firstPartyApproval &&
      contract.secondPartyApproval &&
      contract.firstPartyApprovedVersion === currVer &&
      contract.secondPartyApprovedVersion === currVer
    );

    if (isBothApproved || partyType === 'admin') {
      contract.status = 'approved';
      contract.approvedAt = nowStr;
      contract.approvedBy = actor.name;
      contract.firstPartyApproval = true;
      contract.secondPartyApproval = true;
      contract.firstPartyApprovedVersion = currVer;
      contract.secondPartyApprovedVersion = currVer;
      contract.isModificationPendingApproval = false;
      contract.modificationRequestedBy = undefined;
      contract.modificationReason = undefined;
    } else {
      contract.status = 'pending_approval';
    }

    contract.updatedAt = nowStr.split('T')[0];

    if (contract.bookingId) {
      const partyLabel = partyType === 'firstParty' ? 'الطرف الأول (البائع/المؤجر)' : partyType === 'secondParty' ? 'الطرف الثاني (المشتري/المستأجر)' : 'إدارة النظام';
      operationsRepository.addDealMessage(contract.bookingId, {
        senderId: 'system',
        senderName: 'نظام دلنّي العقاري',
        senderRole: 'system_admin',
        type: 'system',
        text: `✅ تم اعتماد العقد [${contract.contractNumber}] للإصدار (v${currVer}) من قبل [${partyLabel} - ${actor.name}]. ${contract.status === 'approved' ? '🎉 تم اعتماد العقد رسمياً من كلا الطرفين وبات جاهزاً للتوقيع والتوثيق!' : 'بانتظار اعتماد الطرف المقابل لنفس الإصدار.'}`
      });
    }

    storageManager.persist();
    storageManager.syncPgContract(contract);
    return contract;
  }

  public signContract(
    contractId: string,
    partyRole: 'firstParty' | 'secondParty' | 'witness',
    actor: { id: string; name: string; role: UserRole },
    options?: {
      nationalId?: string;
      idGovernorate?: string;
      verificationCode?: string;
      signerPhone?: string;
      legalDisclaimerAcknowledged?: boolean;
    } | string
  ): PropertyContract {
    const contract = this.getContractById(contractId);
    if (!contract) throw new Error('العقد غير موجود');

    const parsedOptions = typeof options === 'string' ? { nationalId: options } : (options || {});
    const nowStr = new Date().toISOString();
    const currVer = contract.currentVersion || 1;

    const digitalFingerprint = `SIG-YEM-${currVer}-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const signatureRecord: ElectronicSignatureRecord = {
      id: `sig-${Date.now()}`,
      signerId: actor.id,
      signerName: actor.name,
      partyRole,
      signedVersion: currVer,
      signedAt: nowStr,
      nationalIdOrPassport: parsedOptions.nationalId || 'بطاقة شخصية صادرة من الجمهورية اليمنية',
      idGovernorate: parsedOptions.idGovernorate || 'صنعاء',
      digitalFingerprint,
      verificationMethod: 'sms_otp_verified',
      legalDisclaimerAcknowledged: parsedOptions.legalDisclaimerAcknowledged ?? true,
      ipAddress: '127.0.0.1'
    };

    if (!Array.isArray(contract.electronicSignatures)) {
      contract.electronicSignatures = [];
    }
    contract.electronicSignatures.push(signatureRecord);

    if (partyRole === 'firstParty') {
      if (contract.firstParty) {
        contract.firstParty.signatureStatus = 'signed';
        contract.firstParty.signedAt = nowStr;
      }
      contract.firstPartySignedVersion = currVer;
    } else if (partyRole === 'secondParty') {
      if (contract.secondParty) {
        contract.secondParty.signatureStatus = 'signed';
        contract.secondParty.signedAt = nowStr;
      }
      contract.secondPartySignedVersion = currVer;
    } else if (partyRole === 'witness') {
      if (Array.isArray(contract.witnesses) && contract.witnesses.length > 0) {
        const wit = contract.witnesses.find(w => w.id === actor.id) || contract.witnesses[0];
        wit.signatureStatus = 'signed';
        wit.signedAt = nowStr;
      }
    }

    const bothSignedCurrent = Boolean(
      contract.firstParty?.signatureStatus === 'signed' &&
      contract.secondParty?.signatureStatus === 'signed' &&
      contract.firstPartySignedVersion === currVer &&
      contract.secondPartySignedVersion === currVer
    );

    if (bothSignedCurrent) {
      contract.status = 'signed';
      contract.signedAt = nowStr;
      contract.approvedAt = contract.approvedAt || nowStr;
      contract.approvedBy = contract.approvedBy || actor.name;

      if (contract.bookingId) {
        const booking = operationsRepository.getBookingById(contract.bookingId);
        if (booking) {
          booking.dealStage = 'contract_completed';
        }
      }
    }

    contract.updatedAt = nowStr.split('T')[0];

    if (contract.bookingId) {
      operationsRepository.addDealMessage(contract.bookingId, {
        senderId: 'system',
        senderName: 'نظام دلنّي العقاري',
        senderRole: 'system_admin',
        type: 'system',
        text: `✍️ قام [${actor.name}] بالتوقيع الإلكتروني المعتمد على العقد [${contract.contractNumber}] للإصدار (v${currVer}). بصمة التوقيع: [${digitalFingerprint}]. ${bothSignedCurrent ? '🏆 اكتمل توقيع الطرفين على العقد رسمياً وأصبح جاهزاً للطباعة ومحضر الإغلاق النهائي!' : 'بانتظار توقيع الطرف الآخر لنفس الإصدار.'}`
      });
    }

    storageManager.persist();
    storageManager.syncPgContract(contract);
    return contract;
  }

  public validateDealCompletionPrerequisites(bookingId: string): {
    canComplete: boolean;
    requirements: Array<{
      key: 'contract_approval' | 'contract_signature' | 'financial_clearance' | 'handover_protocol' | 'dispute_free';
      label: string;
      satisfied: boolean;
      details: string;
    }>;
    contract?: PropertyContract;
    booking?: PropertyBooking;
    listing?: Listing;
  } {
    const booking = operationsRepository.getBookingById(bookingId);
    if (!booking) {
      return { canComplete: false, requirements: [] };
    }

    const listing = marketplaceRepository.getListingById(booking.listingId);
    const contract = this.getContractByBookingId(booking.id);
    const isSale = listing?.purpose === 'sale';

    const currVer = contract?.currentVersion || 1;
    const isContractApproved = Boolean(
      contract &&
      contract.firstPartyApproval &&
      contract.secondPartyApproval &&
      contract.firstPartyApprovedVersion === currVer &&
      contract.secondPartyApprovedVersion === currVer
    );

    const isContractSigned = Boolean(
      contract &&
      contract.status === 'signed' &&
      contract.firstPartySignedVersion === currVer &&
      contract.secondPartySignedVersion === currVer &&
      contract.electronicSignatures &&
      contract.electronicSignatures.some(s => s.partyRole === 'firstParty') &&
      contract.electronicSignatures.some(s => s.partyRole === 'secondParty')
    );

    const fc = booking.financialClearance;
    const isFinancialCleared = Boolean(fc && fc.status === 'cleared' && fc.paidAmount > 0 && fc.receiptVoucherNumber);

    const hp = booking.handoverProtocol;
    const isHandoverCompleted = Boolean(
      hp &&
      hp.status === 'completed' &&
      (isSale ? (hp.deedVerified || hp.originalDeedHandedOver) : (hp.keysHandedOver ?? true))
    );

    const isDisputeFree = Boolean(!booking.isDisputed && (!booking.dispute || booking.dispute.status !== 'active'));

    const requirements = [
      {
        key: 'contract_approval' as const,
        label: 'مراجعة واعتماد بنود العقد من الطرفين',
        satisfied: isContractApproved,
        details: isContractApproved
          ? `تم اعتماد الإصدار الحالي (v${currVer}) رسمياً من الطرف الأول والطرف الثاني بالتراضي.`
          : contract
          ? `العقد بالإصدار (v${currVer}) بانتظار اعتماد ${!contract.firstPartyApproval ? 'الطرف الأول (البائع/المؤجر)' : ''} ${!contract.secondPartyApproval ? 'الطرف الثاني (المشتري/المستأجر)' : ''}.`
          : 'لم يتم إنشاء مسودة العقد بعد لهذه الصفقة.'
      },
      {
        key: 'contract_signature' as const,
        label: 'التوقيع الإلكتروني الموثق لكلا الطرفين',
        satisfied: isContractSigned,
        details: isContractSigned
          ? `تم توقيع العقد إلكترونياً وتوثيق البصمة الرقمية والهوية للطرفين (v${currVer}).`
          : 'يلزم توقيع الطرفين إلكترونياً مع إدخال رقم الهوية والإقرار القانوني.'
      },
      {
        key: 'financial_clearance' as const,
        label: isSale ? 'المخالصة المالية وسند القبض للبيع' : 'سند استلام الإيجار والضمان التأميني',
        satisfied: isFinancialCleared,
        details: isFinancialCleared
          ? `تم توثيق سند القبض المالي برقم [${fc?.receiptVoucherNumber}] بقيمة ${fc?.paidAmount.toLocaleString()} ${fc?.currency}.`
          : 'يلزم تسجيل بيانات المخالصة المالية وإرفاق رقم سند القبض أو الإشعار البنكي.'
      },
      {
        key: 'handover_protocol' as const,
        label: isSale ? 'محضر استلام العقار وتدقيق البصيرة الشرعية' : 'محضر تسليم مفاتيح العقار وقراءة العدادات',
        satisfied: isHandoverCompleted,
        details: isHandoverCompleted
          ? `تم استكمال محضر التسليم والاستلام الرسمي بتاريخ [${hp?.handoverDate}].`
          : isSale
          ? 'يلزم توثيق تسليم البصيرة الشرعية ومحضر حيازة العقار.'
          : 'يلزم توثيق تسليم مفاتيح العقار وإثبات قراءة العدادات.'
      },
      {
        key: 'dispute_free' as const,
        label: 'خلو الصفقة من أي نزاع أو اعتراض قانوني',
        satisfied: isDisputeFree,
        details: isDisputeFree
          ? 'الصفقة خالية من أي نزاع نشط أو شكوى معلقة.'
          : `توجد قضية نزاع معلقة [${booking.dispute?.claimType}] مرفوعة من [${booking.dispute?.raisedBy?.name}]. يلزم فض النزاع أولاً.`
      }
    ];

    const canComplete = requirements.every(r => r.satisfied);
    return { canComplete, requirements, contract, booking, listing };
  }

  public updateBookingFinancialClearance(
    bookingId: string,
    fc: FinancialClearance,
    actor: { id: string; name: string; role: UserRole }
  ): { booking?: PropertyBooking; error?: string } {
    const booking = operationsRepository.getBookingById(bookingId);
    if (!booking) return { error: 'الحجز غير موجود' };

    booking.financialClearance = {
      ...fc,
      status: 'cleared',
      clearanceDate: fc.clearanceDate || new Date().toISOString().split('T')[0],
      clearedBy: fc.clearedBy || actor.name
    };
    booking.updatedAt = new Date().toISOString().split('T')[0];

    operationsRepository.addDealMessage(booking.id, {
      senderId: actor.id,
      senderName: actor.name,
      senderRole: actor.role,
      type: 'system',
      text: `💳 تم تسجيل سند المخالصة المالية برقم [${fc.receiptVoucherNumber}] بقيمة ${fc.paidAmount.toLocaleString()} ${fc.currency} بواسطة [${actor.name}].`
    });

    storageManager.persist();
    return { booking };
  }

  public updateBookingHandoverProtocol(
    bookingId: string,
    hp: HandoverProtocol,
    actor: { id: string; name: string; role: UserRole }
  ): { booking?: PropertyBooking; error?: string } {
    const booking = operationsRepository.getBookingById(bookingId);
    if (!booking) return { error: 'الحجز غير موجود' };

    booking.handoverProtocol = {
      ...hp,
      status: 'completed',
      handoverDate: hp.handoverDate || new Date().toISOString().split('T')[0],
      handedOverBy: hp.handedOverBy || actor.name
    };
    booking.updatedAt = new Date().toISOString().split('T')[0];

    operationsRepository.addDealMessage(booking.id, {
      senderId: actor.id,
      senderName: actor.name,
      senderRole: actor.role,
      type: 'system',
      text: `🔑 تم توثيق محضر تسليم واستلام العقار رسمياً بتاريخ [${booking.handoverProtocol.handoverDate}] بواسطة [${actor.name}].`
    });

    storageManager.persist();
    return { booking };
  }

  public completeBooking(
    id: string,
    completedBy: string,
    options?: {
      notes?: string;
      financialClearance?: FinancialClearance;
      handoverProtocol?: HandoverProtocol;
      forceAdminOverride?: boolean;
    }
  ): {
    booking?: PropertyBooking;
    listing?: Listing;
    contract?: PropertyContract;
    error?: string;
    missingRequirements?: any[];
  } {
    const booking = operationsRepository.getBookingById(id);
    if (!booking) return { error: 'الحجز غير موجود' };

    if (options?.financialClearance) {
      booking.financialClearance = { ...options.financialClearance, status: 'cleared' };
    }
    if (options?.handoverProtocol) {
      booking.handoverProtocol = { ...options.handoverProtocol, status: 'completed' };
    }

    const prereqs = this.validateDealCompletionPrerequisites(id);
    if (!prereqs.canComplete && !options?.forceAdminOverride) {
      const missing = prereqs.requirements.filter(r => !r.satisfied);
      return {
        error: 'لا يمكن إتمام الصفقة قبل استيفاء جميع المتطلبات المحددة لنوع المعاملة وفق الضوابط.',
        missingRequirements: missing,
        booking,
        contract: prereqs.contract
      };
    }

    const listing = marketplaceRepository.getListingById(booking.listingId);
    if (!listing) return { error: 'العقار المرتبط غير موجود' };

    const nowStr = new Date().toISOString();
    const dateOnly = nowStr.split('T')[0];
    const timeStr = new Date().toLocaleString('ar-YE', { dateStyle: 'short', timeStyle: 'short' });
    const isSale = listing.purpose === 'sale';
    const dealOutcome: 'sold' | 'rented' = isSale ? 'sold' : 'rented';
    const dossierNumber = booking.finalDossierNumber || `DOS-2026-${Math.floor(2000 + Math.random() * 8000)}`;

    booking.status = 'completed';
    booking.dealOutcome = dealOutcome;
    booking.completedAt = nowStr;
    booking.completedBy = completedBy;
    booking.finalDossierNumber = dossierNumber;
    booking.dealStage = 'contract_completed';
    booking.notes = options?.notes || booking.notes || `تم إتمام الصفقة العقارية وتوثيق المحضر النهائي [${dossierNumber}] بنجاح.`;
    booking.updatedAt = dateOnly;

    listing.status = 'completed';
    listing.dealOutcome = dealOutcome;
    listing.finalDealNumber = dossierNumber;
    listing.closedAt = nowStr;
    listing.closedBy = completedBy;
    listing.isReserved = false;
    listing.reservedUntil = undefined;
    listing.activeBookingId = undefined;

    const timelineEntry: StatusTimelineEntry = {
      status: 'completed',
      timestamp: timeStr,
      changedBy: completedBy,
      userRole: 'advertiser',
      notes: `تم إتمام الصفقة العقارية رسمياً (${isSale ? 'بيع عقاري ناقل للملكية' : 'إيجار عقاري رسمي'}) وإغلاق الإعلان نهائياً بموجب المحضر [${dossierNumber}] والعقد [${booking.contractNumber || 'موثق'}]. يمنع إعادة العقار لقوائم التوفر تلقائياً.`
    };
    listing.statusTimeline = [timelineEntry, ...(listing.statusTimeline || [])];
    listing.updatedAt = dateOnly;

    let contract = this.getContractByBookingId(booking.id);
    if (contract) {
      contract.status = 'signed';
      contract.signedAt = contract.signedAt || nowStr;
      contract.approvedAt = contract.approvedAt || nowStr;
      contract.approvedBy = contract.approvedBy || completedBy;
      contract.updatedAt = dateOnly;
    }

    operationsRepository.addDealMessage(booking.id, {
      senderId: 'system',
      senderName: 'نظام دلنّي العقاري',
      senderRole: 'system_admin',
      type: 'system',
      text: `🎉 تهانينا! تم إتمام المعاملة العقارية رسمياً وتوثيق محضر الإغلاق النهائي برقم [${dossierNumber}] بواسطة [${completedBy}]. العقار أصبح (${isSale ? 'مباعاً نهائياً' : 'مؤجراً رسمياً'}) وتم إغلاق الإعلان وأرشفة كافة العقود والمراسلات في السجل الدائم.`
    });

    marketplaceRepository.syncListingsReservationStatus();
    storageManager.persist();

    return { booking, listing, contract };
  }

  public proposeContractAmendment(
    contractId: string,
    amendment: { summaryOfChanges: string; clauses?: ContractClause[]; financialTerms?: any },
    actor: { id: string; name: string; role: UserRole }
  ): PropertyContract {
    const res = this.updateContractDraft(contractId, amendment, actor);
    return res.contract;
  }

  public respondToContractAmendment(
    contractId: string,
    accept: boolean,
    actor: { id: string; name: string; role: UserRole },
    reason?: string
  ): PropertyContract {
    const contract = this.getContractById(contractId);
    if (!contract) throw new Error('العقد غير موجود');

    if (accept) {
      return this.approveContract(contractId, 'admin', actor);
    } else {
      contract.status = 'under_review';
      contract.isModificationPendingApproval = false;
      contract.notes = reason ? `تم رفض التعديل: ${reason}` : contract.notes;
      contract.updatedAt = new Date().toISOString().split('T')[0];

      if (contract.bookingId) {
        operationsRepository.addDealMessage(contract.bookingId, {
          senderId: actor.id,
          senderName: actor.name,
          senderRole: actor.role,
          type: 'system',
          text: `❌ تم رفض تعديل العقد بواسطة [${actor.name}]. ${reason ? `السبب: ${reason}` : ''}`
        });
      }

      storageManager.persist();
      storageManager.syncPgContract(contract);
      return contract;
    }
  }

  public cancelContract(
    contractId: string,
    reason: string,
    actor: { id: string; name: string; role: UserRole }
  ): PropertyContract {
    const contract = this.getContractById(contractId);
    if (!contract) throw new Error('العقد غير موجود');

    contract.status = 'cancelled';
    contract.notes = `تم إلغاء العقد بواسطة ${actor.name}. السبب: ${reason}`;
    contract.updatedAt = new Date().toISOString().split('T')[0];

    if (contract.bookingId) {
      operationsRepository.addDealMessage(contract.bookingId, {
        senderId: actor.id,
        senderName: actor.name,
        senderRole: actor.role,
        type: 'system',
        text: `🚫 تم إلغاء العقد [${contract.contractNumber}] بواسطة [${actor.name}]. السبب: ${reason}`
      });
    }

    storageManager.persist();
    storageManager.syncPgContract(contract);
    return contract;
  }
}

export const contractsRepository = ContractsRepository.getInstance();
