import { Inter } from 'next/font/google'; //
import "./globals.css";
import { StyledEngineProvider } from '@mui/material/styles';

// Initialize Inter and link it to the CSS variable name
const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter', // This links to var(--font-inter) in your CSS
  display: 'swap', 
});

export const metadata = {
  title: "whats_close",
  description: "",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <StyledEngineProvider injectFirst> 
        <body className={inter.className}>{children}</body>
      </StyledEngineProvider>
    </html>
  );
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,    //
  userScalable: false, 
};