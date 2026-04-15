import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://zrgradbxdkceozheiogy.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_jnl_RuIfuu9FpXqfZhRILw_yxYuD1af'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export async function apiCall(endpoint, options = {}) {
  const session = (await supabase.auth.getSession()).data.session
  const headers = {
    'Content-Type': 'application/json',
    ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
    ...(options.headers || {}),
  }
  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }))
    throw new Error(err.detail || 'API error')
  }
  return res
}

export async function apiJSON(endpoint, options = {}) {
  const res = await apiCall(endpoint, options)
  return res.json()
}
