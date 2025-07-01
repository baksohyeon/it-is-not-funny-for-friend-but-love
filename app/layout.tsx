import type React from "react"
import type { Metadata } from "next"
import { Suspense } from "react"
import "./globals.css"
import AnalyticsWrapper from "@/components/analytics-wrapper"

export const metadata: Metadata = {
  title: "v0 App",
  description: "Created with v0",
  generator: "v0.dev",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        {/* Google Analytics */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-R97CE8L8MZ"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-R97CE8L8MZ');
            `,
          }}
        />
      </head>
      <body>
        <Suspense fallback={null}>
          <AnalyticsWrapper />
        </Suspense>
        {children}
      </body>
    </html>
  )
}
