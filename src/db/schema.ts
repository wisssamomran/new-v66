import {
  pgTable,
  text,
  varchar,
  integer,
  boolean,
  doublePrecision,
  jsonb,
  timestamp
} from 'drizzle-orm/pg-core';

// 1. Users Table
export const usersTable = pgTable('users', {
  id: varchar('id', { length: 128 }).primaryKey(),
  supabaseUserId: varchar('supabase_user_id', { length: 128 }),
  name: varchar('name', { length: 255 }).notNull(),
  role: varchar('role', { length: 64 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 64 }),
  phoneVerified: boolean('phone_verified').default(true),
  avatarUrl: text('avatar_url'),
  orgId: varchar('org_id', { length: 128 }),
  orgName: varchar('org_name', { length: 255 }),
  activeStatus: boolean('active_status').default(true),
  createdAt: varchar('created_at', { length: 64 }),
  updatedAt: varchar('updated_at', { length: 64 })
});

// 2. Organizations Table
export const organizationsTable = pgTable('organizations', {
  id: varchar('id', { length: 128 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  licenseNumber: varchar('license_number', { length: 128 }),
  ownerId: varchar('owner_id', { length: 128 }),
  city: varchar('city', { length: 128 }),
  governorate: varchar('governorate', { length: 128 }),
  verificationStatus: varchar('verification_status', { length: 64 }).default('verified'),
  createdAt: varchar('created_at', { length: 64 })
});

// 3. Listings Table
export const listingsTable = pgTable('listings', {
  id: varchar('id', { length: 128 }).primaryKey(),
  listingNumber: varchar('listing_number', { length: 128 }).notNull(),
  title: text('title').notNull(),
  description: text('description'),
  propertyType: varchar('property_type', { length: 64 }).notNull(),
  purpose: varchar('purpose', { length: 64 }).notNull(),
  status: varchar('status', { length: 64 }).notNull(),
  price: doublePrecision('price').default(0),
  currency: varchar('currency', { length: 16 }).default('YER'),
  isNegotiable: boolean('is_negotiable').default(false),
  area: doublePrecision('area').default(0),
  areaUnit: varchar('area_unit', { length: 32 }).default('م²'),
  isReserved: boolean('is_reserved').default(false),
  viewsCount: integer('views_count').default(0),
  favoritesCount: integer('favorites_count').default(0),
  location: jsonb('location'),
  attributes: jsonb('attributes'),
  advertiser: jsonb('advertiser'),
  verificationBadges: jsonb('verification_badges'),
  statusTimeline: jsonb('status_timeline'),
  createdAt: varchar('created_at', { length: 64 }),
  updatedAt: varchar('updated_at', { length: 64 })
});

// 4. Property Requests Table
export const propertyRequestsTable = pgTable('property_requests', {
  id: varchar('id', { length: 128 }).primaryKey(),
  requestNumber: varchar('request_number', { length: 128 }).notNull(),
  listingId: varchar('listing_id', { length: 128 }).notNull(),
  listingTitle: text('listing_title'),
  listingNumber: varchar('listing_number', { length: 128 }),
  listingPrice: doublePrecision('listing_price'),
  listingCurrency: varchar('listing_currency', { length: 16 }),
  listingImage: text('listing_image'),
  listingGovernorate: varchar('listing_governorate', { length: 128 }),
  seekerId: varchar('seeker_id', { length: 128 }).notNull(),
  seekerName: varchar('seeker_name', { length: 255 }),
  seekerPhone: varchar('seeker_phone', { length: 64 }),
  advertiserId: varchar('advertiser_id', { length: 128 }).notNull(),
  advertiserName: varchar('advertiser_name', { length: 255 }),
  advertiserPhone: varchar('advertiser_phone', { length: 64 }),
  requestType: varchar('request_type', { length: 64 }).notNull(),
  status: varchar('status', { length: 64 }).notNull(),
  notes: text('notes'),
  offeredPrice: doublePrecision('offered_price'),
  preferredDate: varchar('preferred_date', { length: 64 }),
  requestedDurationHours: integer('requested_duration_hours').default(48),
  bookingId: varchar('booking_id', { length: 128 }),
  paymentMethod: varchar('payment_method', { length: 64 }),
  rentalUsageType: varchar('rental_usage_type', { length: 64 }),
  leaseDurationMonths: integer('lease_duration_months'),
  paymentFrequency: varchar('payment_frequency', { length: 64 }),
  createdAt: varchar('created_at', { length: 64 }),
  updatedAt: varchar('updated_at', { length: 64 })
});

// 5. Property Bookings Table
export const propertyBookingsTable = pgTable('property_bookings', {
  id: varchar('id', { length: 128 }).primaryKey(),
  bookingNumber: varchar('booking_number', { length: 128 }).notNull(),
  requestId: varchar('request_id', { length: 128 }).notNull(),
  listingId: varchar('listing_id', { length: 128 }).notNull(),
  listingTitle: text('listing_title'),
  listingNumber: varchar('listing_number', { length: 128 }),
  listingImage: text('listing_image'),
  listingGovernorate: varchar('listing_governorate', { length: 128 }),
  listingPrice: doublePrecision('listing_price'),
  listingCurrency: varchar('listing_currency', { length: 16 }),
  seekerId: varchar('seeker_id', { length: 128 }).notNull(),
  seekerName: varchar('seeker_name', { length: 255 }),
  seekerPhone: varchar('seeker_phone', { length: 64 }),
  advertiserId: varchar('advertiser_id', { length: 128 }).notNull(),
  advertiserName: varchar('advertiser_name', { length: 255 }),
  advertiserPhone: varchar('advertiser_phone', { length: 64 }),
  status: varchar('status', { length: 64 }).notNull(),
  durationHours: integer('duration_hours').default(48),
  startDate: varchar('start_date', { length: 64 }),
  expiresAt: varchar('expires_at', { length: 64 }),
  confirmedBy: varchar('confirmed_by', { length: 128 }),
  dealStage: varchar('deal_stage', { length: 64 }),
  contractId: varchar('contract_id', { length: 128 }),
  contractNumber: varchar('contract_number', { length: 128 }),
  notes: text('notes'),
  paymentMethod: varchar('payment_method', { length: 64 }),
  rentalUsageType: varchar('rental_usage_type', { length: 64 }),
  inspectionVisit: jsonb('inspection_visit'),
  currentTerms: jsonb('current_terms'),
  agreedTerms: jsonb('agreed_terms'),
  messages: jsonb('messages'),
  createdAt: varchar('created_at', { length: 64 }),
  updatedAt: varchar('updated_at', { length: 64 })
});

// 6. Property Contracts Table
export const propertyContractsTable = pgTable('property_contracts', {
  id: varchar('id', { length: 128 }).primaryKey(),
  contractNumber: varchar('contract_number', { length: 128 }).notNull(),
  bookingId: varchar('booking_id', { length: 128 }).notNull(),
  bookingNumber: varchar('booking_number', { length: 128 }),
  listingId: varchar('listing_id', { length: 128 }).notNull(),
  listingNumber: varchar('listing_number', { length: 128 }),
  listingTitle: text('listing_title'),
  contractType: varchar('contract_type', { length: 32 }).notNull(),
  status: varchar('status', { length: 64 }).notNull(),
  currentVersion: integer('current_version').default(1),
  firstParty: jsonb('first_party'),
  secondParty: jsonb('second_party'),
  propertySnapshot: jsonb('property_snapshot'),
  financialTerms: jsonb('financial_terms'),
  clauses: jsonb('clauses'),
  versionHistory: jsonb('version_history'),
  createdAt: varchar('created_at', { length: 64 }),
  updatedAt: varchar('updated_at', { length: 64 })
});

// 7. Verification Requests Table
export const verificationRequestsTable = pgTable('verification_requests', {
  id: varchar('id', { length: 128 }).primaryKey(),
  listingId: varchar('listing_id', { length: 128 }).notNull(),
  listingTitle: text('listing_title'),
  listingCode: varchar('listing_code', { length: 128 }),
  deedNumber: varchar('deed_number', { length: 128 }),
  deedType: varchar('deed_type', { length: 64 }),
  documentUrls: jsonb('document_urls'),
  status: varchar('status', { length: 64 }).notNull(),
  submittedBy: varchar('submitted_by', { length: 128 }),
  reviewedBy: varchar('reviewed_by', { length: 128 }),
  reviewedAt: varchar('reviewed_at', { length: 64 }),
  notes: text('notes'),
  createdAt: varchar('created_at', { length: 64 })
});

// 8. Reports Table
export const reportsTable = pgTable('reports', {
  id: varchar('id', { length: 128 }).primaryKey(),
  reportNumber: varchar('report_number', { length: 128 }).notNull(),
  reporterId: varchar('reporter_id', { length: 128 }).notNull(),
  reporterName: varchar('reporter_name', { length: 255 }),
  targetType: varchar('target_type', { length: 64 }).notNull(),
  targetId: varchar('target_id', { length: 128 }).notNull(),
  reason: text('reason').notNull(),
  status: varchar('status', { length: 64 }).notNull(),
  investigatedBy: varchar('investigated_by', { length: 128 }),
  resolutionNotes: text('resolution_notes'),
  createdAt: varchar('created_at', { length: 64 })
});

// 9. Support Tickets Table
export const supportTicketsTable = pgTable('support_tickets', {
  id: varchar('id', { length: 128 }).primaryKey(),
  ticketNumber: varchar('ticket_number', { length: 128 }).notNull(),
  userId: varchar('user_id', { length: 128 }).notNull(),
  userName: varchar('user_name', { length: 255 }),
  subject: text('subject').notNull(),
  category: varchar('category', { length: 64 }),
  status: varchar('status', { length: 64 }).notNull(),
  messages: jsonb('messages'),
  createdAt: varchar('created_at', { length: 64 }),
  updatedAt: varchar('updated_at', { length: 64 })
});

// 10. Audit Logs Table
export const auditLogsTable = pgTable('audit_logs', {
  id: varchar('id', { length: 128 }).primaryKey(),
  userId: varchar('user_id', { length: 128 }).notNull(),
  userName: varchar('user_name', { length: 255 }),
  userRole: varchar('user_role', { length: 64 }),
  action: text('action').notNull(),
  category: varchar('category', { length: 64 }),
  targetId: varchar('target_id', { length: 128 }),
  status: varchar('status', { length: 64 }),
  details: text('details'),
  ipAddress: varchar('ip_address', { length: 128 }),
  createdAt: varchar('created_at', { length: 64 })
});

// 11. System Settings Table
export const systemSettingsTable = pgTable('system_settings', {
  id: varchar('id', { length: 64 }).primaryKey().default('global'),
  settings: jsonb('settings').notNull(),
  updatedAt: varchar('updated_at', { length: 64 })
});
