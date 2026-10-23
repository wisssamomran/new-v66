import { Request, Response, NextFunction } from 'express';
import { User, UserRole, Listing, AuditLogEntry } from '../types';
import { db } from './db';

// Extend Express Request with user information
declare global {
  namespace Express {
    interface Request {
      currentUser: User;
    }
  }
}

/**
 * 1. Yemeni Phone Number Strict Validator
 * Validates Yemeni Telecom operators:
 * - 77, 78: Yemen Mobile (CDMA / 4G)
 * - 71: Sabafon
 * - 73: YOU (Formerly MTN)
 * - 70: Y Telecom
 * - 01 - 07: Landlines (Sanaa, Aden, Taiz, etc.)
 */
export function validateYemeniPhone(phone: string): { isValid: boolean; normalized: string; error?: string } {
  if (!phone || typeof phone !== 'string') {
    return { isValid: false, normalized: '', error: 'رقم الهاتف مطلوب' };
  }

  // Remove spaces, dashes, parentheses
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');

  // Strip international prefixes (+967 or 00967)
  let localNum = cleaned;
  if (localNum.startsWith('+967')) {
    localNum = localNum.slice(4);
  } else if (localNum.startsWith('00967')) {
    localNum = localNum.slice(5);
  }

  // Strip leading zero if present
  if (localNum.startsWith('0') && localNum.length > 7) {
    localNum = localNum.slice(1);
  }

  // Validate Mobile: exactly 9 digits, starts with 70, 71, 73, 77, 78
  const mobileRegex = /^7[01378][0-9]{7}$/;
  if (mobileRegex.test(localNum)) {
    return {
      isValid: true,
      normalized: `+967 ${localNum.slice(0, 2)} ${localNum.slice(2, 5)} ${localNum.slice(5)}`
    };
  }

  // Validate Landline: 6-7 digits with area codes
  const landlineRegex = /^[1-7][0-9]{6,7}$/;
  if (landlineRegex.test(localNum)) {
    return {
      isValid: true,
      normalized: `+967 ${localNum}`
    };
  }

  return {
    isValid: false,
    normalized: phone,
    error: 'رقم الهاتف غير صالح، يجب أن يتبع أرقام الاتصالات اليمنية (77, 78, 71, 73, 70) من 9 أرقام.'
  };
}

/**
 * 2. Privacy Geolocation Fuzzing Engine
 * Offsets the exact latitude and longitude by a deterministic/pseudorandom radius of ~150 to 300 meters
 * to prevent real-estate broker circumvention and protect owner privacy.
 */
export function fuzzCoordinates(lat: number, lng: number, seedId: string): { lat: number; lng: number } {
  // Deterministic hash based on listing ID so the pin doesn't jump randomly between renders
  let hash = 0;
  for (let i = 0; i < seedId.length; i++) {
    hash = (hash << 5) - hash + seedId.charCodeAt(i);
    hash |= 0;
  }
  
  // Offset angle and distance (approx 150 - 250 meters, 1 deg lat ≈ 111km)
  const angle = ((Math.abs(hash) % 360) * Math.PI) / 180;
  const radiusDegrees = 0.0015 + ((Math.abs(hash >> 3) % 15) * 0.0001); // ~160m to 300m

  const offsetLat = Math.sin(angle) * radiusDegrees;
  const offsetLng = Math.cos(angle) * (radiusDegrees / Math.cos((lat * Math.PI) / 180));

  return {
    lat: Number((lat + offsetLat).toFixed(6)),
    lng: Number((lng + offsetLng).toFixed(6))
  };
}

/**
 * 3. Sanitize listing for viewing according to roles
 */
export function sanitizeListingForUser(listing: Listing, viewer: User): Listing {
  const isOwner = listing.advertiser?.id === viewer.id;
  const isPrivileged = viewer.role === 'system_admin' || viewer.role === 'moderator' || viewer.role === 'verifier';

  if (isOwner || isPrivileged) {
    // Return full details including exact location and private deeds
    return listing;
  }

  // General public / Seeker / Other advertiser view:
  // Apply location fuzzing and hide private documents
  const lat = listing.location?.lat ?? 15.3120;
  const lng = listing.location?.lng ?? 44.1870;
  const fuzzed = fuzzCoordinates(lat, lng, listing.id);

  return {
    ...listing,
    location: {
      governorate: listing.location?.governorate || 'صنعاء (أمانة العاصمة)',
      city: listing.location?.city || 'صنعاء',
      district: listing.location?.district || 'الأمانة',
      street: listing.location?.street,
      lat: fuzzed.lat,
      lng: fuzzed.lng,
      isApproximate: true
    },
    // Completely omit private documents (deeds, identities) for general users
    privateDocuments: undefined
  };
}

/**
 * 4. Central Audit Logger Helper
 */
export function recordAuditLog(
  actor: User,
  action: string,
  targetType: AuditLogEntry['targetType'],
  targetId: string,
  result: AuditLogEntry['result'],
  details: string
): AuditLogEntry {
  const entry: AuditLogEntry = {
    id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toLocaleString('ar-YE', { dateStyle: 'short', timeStyle: 'short' }),
    userId: actor.id,
    userName: actor.name,
    userRole: actor.role,
    action,
    targetType,
    targetId,
    result,
    details
  };

  db.addAuditLog(entry);
  return entry;
}

/**
 * 5. Authentication & Identity Middleware
 * Resolves user from X-User-Role, Authorization header, or defaults to visitor
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const rawIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || '';
  const clientIp = rawIp.replace('::ffff:', '');

  // 1. IP Blocking Guard (Prevent self-lockout for localhost and system_admin unblocking)
  if (clientIp && !['127.0.0.1', '::1', 'localhost'].includes(clientIp) && db.isIpBlocked(clientIp)) {
    const requestedRoleHeader = (req.headers['x-user-role'] as string) || '';
    if (requestedRoleHeader !== 'system_admin' || !req.path.includes('/security/')) {
      return res.status(403).json({
        error: 'تم حظر عنوان الـ IP الخاص بك من قبل إدارة المنظومة لأسباب أمنية.',
        code: 'IP_BLOCKED',
        ip: clientIp
      });
    }
  }

  const requestedRoleHeader = (req.headers['x-user-role'] as string) || '';
  const requestedUserIdHeader = (req.headers['x-user-id'] as string) || '';
  const requestedUserNameHeader = req.headers['x-user-name'] ? decodeURIComponent(req.headers['x-user-name'] as string) : '';
  const authHeader = req.headers['authorization'] || '';

  // Look up user by explicit ID, or by role, or token
  const allUsers = db.getUsers();
  let user: User | undefined;

  if (requestedUserIdHeader) {
    user = allUsers.find(u => u.id === requestedUserIdHeader);
    if (!user && requestedRoleHeader) {
      user = {
        id: requestedUserIdHeader,
        name: requestedUserNameHeader || `مستخدم [${requestedRoleHeader}]`,
        phone: '770000000',
        phoneVerified: true,
        role: requestedRoleHeader as UserRole,
        activeStatus: true,
        createdAt: '2026-01-01'
      };
    }
  }

  if (!user && requestedRoleHeader) {
    user = allUsers.find(u => u.role === requestedRoleHeader);
  }

  if (!user && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    user = allUsers.find(u => u.id === token || u.role === token);
  }

  // Fallback default: visitor
  if (!user) {
    user = allUsers.find(u => u.role === 'visitor') || {
      id: 'usr-visitor-guest',
      name: 'زائر المنصة',
      phone: '',
      phoneVerified: false,
      role: 'visitor',
      activeStatus: true,
      createdAt: '2026-01-01'
    };
  }

  // 2. Disabled Account Guard
  if (user && user.activeStatus === false && req.path !== '/api/auth/me' && !req.path.startsWith('/api/auth/switch-role')) {
    return res.status(403).json({
      error: 'تم تعطيل أو إيقاف هذا الحساب إدارياً. يرجى التواصل مع إدارة النظام.',
      code: 'ACCOUNT_DISABLED',
      userId: user.id
    });
  }

  req.currentUser = user;
  next();
}

/**
 * 6. RBAC Role Authorization Guard Middleware
 */
export function requireRoles(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.currentUser.role;

    if (allowedRoles.includes(userRole) || userRole === 'system_admin') {
      return next();
    }

    recordAuditLog(
      req.currentUser,
      'محاولة وصول غير مصرح بها',
      'user',
      req.currentUser.id,
      'denied',
      `تم رفض الوصول إلى المسار ${req.originalUrl} - الدور الحالي [${userRole}] غير مصرح له.`
    );

    return res.status(403).json({
      error: 'غير مصرح لك بتنفيذ هذه العملية',
      requiredRoles: allowedRoles,
      yourRole: userRole,
      code: 'RBAC_FORBIDDEN'
    });
  };
}
