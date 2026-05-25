import type { NextFunction, Request, Response } from 'express'
import type { ZodSchema } from 'zod'

/** Validates request.body with a Zod schema, replacing it with the parsed (typed) value. */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      res.status(400).json({ error: 'Validation failed', details: result.error.flatten() })
      return
    }
    req.body = result.data
    next()
  }
}

/** Validates request.params, mutating it in place with parsed (typed) values. */
export function validateParams<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params)
    if (!result.success) {
      res.status(400).json({ error: 'Invalid path params', details: result.error.flatten() })
      return
    }
    Object.assign(req.params, result.data)
    next()
  }
}
