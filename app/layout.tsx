import "./globals.css";

export const metadata = {
  title: "Xpenses",
  description: "Gestión de gastos personales",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
