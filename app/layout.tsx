import type { Metadata } from "next"
import "./globals.css"
import ToastContainer from "@/components/ui/toast"

export const metadata: Metadata = {
  title: "StrikeFlow — Options Strategy Analytics",
  description: "Advanced Options Strategy Builder and Analytics Platform",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
        {children}
        <ToastContainer />
      </body>
    </html>
  )
}
