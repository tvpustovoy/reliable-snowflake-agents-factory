// Purpose: root layout for the Firn dashboard (Snowflake App Runtime variant).
// Inputs: none. Outputs: HTML shell with shared styles (app/firn.css). Run: `npm run dev`.
import "./firn.css";
import { LOGO } from "../lib/firn/logo.js";

export const metadata = { title: "Firn Trust Dashboard", icons: { icon: LOGO } };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
