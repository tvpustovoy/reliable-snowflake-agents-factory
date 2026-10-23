// Purpose: root layout for the Firn dashboard (Snowflake App Runtime variant).
// Inputs: none. Outputs: HTML shell with base styles. Run: `npm run dev`.
export const metadata = { title: "Firn: Business Map" };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0, background: "#f6f8fb", color: "#1b2330" }}>
        {children}
      </body>
    </html>
  );
}
