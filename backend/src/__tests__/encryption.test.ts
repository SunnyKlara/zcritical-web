/**
 * Verifies the encrypted-fields plugin actually persists ciphertext
 * and that hydrated documents transparently expose plaintext.
 */
import { describe, it, expect } from 'vitest'
import mongoose from 'mongoose'
import { LeadModel } from '../models/Lead.model'
import { OrderModel } from '../models/Order.model'
import { decryptLeanOne } from '../db/encrypted-fields.plugin'
import { emailBlindIndex } from '../lib/crypto'

describe('encrypted-fields plugin — Lead', () => {
  it('writes ciphertext to disk but exposes plaintext through Mongoose', async () => {
    const lead = await LeadModel.create({
      name: 'Alice',
      email: 'alice@example.com',
      message: 'hi there',
      phone: '555-0100',
    })

    // Hydrated doc reads as plaintext.
    expect(lead.email).toBe('alice@example.com')
    expect(lead.name).toBe('Alice')

    // Raw collection read sees ciphertext + emailHash.
    const raw = await mongoose.connection.collection('leads').findOne({ _id: lead._id })
    expect(raw?.email).toMatch(/^v1:/)
    expect(raw?.name).toMatch(/^v1:/)
    expect(raw?.phone).toMatch(/^v1:/)
    expect(raw?.message).toMatch(/^v1:/)
    expect(raw?.emailHash).toBe(emailBlindIndex('lead.email', 'alice@example.com'))

    // findById hydrated read returns plaintext.
    const found = await LeadModel.findById(lead._id)
    expect(found?.email).toBe('alice@example.com')

    // .lean() returns ciphertext; decryptLeanOne restores plaintext.
    const lean = await LeadModel.findById(lead._id).lean()
    expect(lean?.email).toMatch(/^v1:/)
    const decrypted = decryptLeanOne(['name', 'email', 'phone', 'message'], lean)
    expect(decrypted?.email).toBe('alice@example.com')
  })

  it('finds an order by email via blind index even though email is encrypted', async () => {
    const order = await OrderModel.create({
      orderNo: 'TEST-1001',
      email: 'buyer@example.com',
      status: 'paid',
      items: [
        {
          productId: new mongoose.Types.ObjectId(),
          sku: 'CR-V1-BLACK',
          name: 'Critical V1',
          price: 29900,
          quantity: 1,
          image: '/img.jpg',
        },
      ],
      subtotal: 29900,
      shipping: 0,
      total: 29900,
      shippingAddress: {
        fullName: 'Bob Smith',
        line1: '1 Infinite Loop',
        city: 'Cupertino',
        state: 'CA',
        postalCode: '95014',
        country: 'US',
      },
      payment: { method: 'paypal' },
    })

    // Found via blind index.
    const found = await OrderModel.findOne({
      orderNo: 'TEST-1001',
      emailHash: emailBlindIndex('order.email', 'buyer@example.com'),
    })
    expect(found?.email).toBe('buyer@example.com')
    expect(found?.shippingAddress.fullName).toBe('Bob Smith')

    // Raw row stores ciphertext on PII fields.
    const raw = await mongoose.connection.collection('orders').findOne({ _id: order._id })
    expect(raw?.email).toMatch(/^v1:/)
    expect((raw?.shippingAddress as { fullName: string })?.fullName).toMatch(/^v1:/)
    expect((raw?.shippingAddress as { line1: string })?.line1).toMatch(/^v1:/)
    // city is intentionally NOT encrypted (used for tax/region clarity).
    expect((raw?.shippingAddress as { city: string })?.city).toBe('Cupertino')
  })

  it('save() leaves the in-memory doc readable as plaintext for downstream code', async () => {
    const order = await OrderModel.create({
      orderNo: 'TEST-1002',
      email: 'buyer2@example.com',
      status: 'pending_payment',
      items: [
        {
          productId: new mongoose.Types.ObjectId(),
          sku: 'CR-V1',
          name: 'X',
          price: 100,
          quantity: 1,
          image: '/x.jpg',
        },
      ],
      subtotal: 100,
      shipping: 0,
      total: 100,
      shippingAddress: {
        fullName: 'Carol',
        line1: 'Road 1',
        city: 'Tokyo',
        state: 'TK',
        postalCode: '100-0001',
        country: 'JP',
      },
      payment: { method: 'paypal' },
    })

    // Critical: post-save restoration leaves plaintext on the doc so the
    // mailer / audit / response paths can keep using order.email.
    expect(order.email).toBe('buyer2@example.com')
    expect(order.shippingAddress.fullName).toBe('Carol')
  })
})
