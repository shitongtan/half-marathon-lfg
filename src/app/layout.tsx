import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Half Marathon LFG',
  description: 'Your AI-powered half marathon training companion',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0f0f0f] text-white">{children}</body>
    </html>
  )
}
