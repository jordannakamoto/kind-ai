import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/supabase/middleware'


export async function middleware(request: NextRequest) {
  const response = await updateSession(request)
  return response
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/dashboard/:path*',
  ],
}