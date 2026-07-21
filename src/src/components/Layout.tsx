import type { ReactNode } from 'react'
import Sidebar from './Sidebar'
import Footer from './Footer'

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content entra-suave" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <div style={{ flex: 1 }}>{children}</div>
        <Footer />
      </main>
    </div>
  )
}
