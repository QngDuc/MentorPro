import type { Metadata } from "next";
import { ReactNode } from "react";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "MentorPro Nexus Intelligence",
  description: "Strategic career intelligence workspace",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <head />
      <body>
        {children}
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
