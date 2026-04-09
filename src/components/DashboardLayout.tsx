import Sidebar from './Sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <Sidebar />
      <main className="lg:ml-64 p-4 lg:p-8 pt-16 lg:pt-8">{children}</main>
    </div>
  )
}
