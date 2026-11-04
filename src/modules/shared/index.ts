/**
 * Shared Platform Infrastructure & UI Services
 * 
 * Responsibilities:
 * - Common responsive navigation bars & layout framing.
 * - Central Event Dispatcher (eventBus) for decoupled inter-subsystem messaging.
 * - AI Assistant modal & conversational guidance.
 * - Database health & connectivity diagnostic tools.
 * - Route guards and role protection.
 */

export { Navbar } from '../../components/Navbar';
export { Footer } from '../../components/Footer';
export { BottomNavBar } from '../../components/BottomNavBar';
export { DalaniLogo } from '../../components/DalaniLogo';
export { DalaniAiAssistantModal } from '../../components/DalaniAiAssistantModal';
export { SupabaseConnectionModal } from '../../components/SupabaseConnectionModal';
export { ProtectedRoute } from '../../components/ProtectedRoute';
export { eventBus, DALANI_EVENTS } from '../../core/events/eventBus';
