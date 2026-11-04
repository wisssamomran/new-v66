/**
 * Master Subsystems Hub for Dalani Modular Monolith Platform
 * 
 * Provides unified access to all 6 independent subsystems:
 * 1. Identity & Parties Management
 * 2. Property Assets Management
 * 3. Real Estate Marketplace
 * 4. Real Estate Operations & Transactions
 * 5. Contracts & Financial Transactions
 * 6. Platform Administration & Governance
 * 
 * Along with Shared UI and Central Events Infrastructure.
 */

export * as IdentityPartiesModule from './identity-parties';
export * as PropertyAssetsModule from './property-assets';
export * as MarketplaceModule from './marketplace';
export * as OperationsModule from './real-estate-operations';
export * as ContractsFinanceModule from './contracts-finance';
export * as GovernanceModule from './platform-governance';
export * as SharedModule from './shared';

// Typed public contracts
export * from '../core/contracts';

// Central Event Dispatcher
export { eventBus, DALANI_EVENTS } from '../core/events/eventBus';
