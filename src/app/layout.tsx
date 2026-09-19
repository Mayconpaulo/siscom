import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { ThemeProvider } from "@/components/theme-provider";
const inter=Inter({subsets:["latin"],display:"swap"});
export const metadata: Metadata={title:{default:"SISCOM",template:"%s | SISCOM"},description:"Sistema Integrado da Seção de Comunicação Social",manifest:"/manifest.webmanifest",appleWebApp:{capable:true,statusBarStyle:"black-translucent",title:"SISCOM"}};
export const viewport: Viewport={themeColor:"#073b2a",width:"device-width",initialScale:1,viewportFit:"cover"};
const themeScript = `(function(){try{var t=localStorage.getItem('siscom-theme')||'system';var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);document.documentElement.style.colorScheme=t==='system'?'light dark':t}catch(e){}})()`;
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="pt-BR" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:themeScript}} /></head><body className={inter.className}><ThemeProvider><ServiceWorkerRegister/>{children}</ThemeProvider></body></html>}
