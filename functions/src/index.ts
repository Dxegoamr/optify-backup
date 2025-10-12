import { setGlobalOptions } from "firebase-functions";
import { initSentry } from "./observability/sentry";

// Inicializar Sentry antes de qualquer coisa
initSentry();

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({ maxInstances: 10 });

// Export Mercado Pago functions (legacy)
export { createPaymentPreference, checkPaymentStatus } from './mercadopago';

// Export new secure webhook
export { mercadoPagoWebhook, reconcilePayments } from './webhooks/mercado-pago';

// Export Security functions
export { setAdminClaim, verifyAdminStatus, listAdmins } from './security/claims';

// Export Stats aggregations
export { 
  onTransactionCreated, 
  onTransactionUpdated, 
  onUserUpdated,
  recalculateStatsDaily,
  recalculateStatsWeekly 
} from './stats/aggregations';

// Export Auth functions
export { deleteUserCompletely, canDeleteUser } from './auth/delete-user';

// Export Scheduled cleanup functions
export { 
  cleanupRateLimits,
  cleanupAbuseLogs,
  cleanupBlacklist,
  cleanupWebhookEvents,
  cleanupIdempotency
} from './scheduled/cleanup';

// Export LGPD functions
export { exportUserData, cleanupOldExports } from './lgpd/export-user-data';
