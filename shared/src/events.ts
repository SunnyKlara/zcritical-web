/**
 * Socket.io event name registry.
 * Single source of truth shared by frontend and backend to prevent drift.
 */
export const SOCKET_EVENTS = {
  // Client → Server
  VISITOR_JOIN: 'visitor:join',
  VISITOR_MESSAGE: 'visitor:message',
  VISITOR_TYPING: 'visitor:typing',
  ADMIN_JOIN: 'admin:join',
  ADMIN_MESSAGE: 'admin:message',
  ADMIN_TYPING: 'admin:typing',
  ADMIN_READ: 'admin:read',
  VISITOR_READ: 'visitor:read',
  SESSION_CLOSE: 'session:close',
  SESSION_REOPEN: 'session:reopen',

  // Server → Client
  MESSAGE: 'message',
  NEW_MESSAGE: 'new_message',
  SESSION_UPDATED: 'session:updated',
  TYPING: 'typing',
  READ_RECEIPT: 'read_receipt',
  AUTH_ERROR: 'auth_error',
  RATE_LIMITED: 'rate_limited',
  ERROR: 'error',
} as const

export type SocketEvent = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS]
