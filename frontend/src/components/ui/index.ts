/**
 * UI primitives barrel export.
 *
 * Import from here:
 *   import { Button, Card, Input } from "@/components/ui";
 *
 * These are deliberately thin — they encode brand styling so feature code
 * doesn't repeat Tailwind class strings. New components live next to this
 * file, then are added to this barrel.
 */
export { Button } from './Button'
export { Card, CardHeader, CardContent, CardFooter } from './Card'
export { Input, Textarea } from './Input'
export { Badge } from './Badge'
