import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types based on your schema
export interface User {
  id: string
  fid: number
  username?: string
  display_name?: string
  avatar_url?: string
  custody_address?: string
  verification_addresses?: string[]
  created_at: string
  updated_at: string
}

export interface SavedCast {
  id: string
  user_id: string
  cast_hash: string
  cast_author_fid: number
  cast_author_username?: string
  cast_author_display_name?: string
  cast_author_avatar_url?: string
  cast_text?: string
  cast_embeds?: any[]
  cast_mentions?: any[]
  cast_parent_hash?: string
  cast_parent_url?: string
  cast_timestamp?: string
  cast_replies_count: number
  cast_reactions_count: number
  cast_recasts_count: number
  saved_at: string
}

export interface Tag {
  id: string
  user_id: string
  name: string
  color: string
  created_at: string
}

export interface Note {
  id: string
  saved_cast_id: string
  content: string
  created_at: string
  updated_at: string
}