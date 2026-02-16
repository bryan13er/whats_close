import "./globals.css";

export const metadata = {
  title: "whats_close",
  description: "",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
