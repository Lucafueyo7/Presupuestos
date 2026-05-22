import type { Metadata } from 'next'
import {
  Instrument_Sans,
  Instrument_Serif,
  JetBrains_Mono,
  Space_Grotesk,
} from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

const instrumentSans = Instrument_Sans({
  subsets: ['latin'],
  variable: '--font-instrument-sans',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  variable: '--font-instrument-serif',
  style: ['normal', 'italic'],
  weight: '400',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  weight: ['400', '500', '600'],
  display: 'swap',
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Presupuestos — FyF Construcciones',
  description: 'Generador de presupuestos para FyF Construcciones',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider afterSignOutUrl="/">

      <html
        lang="es"
        data-theme="light"
        data-preset="minimal"
        data-density="comodo"
        className={[
          instrumentSans.variable,
          instrumentSerif.variable,
          jetbrainsMono.variable,
          spaceGrotesk.variable,
        ].join(' ')}
      >
        <body>{children}</body>
      </html>
    </ClerkProvider>
  )
}
