import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import CDPProvider from "./components/CDPProvider/CDPProvider";
import ErrorBoundary from "./components/ErrorBoundary/ErrorBoundary";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Move4Good",
  description: "Support charities with your Strava activities",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <ErrorBoundary>
          <CDPProvider>
            {children}
          </CDPProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
