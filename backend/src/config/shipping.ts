/**
 * Fixed shipping rate table (V1).
 * Values in cents (USD). Update with actual carrier quotes from your fulfillment partner.
 */
export const SHIPPING_RATES: Record<string, number> = {
  // Americas
  US: 4500,
  CA: 5000,

  // Europe
  GB: 5500,
  DE: 5500,
  FR: 5500,
  IT: 5500,
  ES: 5500,
  NL: 5500,

  // Asia-Pacific
  JP: 4000,
  KR: 4000,
  AU: 6000,
  NZ: 6500,
  SG: 3500,

  // Fallback for any other ISO 3166-1 alpha-2 country code
  DEFAULT: 6500,
}

export function getShippingRate(countryCode: string): number {
  return SHIPPING_RATES[countryCode.toUpperCase()] ?? SHIPPING_RATES['DEFAULT']!
}
