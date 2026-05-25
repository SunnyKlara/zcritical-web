import type { AccessTokenPayload, VisitorSessionPayload } from '@critical/shared'

/** Per-socket data attached on connection by the auth middleware. */
export interface SocketData {
  admin?: AccessTokenPayload
  visitor?: VisitorSessionPayload
}
