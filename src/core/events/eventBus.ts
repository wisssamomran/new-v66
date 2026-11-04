/**
 * منصة «دلنّي» العقارية اليمنية - Dalani Real Estate Platform
 * موزع الأحداث المركزي للنظام المترابط (Central In-Memory Event Dispatcher)
 * يتيح التواصل وفصل التبعيات المباشرة بين الأنظمة الستة
 */

export type EventHandler<T = any> = (payload: T) => void | Promise<void>;

export interface DalaniEvent<T = any> {
  type: string;
  payload: T;
  timestamp: string;
  emitterModule?: string;
}

class DalaniEventBus {
  private handlers: Map<string, Set<EventHandler>> = new Map();

  /**
   * تسجيل مستمع لحدث معين
   */
  subscribe<T = any>(eventType: string, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);

    // دالة إلغاء الاشتراك
    return () => {
      const set = this.handlers.get(eventType);
      if (set) {
        set.delete(handler);
        if (set.size === 0) {
          this.handlers.delete(eventType);
        }
      }
    };
  }

  /**
   * إطلاق حدث وتمريره لكافة الأنظمة المستمعة
   */
  async publish<T = any>(eventType: string, payload: T, emitterModule?: string): Promise<void> {
    const event: DalaniEvent<T> = {
      type: eventType,
      payload,
      timestamp: new Date().toISOString(),
      emitterModule
    };

    const listeners = this.handlers.get(eventType);
    if (!listeners || listeners.size === 0) return;

    const executions = Array.from(listeners).map(async (fn) => {
      try {
        await fn(event.payload);
      } catch (err) {
        console.warn(`[DalaniEventBus] Error in handler for event "${eventType}":`, err);
      }
    });

    await Promise.allSettled(executions);
  }

  /**
   * تفريغ جميع الاشتراكات (مفيد للاختبارات)
   */
  clear(): void {
    this.handlers.clear();
  }

  /**
   * بديل لدعم واجهات Event Emitter
   */
  emit<T = any>(eventType: string, payload: T, emitterModule?: string): Promise<void> {
    return this.publish(eventType, payload, emitterModule);
  }
}

export const eventBus = new DalaniEventBus();

/**
 * أسماء الأحداث المركزية الموحدة بين الأنظمة الستة
 */
export const DALANI_EVENTS = {
  // Identity & Parties
  USER_LOGGED_IN: 'identity:user_logged_in',
  USER_LOGGED_OUT: 'identity:user_logged_out',
  USER_UPDATED: 'identity:user_updated',
  ORG_MEMBER_ADDED: 'identity:org_member_added',

  // Property Assets
  ASSET_CREATED: 'assets:property_created',
  ASSET_VERIFIED: 'assets:property_verified',
  ASSET_OWNERSHIP_UPDATED: 'assets:ownership_updated',

  // Marketplace
  LISTING_PUBLISHED: 'marketplace:listing_published',
  LISTING_STATUS_CHANGED: 'marketplace:listing_status_changed',
  FAVORITE_TOGGLED: 'marketplace:favorite_toggled',

  // Operations & Transactions
  REQUEST_SUBMITTED: 'operations:request_submitted',
  REQUEST_CREATED: 'operations:request_created',
  BOOKING_CONFIRMED: 'operations:booking_confirmed',
  BOOKING_EXPIRED: 'operations:booking_expired',
  DEAL_STAGE_UPDATED: 'operations:deal_stage_updated',
  DEAL_COMPLETED: 'operations:deal_completed',

  // Contracts & Finance
  CONTRACT_GENERATED: 'contracts:contract_generated',
  CONTRACT_APPROVED: 'contracts:contract_approved',
  CONTRACT_SIGNED: 'contracts:contract_signed',
  DEAL_FINANCIALLY_CLEARED: 'contracts:financial_cleared',

  // Governance & Administration
  AUDIT_LOG_RECORDED: 'governance:audit_log_recorded',
  IP_BLOCKED: 'governance:ip_blocked',
  REPORT_SUBMITTED: 'governance:report_submitted',
  SUPPORT_TICKET_OPENED: 'governance:ticket_opened'
} as const;
