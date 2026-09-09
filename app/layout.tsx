import "./globals.css";
import { Navbar } from "@/components/Navbar";

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
    <html lang="es" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var stored=localStorage.getItem("theme");var isDark=stored?stored==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;if(isDark)document.documentElement.classList.add("dark");}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <Navbar />
        {children}
      </body>
    </html>
  );
}
