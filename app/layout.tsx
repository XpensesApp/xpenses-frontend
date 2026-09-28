import "./globals.css";
import { SessionProvider } from "next-auth/react";
import { auth } from "@/auth";
import { Navbar } from "@/components/Navbar";
import { SessionWatcher } from "@/components/SessionWatcher";

export const metadata = {
  title: "Xpenses",
  description: "Gestión de gastos personales",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

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
        <SessionProvider session={session}>
          <SessionWatcher />
          <Navbar />
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
