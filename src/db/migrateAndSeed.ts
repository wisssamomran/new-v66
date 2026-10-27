import 'dotenv/config';
import { db, client, checkPostgresConnection, schema } from './index';
import { eq, count } from 'drizzle-orm';
import {
  MOCK_USERS,
  INITIAL_LISTINGS,
  INITIAL_ORGANIZATIONS,
  INITIAL_VERIFICATION_REQUESTS,
  INITIAL_REPORTS,
  INITIAL_TICKETS,
  INITIAL_AUDIT_LOGS,
  INITIAL_PROPERTY_REQUESTS,
  INITIAL_PROPERTY_BOOKINGS,
  INITIAL_PROPERTY_CONTRACTS
} from '../data/yemenData';

export async function runAutoMigrationAndSeeding(): Promise<{
  success: boolean;
  usingPostgres: boolean;
  migratedCounts?: Record<string, number>;
  message: string;
}> {
  const isConnected = await checkPostgresConnection();
  if (!isConnected || !db || !client) {
    console.log('[Dalani Migration] PostgreSQL connection unavailable. Operating in local JSON fallback mode.');
    return {
      success: true,
      usingPostgres: false,
      message: 'PostgreSQL connection string (DATABASE_URL) is not set or unreachable. Operating in local mode.'
    };
  }

  console.log('[Dalani Migration] PostgreSQL connected. Verifying tables and executing auto-migration...');

  try {
    // 1. Ensure Table Structure Exists in PostgreSQL by executing each table DDL individually via client.unsafe
    const tableDefinitions = [
      `CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(128) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(64) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(64),
        phone_verified BOOLEAN DEFAULT true,
        avatar_url TEXT,
        org_id VARCHAR(128),
        org_name VARCHAR(255),
        active_status BOOLEAN DEFAULT true,
        created_at VARCHAR(64),
        updated_at VARCHAR(64)
      )`,
      `CREATE TABLE IF NOT EXISTS organizations (
        id VARCHAR(128) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        license_number VARCHAR(128),
        owner_id VARCHAR(128),
        city VARCHAR(128),
        governorate VARCHAR(128),
        verification_status VARCHAR(64) DEFAULT 'verified',
        created_at VARCHAR(64)
      )`,
      `CREATE TABLE IF NOT EXISTS listings (
        id VARCHAR(128) PRIMARY KEY,
        listing_number VARCHAR(128) NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        property_type VARCHAR(64) NOT NULL,
        purpose VARCHAR(64) NOT NULL,
        status VARCHAR(64) NOT NULL,
        price DOUBLE PRECISION DEFAULT 0,
        currency VARCHAR(16) DEFAULT 'YER',
        is_negotiable BOOLEAN DEFAULT false,
        area DOUBLE PRECISION DEFAULT 0,
        area_unit VARCHAR(32) DEFAULT 'م²',
        is_reserved BOOLEAN DEFAULT false,
        views_count INTEGER DEFAULT 0,
        favorites_count INTEGER DEFAULT 0,
        location JSONB,
        attributes JSONB,
        advertiser JSONB,
        verification_badges JSONB,
        status_timeline JSONB,
        created_at VARCHAR(64),
        updated_at VARCHAR(64)
      )`,
      `CREATE TABLE IF NOT EXISTS property_requests (
        id VARCHAR(128) PRIMARY KEY,
        request_number VARCHAR(128) NOT NULL,
        listing_id VARCHAR(128) NOT NULL,
        listing_title TEXT,
        listing_number VARCHAR(128),
        listing_price DOUBLE PRECISION,
        listing_currency VARCHAR(16),
        listing_image TEXT,
        listing_governorate VARCHAR(128),
        seeker_id VARCHAR(128) NOT NULL,
        seeker_name VARCHAR(255),
        seeker_phone VARCHAR(64),
        advertiser_id VARCHAR(128) NOT NULL,
        advertiser_name VARCHAR(255),
        advertiser_phone VARCHAR(64),
        request_type VARCHAR(64) NOT NULL,
        status VARCHAR(64) NOT NULL,
        notes TEXT,
        offered_price DOUBLE PRECISION,
        preferred_date VARCHAR(64),
        requested_duration_hours INTEGER DEFAULT 48,
        booking_id VARCHAR(128),
        payment_method VARCHAR(64),
        rental_usage_type VARCHAR(64),
        lease_duration_months INTEGER,
        payment_frequency VARCHAR(64),
        created_at VARCHAR(64),
        updated_at VARCHAR(64)
      )`,
      `CREATE TABLE IF NOT EXISTS property_bookings (
        id VARCHAR(128) PRIMARY KEY,
        booking_number VARCHAR(128) NOT NULL,
        request_id VARCHAR(128) NOT NULL,
        listing_id VARCHAR(128) NOT NULL,
        listing_title TEXT,
        listing_number VARCHAR(128),
        listing_image TEXT,
        listing_governorate VARCHAR(128),
        listing_price DOUBLE PRECISION,
        listing_currency VARCHAR(16),
        seeker_id VARCHAR(128) NOT NULL,
        seeker_name VARCHAR(255),
        seeker_phone VARCHAR(64),
        advertiser_id VARCHAR(128) NOT NULL,
        advertiser_name VARCHAR(255),
        advertiser_phone VARCHAR(64),
        status VARCHAR(64) NOT NULL,
        duration_hours INTEGER DEFAULT 48,
        start_date VARCHAR(64),
        expires_at VARCHAR(64),
        confirmed_by VARCHAR(128),
        deal_stage VARCHAR(64),
        contract_id VARCHAR(128),
        contract_number VARCHAR(128),
        notes TEXT,
        payment_method VARCHAR(64),
        rental_usage_type VARCHAR(64),
        inspection_visit JSONB,
        current_terms JSONB,
        agreed_terms JSONB,
        messages JSONB,
        created_at VARCHAR(64),
        updated_at VARCHAR(64)
      )`,
      `CREATE TABLE IF NOT EXISTS property_contracts (
        id VARCHAR(128) PRIMARY KEY,
        contract_number VARCHAR(128) NOT NULL,
        booking_id VARCHAR(128) NOT NULL,
        booking_number VARCHAR(128),
        listing_id VARCHAR(128) NOT NULL,
        listing_number VARCHAR(128),
        listing_title TEXT,
        contract_type VARCHAR(32) NOT NULL,
        status VARCHAR(64) NOT NULL,
        current_version INTEGER DEFAULT 1,
        first_party JSONB,
        second_party JSONB,
        property_snapshot JSONB,
        financial_terms JSONB,
        clauses JSONB,
        version_history JSONB,
        created_at VARCHAR(64),
        updated_at VARCHAR(64)
      )`,
      `CREATE TABLE IF NOT EXISTS verification_requests (
        id VARCHAR(128) PRIMARY KEY,
        listing_id VARCHAR(128) NOT NULL,
        listing_title TEXT,
        listing_code VARCHAR(128),
        deed_number VARCHAR(128),
        deed_type VARCHAR(64),
        document_urls JSONB,
        status VARCHAR(64) NOT NULL,
        submitted_by VARCHAR(128),
        reviewed_by VARCHAR(128),
        reviewed_at VARCHAR(64),
        notes TEXT,
        created_at VARCHAR(64)
      )`,
      `CREATE TABLE IF NOT EXISTS reports (
        id VARCHAR(128) PRIMARY KEY,
        report_number VARCHAR(128) NOT NULL,
        reporter_id VARCHAR(128) NOT NULL,
        reporter_name VARCHAR(255),
        target_type VARCHAR(64) NOT NULL,
        target_id VARCHAR(128) NOT NULL,
        reason TEXT NOT NULL,
        status VARCHAR(64) NOT NULL,
        investigated_by VARCHAR(128),
        resolution_notes TEXT,
        created_at VARCHAR(64)
      )`,
      `CREATE TABLE IF NOT EXISTS support_tickets (
        id VARCHAR(128) PRIMARY KEY,
        ticket_number VARCHAR(128) NOT NULL,
        user_id VARCHAR(128) NOT NULL,
        user_name VARCHAR(255),
        subject TEXT NOT NULL,
        category VARCHAR(64),
        status VARCHAR(64) NOT NULL,
        messages JSONB,
        created_at VARCHAR(64),
        updated_at VARCHAR(64)
      )`,
      `CREATE TABLE IF NOT EXISTS audit_logs (
        id VARCHAR(128) PRIMARY KEY,
        user_id VARCHAR(128) NOT NULL,
        user_name VARCHAR(255),
        user_role VARCHAR(64),
        action TEXT NOT NULL,
        category VARCHAR(64),
        target_id VARCHAR(128),
        status VARCHAR(64),
        details TEXT,
        ip_address VARCHAR(128),
        created_at VARCHAR(64)
      )`,
      `CREATE TABLE IF NOT EXISTS system_settings (
        id VARCHAR(64) PRIMARY KEY DEFAULT 'global',
        settings JSONB NOT NULL,
        updated_at VARCHAR(64)
      )`
    ];

    for (const ddl of tableDefinitions) {
      await client.unsafe(ddl);
    }

    // 2. Check if data seeding is required
    const userCountRes = await db.select({ val: count() }).from(schema.usersTable);
    const existingUsersCount = userCountRes[0]?.val || 0;

    const counts: Record<string, number> = {};

    if (existingUsersCount === 0) {
      console.log('[Dalani Migration] Seeding initial dataset into PostgreSQL...');

      // Seed Users
      const usersList = Object.values(MOCK_USERS);
      for (const u of usersList) {
        await db.insert(schema.usersTable).values({
          id: u.id,
          name: u.name,
          role: u.role,
          email: u.email || null,
          phone: u.phone || null,
          phoneVerified: u.phoneVerified ?? true,
          avatarUrl: u.avatarUrl || null,
          orgId: u.orgId || null,
          orgName: u.orgName || null,
          activeStatus: u.activeStatus ?? true,
          createdAt: u.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }).onConflictDoNothing();
      }
      counts.users = usersList.length;

      // Seed Organizations
      for (const o of INITIAL_ORGANIZATIONS) {
        await db.insert(schema.organizationsTable).values({
          id: o.id,
          name: o.name,
          licenseNumber: o.commercialRegNo || null,
          ownerId: o.managerId || null,
          city: o.city || null,
          governorate: o.governorate || null,
          verificationStatus: o.isVerified ? 'verified' : 'unverified',
          createdAt: o.createdAt || new Date().toISOString()
        }).onConflictDoNothing();
      }
      counts.organizations = INITIAL_ORGANIZATIONS.length;

      // Seed Listings
      for (const l of INITIAL_LISTINGS) {
        await db.insert(schema.listingsTable).values({
          id: l.id,
          listingNumber: l.listingNumber || `YEM-${l.id}`,
          title: l.title,
          description: l.description || '',
          propertyType: l.propertyType,
          purpose: l.purpose,
          status: l.status,
          price: l.price || 0,
          currency: l.currency || 'YER',
          isNegotiable: Boolean(l.isNegotiable),
          area: l.area || 0,
          areaUnit: l.areaUnit || 'م²',
          isReserved: Boolean(l.isReserved),
          viewsCount: l.viewsCount || 0,
          favoritesCount: l.favoritesCount || 0,
          location: l.location || null,
          attributes: l.attributes || null,
          advertiser: l.advertiser || null,
          verificationBadges: l.verificationBadges || [],
          statusTimeline: l.statusTimeline || [],
          createdAt: l.createdAt || new Date().toISOString(),
          updatedAt: l.updatedAt || new Date().toISOString()
        }).onConflictDoNothing();
      }
      counts.listings = INITIAL_LISTINGS.length;

      // Seed Property Requests
      for (const reqItem of INITIAL_PROPERTY_REQUESTS) {
        await db.insert(schema.propertyRequestsTable).values({
          id: reqItem.id,
          requestNumber: reqItem.requestNumber,
          listingId: reqItem.listingId,
          listingTitle: reqItem.listingTitle || null,
          listingNumber: reqItem.listingNumber || null,
          listingPrice: reqItem.listingPrice || null,
          listingCurrency: reqItem.listingCurrency || null,
          listingImage: reqItem.listingImage || null,
          listingGovernorate: reqItem.listingGovernorate || null,
          seekerId: reqItem.seekerId,
          seekerName: reqItem.seekerName || null,
          seekerPhone: reqItem.seekerPhone || null,
          advertiserId: reqItem.advertiserId,
          advertiserName: reqItem.advertiserName || null,
          advertiserPhone: reqItem.advertiserPhone || null,
          requestType: reqItem.requestType,
          status: reqItem.status,
          notes: reqItem.notes || null,
          offeredPrice: reqItem.offeredPrice || null,
          preferredDate: reqItem.preferredDate || null,
          requestedDurationHours: reqItem.requestedDurationHours || 48,
          bookingId: reqItem.bookingId || null,
          paymentMethod: reqItem.paymentMethod || null,
          rentalUsageType: reqItem.rentalUsageType || null,
          leaseDurationMonths: reqItem.leaseDurationMonths || null,
          paymentFrequency: reqItem.paymentFrequency || null,
          createdAt: reqItem.createdAt || new Date().toISOString(),
          updatedAt: reqItem.updatedAt || new Date().toISOString()
        }).onConflictDoNothing();
      }
      counts.requests = INITIAL_PROPERTY_REQUESTS.length;

      // Seed Property Bookings
      for (const bkg of INITIAL_PROPERTY_BOOKINGS) {
        await db.insert(schema.propertyBookingsTable).values({
          id: bkg.id,
          bookingNumber: bkg.bookingNumber,
          requestId: bkg.requestId,
          listingId: bkg.listingId,
          listingTitle: bkg.listingTitle || null,
          listingNumber: bkg.listingNumber || null,
          listingImage: bkg.listingImage || null,
          listingGovernorate: bkg.listingGovernorate || null,
          listingPrice: bkg.listingPrice || null,
          listingCurrency: bkg.listingCurrency || null,
          seekerId: bkg.seekerId,
          seekerName: bkg.seekerName || null,
          seekerPhone: bkg.seekerPhone || null,
          advertiserId: bkg.advertiserId,
          advertiserName: bkg.advertiserName || null,
          advertiserPhone: bkg.advertiserPhone || null,
          status: bkg.status,
          durationHours: bkg.durationHours || 48,
          startDate: bkg.startDate || null,
          expiresAt: bkg.expiresAt || null,
          confirmedBy: bkg.confirmedBy || null,
          dealStage: bkg.dealStage || null,
          contractId: bkg.contractId || null,
          contractNumber: bkg.contractNumber || null,
          notes: bkg.notes || null,
          paymentMethod: bkg.paymentMethod || null,
          rentalUsageType: bkg.rentalUsageType || null,
          inspectionVisit: bkg.inspectionVisit || null,
          currentTerms: bkg.currentTerms || null,
          agreedTerms: bkg.agreedTerms || null,
          messages: bkg.messages || [],
          createdAt: bkg.createdAt || new Date().toISOString(),
          updatedAt: bkg.updatedAt || new Date().toISOString()
        }).onConflictDoNothing();
      }
      counts.bookings = INITIAL_PROPERTY_BOOKINGS.length;

      // Seed Property Contracts
      for (const cnt of INITIAL_PROPERTY_CONTRACTS) {
        await db.insert(schema.propertyContractsTable).values({
          id: cnt.id,
          contractNumber: cnt.contractNumber,
          bookingId: cnt.bookingId,
          bookingNumber: cnt.bookingNumber || null,
          listingId: cnt.listingId,
          listingNumber: cnt.listingNumber || null,
          listingTitle: cnt.listingTitle || null,
          contractType: cnt.contractType,
          status: cnt.status,
          currentVersion: cnt.currentVersion || 1,
          firstParty: cnt.firstParty || null,
          secondParty: cnt.secondParty || null,
          propertySnapshot: cnt.propertySnapshot || null,
          financialTerms: cnt.financialTerms || null,
          clauses: cnt.clauses || [],
          versionHistory: cnt.versionHistory || [],
          createdAt: cnt.createdAt || new Date().toISOString(),
          updatedAt: cnt.updatedAt || new Date().toISOString()
        }).onConflictDoNothing();
      }
      counts.contracts = INITIAL_PROPERTY_CONTRACTS.length;

      // Seed Verifications
      for (const v of INITIAL_VERIFICATION_REQUESTS) {
        await db.insert(schema.verificationRequestsTable).values({
          id: v.id,
          listingId: v.targetId,
          listingTitle: v.targetName || null,
          listingCode: null,
          deedNumber: null,
          deedType: v.requestType || null,
          documentUrls: v.documents || [],
          status: v.status,
          submittedBy: v.submittedBy || null,
          reviewedBy: v.reviewedBy || null,
          reviewedAt: v.reviewedAt || null,
          notes: v.moderatorNotes || null,
          createdAt: v.createdAt || new Date().toISOString()
        }).onConflictDoNothing();
      }
      counts.verifications = INITIAL_VERIFICATION_REQUESTS.length;

      // Seed Reports
      for (const r of INITIAL_REPORTS) {
        await db.insert(schema.reportsTable).values({
          id: r.id,
          reportNumber: r.caseNumber || `REP-${r.id}`,
          reporterId: r.reporterName,
          reporterName: r.reporterName || null,
          targetType: 'listing',
          targetId: r.listingId,
          reason: r.reason,
          status: r.status,
          investigatedBy: r.assignedOfficer || null,
          resolutionNotes: r.resolutionReason || null,
          createdAt: r.createdAt || new Date().toISOString()
        }).onConflictDoNothing();
      }
      counts.reports = INITIAL_REPORTS.length;

      // Seed Support Tickets
      for (const t of INITIAL_TICKETS) {
        await db.insert(schema.supportTicketsTable).values({
          id: t.id,
          ticketNumber: t.ticketNumber || `TCK-${t.id}`,
          userId: t.userId,
          userName: t.userName || null,
          subject: t.subject,
          category: t.category || null,
          status: t.status,
          messages: t.messages || [],
          createdAt: t.createdAt || new Date().toISOString(),
          updatedAt: t.updatedAt || new Date().toISOString()
        }).onConflictDoNothing();
      }
      counts.tickets = INITIAL_TICKETS.length;

      // Seed Audit Logs
      for (const log of INITIAL_AUDIT_LOGS) {
        await db.insert(schema.auditLogsTable).values({
          id: log.id,
          userId: log.userId,
          userName: log.userName || null,
          userRole: log.userRole || null,
          action: log.action,
          category: log.targetType || null,
          targetId: log.targetId || null,
          status: log.result || null,
          details: log.details || null,
          ipAddress: log.ipAddress || null,
          createdAt: log.timestamp || new Date().toISOString()
        }).onConflictDoNothing();
      }
      counts.auditLogs = INITIAL_AUDIT_LOGS.length;

      console.log('[Dalani Migration] Seeding completed successfully:', counts);
    } else {
      console.log(`[Dalani Migration] PostgreSQL tables already contain data (${existingUsersCount} users). Skipping seed.`);
    }

    return {
      success: true,
      usingPostgres: true,
      migratedCounts: counts,
      message: 'PostgreSQL database tables verified and migrated successfully.'
    };
  } catch (err: any) {
    console.error('[Dalani Migration] Error during migration/seeding:', err);
    return {
      success: false,
      usingPostgres: true,
      message: `Migration error: ${err?.message || String(err)}`
    };
  }
}
