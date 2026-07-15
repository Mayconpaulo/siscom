import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
const inter=Inter({subsets:["latin"],display:"swap"});
export const metadata: Metadata={title:{default:"SISCOM",template:"%s | SISCOM"},description:"Sistema Integrado da Seção de Comunicação Social",manifest:"/manifest.webmanifest",appleWebApp:{capable:true,statusBarStyle:"black-translucent",title:"SISCOM"}};
export const viewport: Viewport={themeColor:"#073b2a",width:"device-width",initialScale:1,viewportFit:"cover"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><body className={inter.className}><ServiceWorkerRegister/>{children}</body></html>}
