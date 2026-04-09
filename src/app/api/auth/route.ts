import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()

  if (email === 'admin@customation.com' && password === 'admin123') {
    const response = NextResponse.json({ success: true })
    response.cookies.set('auth_token', 'authenticated', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })
    return response
  }

  return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 })
}
