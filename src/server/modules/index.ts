import { Express } from 'express';
import { identityRouter } from './identityRoutes';
import { propertyAssetsRouter } from './propertyAssetsRoutes';
import { marketplaceRouter } from './marketplaceRoutes';
import { operationsRouter } from './operationsRoutes';
import { contractsRouter } from './contractsRoutes';
import { governanceRouter } from './governanceRoutes';
import { sharedRouter } from './sharedRoutes';

/**
 * Register all 6 Subsystem routers and Shared Services onto the Express application.
 * Preserves 100% of existing endpoints with exact contract paths.
 */
export function registerModularRoutes(app: Express): void {
  // 1. Identity & Parties Management
  app.use(identityRouter);

  // 2. Property Assets Management
  app.use(propertyAssetsRouter);

  // 3. Real Estate Marketplace
  app.use(marketplaceRouter);

  // 4. Real Estate Operations & Transactions
  app.use(operationsRouter);

  // 5. Contracts & Financial Transactions
  app.use(contractsRouter);

  // 6. Platform Administration & Governance
  app.use(governanceRouter);

  // 7. Shared Services (AI Assistant, Healthcheck/Ping)
  app.use(sharedRouter);
}

export {
  identityRouter,
  propertyAssetsRouter,
  marketplaceRouter,
  operationsRouter,
  contractsRouter,
  governanceRouter,
  sharedRouter
};
