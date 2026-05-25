import type { Metadata } from 'next'
import { AuthProvider } from '@/lib/auth-context'

export const metadata: Metadata = {
  title: 'Admin · Critical',
  robots: { index: false, follow: false },
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}
