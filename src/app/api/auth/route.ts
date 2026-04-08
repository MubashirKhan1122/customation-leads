import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()

  // Simple auth - in production, use Supabase Auth
  if (email === 'admin@customation.com' && password === 'admin123') {
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 })
}
