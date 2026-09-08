import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/lib/types'

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    // Sem env vars configuradas (preview sem Supabase)
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        // Em produção, nunca permite bypass em rotas privadas /app
        if (process.env.NODE_ENV === 'production' && request.nextUrl.pathname.startsWith('/app')) {
            const url = request.nextUrl.clone()
            url.pathname = '/auth/login'
            return NextResponse.redirect(url)
        }
        return supabaseResponse
    }

    try {
        const supabase = createServerClient<Database>(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            {
                cookies: {
                    getAll() {
                        return request.cookies.getAll()
                    },
                    setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
                        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                        supabaseResponse = NextResponse.next({
                            request,
                        })
                        cookiesToSet.forEach(({ name, value, options }) =>
                            supabaseResponse.cookies.set(name, value, options)
                        )
                    },
                },
            }
        )

        const { data: user } = await supabase.auth.getUser()
        if (
            (!user || !user.user) && request.nextUrl.pathname.startsWith('/app')
        ) {
            const url = request.nextUrl.clone()
            url.pathname = '/auth/login'
            const returnTo = request.nextUrl.pathname + request.nextUrl.search
            url.search = `?redirect=${encodeURIComponent(returnTo)}`
            return NextResponse.redirect(url)
        }
    } catch (error) {
        console.error('[Middleware] Supabase session check error:', error)
        // Redireciona para login em rotas privadas se houver falha na verificação de sessão
        if (request.nextUrl.pathname.startsWith('/app')) {
            const url = request.nextUrl.clone()
            url.pathname = '/auth/login'
            return NextResponse.redirect(url)
        }
    }

    return supabaseResponse
}