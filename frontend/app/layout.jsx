import "./globals.css";
import { StyledEngineProvider } from '@mui/material/styles';



export const metadata = {
  title: "whats_close",
  description: "",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <StyledEngineProvider injectFirst> 
        <body>{children}</body>
      </StyledEngineProvider>
    </html>
  );
}
