import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Fantasy Football Player Stats',
  description: 'Fantasy football player statistics and prop analysis',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50">
        {children}
      </body>
    </html>
  )
}