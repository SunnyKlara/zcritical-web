import type { Server as IOServer, Socket, DefaultEventsMap } from 'socket.io'
import { z } from 'zod'
import { logger } from '../config/logger'
import { MessageModel } from '../models/Message.model'
import { SessionModel } from '../models/Session.model'
import { verifyAccessToken, verifyVisitorSession } from '../services/token.service'
import {
  SOCKET_EVENTS,
  VisitorMessagePayloadSchema,
  AdminMessagePayloadSchema,
  TypingPayloadSchema,
  type TypingBroadcast,
  type ReadReceipt,
} from '@critical/shared'
import type { SocketData } from './types'

const ADMIN_ROOM = 'admin_room'

type AppSocket = Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, SocketData>

/**
 * Connection-level authentication middleware.
 * A socket MUST present EITHER:
 *   - auth.adminToken   → admin JWT (joined to admin_room)
 *   - auth.sessionToken → visitor JWT (bound to its sessionId)
 * Anonymous connections are rejected.
 */
function authenticateSocket(socket: AppSocket, next: (err?: Error) => void): void {
  const auth = (socket.handshake.auth ?? {}) as {
    adminToken?: string
    sessionToken?: string
  }

  if (auth.adminToken) {
    try {
      socket.data.admin = verifyAccessToken(auth.adminToken)
      return next()
    } catch {
      return next(new Error('Invalid admin token'))
    }
  }

  if (auth.sessionToken) {
    try {
      socket.data.visitor = verifyVisitorSession(auth.sessionToken)
      return next()
    } catch {
      return next(new Error('Invalid visitor session token'))
    }
  }

  next(new Error('Authentication required'))
}

async function handleVisitorMessage(io: IOServer, socket: AppSocket, data: unknown): Promise<void> {
  if (!socket.data.visitor) return
  const parsed = VisitorMessagePayloadSchema.safeParse(data)
  if (!parsed.success) return
  const { sessionId, content, visitorInfo } = parsed.data

  // Critical: reject spoofed sessionId.
  if (sessionId !== socket.data.visitor.sessionId) {
    socket.emit(SOCKET_EVENTS.ERROR, 'sessionId does not match session token')
    return
  }

  try {
    const msg = await MessageModel.create({
      sessionId,
      sender: 'visitor',
      content,
      visitorInfo,
    })
    await SessionModel.updateOne(
      { sessionId },
      {
        $set: {
          lastMessage: content,
          lastMessageAt: new Date(),
          visitorInfo,
          status: 'open',
        },
        $inc: { unreadCount: 1 },
        $setOnInsert: { sessionId },
      },
      { upsert: true },
    )
    io.to(ADMIN_ROOM).emit(SOCKET_EVENTS.NEW_MESSAGE, msg)
    io.to(sessionId).emit(SOCKET_EVENTS.MESSAGE, msg)
  } catch (err) {
    logger.error({ err }, 'visitor_message failed')
  }
}

async function handleAdminMessage(io: IOServer, socket: AppSocket, data: unknown): Promise<void> {
  if (!socket.data.admin) return
  const parsed = AdminMessagePayloadSchema.safeParse(data)
  if (!parsed.success) return
  const { sessionId, content } = parsed.data
  try {
    const msg = await MessageModel.create({ sessionId, sender: 'admin', content })
    await SessionModel.updateOne(
      { sessionId },
      { $set: { lastMessage: content, lastMessageAt: new Date() } },
    )
    io.to(sessionId).emit(SOCKET_EVENTS.MESSAGE, msg)
    io.to(ADMIN_ROOM).emit(SOCKET_EVENTS.NEW_MESSAGE, msg)
  } catch (err) {
    logger.error({ err }, 'admin_message failed')
  }
}

export function registerSocketHandlers(io: IOServer): void {
  io.use((socket, next) => authenticateSocket(socket as AppSocket, next))

  io.on('connection', (socket: AppSocket) => {
    if (socket.data.admin) {
      logger.debug({ id: socket.id, user: socket.data.admin.username }, 'admin socket connected')
      void socket.join(ADMIN_ROOM)
    } else if (socket.data.visitor) {
      logger.debug(
        { id: socket.id, sessionId: socket.data.visitor.sessionId },
        'visitor socket connected',
      )
      void socket.join(socket.data.visitor.sessionId)
    }

    socket.on(SOCKET_EVENTS.VISITOR_MESSAGE, (data: unknown) => {
      void handleVisitorMessage(io, socket, data)
    })

    socket.on(SOCKET_EVENTS.ADMIN_MESSAGE, (data: unknown) => {
      void handleAdminMessage(io, socket, data)
    })

    socket.on(SOCKET_EVENTS.VISITOR_TYPING, (data: unknown) => {
      if (!socket.data.visitor) return
      const parsed = TypingPayloadSchema.safeParse(data)
      if (!parsed.success) return
      if (parsed.data.sessionId !== socket.data.visitor.sessionId) return
      const broadcast: TypingBroadcast = {
        sessionId: parsed.data.sessionId,
        from: 'visitor',
        isTyping: parsed.data.isTyping,
      }
      io.to(ADMIN_ROOM).emit(SOCKET_EVENTS.TYPING, broadcast)
    })

    socket.on(SOCKET_EVENTS.ADMIN_TYPING, (data: unknown) => {
      if (!socket.data.admin) return
      const parsed = TypingPayloadSchema.safeParse(data)
      if (!parsed.success) return
      const broadcast: TypingBroadcast = {
        sessionId: parsed.data.sessionId,
        from: 'admin',
        isTyping: parsed.data.isTyping,
      }
      io.to(parsed.data.sessionId).emit(SOCKET_EVENTS.TYPING, broadcast)
    })

    socket.on(SOCKET_EVENTS.VISITOR_READ, async (data: unknown) => {
      if (!socket.data.visitor) return
      const parsed = z.object({ sessionId: z.string().uuid() }).safeParse(data)
      if (!parsed.success) return
      if (parsed.data.sessionId !== socket.data.visitor.sessionId) return
      try {
        await MessageModel.updateMany(
          { sessionId: parsed.data.sessionId, sender: 'admin', read: false },
          { read: true },
        )
        const receipt: ReadReceipt = {
          sessionId: parsed.data.sessionId,
          by: 'visitor',
          at: new Date().toISOString(),
        }
        io.to(ADMIN_ROOM).emit(SOCKET_EVENTS.READ_RECEIPT, receipt)
      } catch (err) {
        logger.error({ err }, 'visitor_read failed')
      }
    })

    socket.on(SOCKET_EVENTS.ADMIN_READ, async (data: unknown) => {
      if (!socket.data.admin) return
      const parsed = z.object({ sessionId: z.string().uuid() }).safeParse(data)
      if (!parsed.success) return
      try {
        await MessageModel.updateMany(
          { sessionId: parsed.data.sessionId, sender: 'visitor', read: false },
          { read: true },
        )
        await SessionModel.updateOne({ sessionId: parsed.data.sessionId }, { unreadCount: 0 })
        const receipt: ReadReceipt = {
          sessionId: parsed.data.sessionId,
          by: 'admin',
          at: new Date().toISOString(),
        }
        io.to(parsed.data.sessionId).emit(SOCKET_EVENTS.READ_RECEIPT, receipt)
      } catch (err) {
        logger.error({ err }, 'admin_read failed')
      }
    })

    socket.on('disconnect', () => {
      logger.debug({ id: socket.id }, 'socket disconnected')
    })
  })
}
