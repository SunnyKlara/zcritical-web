import { Schema, model, type InferSchemaType } from 'mongoose'

const auditLogSchema = new Schema(
  {
    action: { type: String, required: true, index: true },
    actor: {
      type: { type: String, enum: ['admin', 'visitor', 'system'], default: 'system' },
      id: String,
      username: String,
    },
    target: { type: String },
    ip: { type: String },
    userAgent: { type: String },
    success: { type: Boolean, default: true, index: true },
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

auditLogSchema.index({ createdAt: -1 })
auditLogSchema.index({ 'actor.username': 1, createdAt: -1 })

export type AuditLogDoc = InferSchemaType<typeof auditLogSchema>
export const AuditLogModel = model('AuditLog', auditLogSchema)
