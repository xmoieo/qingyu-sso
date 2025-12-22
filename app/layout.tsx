import type { Metadata } from 'next';
import { ThemeProvider } from '@/components/providers';
import './globals.css';

export const metadata: Metadata = {
  title: '统一身份认证平台',
  description: 'SSO统一身份认证平台 - 兼容OAuth2.0和OIDC',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
