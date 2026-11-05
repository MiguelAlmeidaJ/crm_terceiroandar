import type { Metadata } from 'next';
import './globals.css';
import './auth.css';

export const metadata: Metadata = {
  title: 'Terceiro Andar | CRM',
  description: 'Painel de gestão Terceiro Andar',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
