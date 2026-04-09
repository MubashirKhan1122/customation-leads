import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400 mb-4">404</h1>
        <p className="text-gray-400 text-lg mb-6">Page not found</p>
        <Link href="/dashboard" className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-medium px-6 py-2.5 rounded-lg transition-all">
          Go to Dashboard
        </Link>
      </div>
    </div>
  )
}
