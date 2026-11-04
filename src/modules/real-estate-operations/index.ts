/**
 * Subsystem 4: Real Estate Operations & Transactions (العمليات والمعاملات العقارية)
 * 
 * Responsibilities:
 * - Property inquiries & purchase/rent booking requests.
 * - Exclusive temporary reservations (anti-concurrent locking).
 * - Deal follow-up workspace (غرفة متابعة الصفقة):
 *   - In-deal messaging and party communications.
 *   - Terms negotiation (anti-silent modification).
 *   - Field inspection visits & deed reviews.
 *   - Deal milestones & dispute escalation.
 */

export { BookingsManagementPage } from '../../pages/BookingsManagementPage';
export { BookingModal } from '../../components/BookingModal';
export { BookingDealWorkspaceModal } from '../../components/BookingDealWorkspaceModal';
