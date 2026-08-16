import { Cormorant_Garamond, Albert_Sans } from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
});

const albert = Albert_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-albert",
});

export const metadata = {
  title: "Pilates Studio — Üye ve Paket Yönetimi",
  description: "Güray ve Nuray için üye ve paket yönetim paneli.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr" className={`${cormorant.variable} ${albert.variable}`}>
      <body>{children}</body>
    </html>
  );
}
