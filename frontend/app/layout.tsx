import type { Metadata } from "next";
import { ReactNode } from "react";
import Script from "next/script";
import "./globals.css";

import { AuthProvider } from "@/context/AuthContext";

export const metadata: Metadata = {
  title: "MentorPro Nexus Intelligence",
  description: "Strategic career intelligence workspace",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <head />
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>

        <Script
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var html=document.documentElement; if(html&&html.hasAttribute('webcrx')) html.removeAttribute('webcrx');}catch(e){}})();`,
          }}
        />
      </body>
    </html>
  );
}
