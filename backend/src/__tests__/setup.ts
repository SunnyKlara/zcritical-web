/**
 * Vitest global setup — spins up an in-memory MongoDB before tests
 * and tears it down after. Allows integration tests to run real DB ops
 * without requiring a local Mongo instance.
 */
import { afterAll, beforeAll, beforeEach } from 'vitest'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'

let mongoServer: MongoMemoryServer

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create()
  const uri = mongoServer.getUri()
  await mongoose.connect(uri)
})

beforeEach(async () => {
  // Clean all collections between tests for isolation
  if (mongoose.connection.readyState === 1) {
    const collections = mongoose.connection.collections
    for (const name in collections) {
      await collections[name]?.deleteMany({})
    }
  }
})

afterAll(async () => {
  await mongoose.disconnect()
  await mongoServer?.stop()
})
