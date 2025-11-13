import { createApiClient } from '@/lib/supabase/api'
import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'edge';

export async function POST(request: NextRequest) {
  const supabase = createApiClient(request)

  const { error } = await supabase.auth.signOut()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const response = NextResponse.json({ success: true }, { status: 200 })

  const cookiesToClear = [
    'sb-access-token',
    'sb-refresh-token',
    'selectedCompanyId',
  ]

  cookiesToClear.forEach((cookieName) => {
    response.cookies.delete(cookieName)
    response.cookies.set(cookieName, '', {
      path: '/',
      expires: new Date(0),
      maxAge: 0,
      sameSite: 'lax',
      secure: true,
      httpOnly: true,
    })
  })

  return response
}
