import type { Metadata } from 'next'
import './globals.css'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
    title: '熊本市民吹奏楽団 | Kumamoto Citizen\'s Wind Orchestra',
    description: '熊本市民吹奏楽団の公式ホームページです。「音楽の都・熊本」を象徴する市民楽団として、定期演奏会や地域イベントなどで活動しています。',
    keywords: '熊本, 吹奏楽, 市民吹奏楽団, オーケストラ, 音楽, 演奏会',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="ja">
            <body className="font-sans antialiased text-slate-900 bg-slate-50">
                <Header />
                <main className="min-h-screen">
                    {children}
                </main>
                <Footer />
            </body>
        </html>
    )
}
