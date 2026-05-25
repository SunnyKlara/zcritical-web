/** Message content size limit (chars). */
export const MESSAGE_MAX_LENGTH = 2000

/** Chat history page size. */
export const CHAT_HISTORY_PAGE_SIZE = 50

/** Session id stored in visitor localStorage. */
export const VISITOR_SESSION_KEY = 'critical:chat_session'

/** Admin JWT stored in admin localStorage. */
export const ADMIN_TOKEN_KEY = 'critical:admin_token'

/** User roles. */
export const USER_ROLES = ['admin', 'agent'] as const
export type UserRole = (typeof USER_ROLES)[number]

/** Message sender kinds. */
export const MESSAGE_SENDERS = ['visitor', 'admin', 'system'] as const
export type MessageSender = (typeof MESSAGE_SENDERS)[number]

/** Session statuses. */
export const SESSION_STATUSES = ['open', 'closed'] as const
export type SessionStatus = (typeof SESSION_STATUSES)[number]

// ============================================================================
// Commerce constants (M4)
// ============================================================================

/** Product statuses. */
export const PRODUCT_STATUSES = ['active', 'draft', 'archived'] as const
export type ProductStatus = (typeof PRODUCT_STATUSES)[number]

/** Order statuses. */
export const ORDER_STATUSES = [
  'pending_payment',
  'paid',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

/** Payment event types. */
export const PAYMENT_EVENTS = [
  'created',
  'approved',
  'captured',
  'refunded',
  'disputed',
  'error',
] as const
export type PaymentEventType = (typeof PAYMENT_EVENTS)[number]

/** Payment methods. */
export const PAYMENT_METHODS = ['paypal'] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

/** Supported shipping countries (ISO 3166-1 alpha-2). */
export const SHIPPING_COUNTRIES = [
  'US',
  'CA',
  'GB',
  'DE',
  'FR',
  'IT',
  'ES',
  'NL',
  'JP',
  'KR',
  'AU',
  'NZ',
  'SG',
] as const
export type ShippingCountry = (typeof SHIPPING_COUNTRIES)[number]

// ============================================================================
// Critical-specific constants (M5/M6)
// ============================================================================

/** Firmware release channels. */
export const FIRMWARE_CHANNELS = ['stable', 'beta', 'dev'] as const
export type FirmwareChannel = (typeof FIRMWARE_CHANNELS)[number]

/** Firmware statuses. */
export const FIRMWARE_STATUSES = ['draft', 'published', 'archived'] as const
export type FirmwareStatus = (typeof FIRMWARE_STATUSES)[number]

/** Critical hardware versions. */
export const HARDWARE_VERSIONS = ['v1.0', 'v1.1'] as const
export type HardwareVersion = (typeof HARDWARE_VERSIONS)[number]
