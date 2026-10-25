import "./globals.css";
import { ConfigureAmplify } from "@/components/ConfigureAmplify";
import { Navbar } from "@/components/Navbar";
import { SessionWatcher } from "@/components/SessionWatcher";

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
        <ConfigureAmplify />
        <SessionWatcher />
        <Navbar />
        {children}
      </body>
    </html>
  );
}
