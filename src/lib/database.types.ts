// Généré depuis Supabase (generate_typescript_types), puis réduit à l'essentiel.

type Rel = {
  foreignKeyName: string
  columns: string[]
  isOneToOne: boolean
  referencedRelation: string
  referencedColumns: string[]
}

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.18'
  }
  public: {
    Tables: {
      challenge_members: {
        Row: { challenge_id: string; joined_at: string; user_id: string }
        Insert: { challenge_id: string; joined_at?: string; user_id: string }
        Update: { challenge_id?: string; joined_at?: string; user_id?: string }
        Relationships: [
          { foreignKeyName: 'challenge_members_challenge_id_fkey'; columns: ['challenge_id']; isOneToOne: false; referencedRelation: 'challenges'; referencedColumns: ['id'] },
          { foreignKeyName: 'challenge_members_user_id_fkey'; columns: ['user_id']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] },
        ]
      }
      challenges: {
        Row: { created_at: string; created_by: string; end_date: string; id: string; invite_code: string; name: string; stake: string | null }
        Insert: { created_at?: string; created_by: string; end_date: string; id?: string; invite_code: string; name: string; stake?: string | null }
        Update: { created_at?: string; created_by?: string; end_date?: string; id?: string; invite_code?: string; name?: string; stake?: string | null }
        Relationships: [
          { foreignKeyName: 'challenges_created_by_fkey'; columns: ['created_by']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] },
        ]
      }
      goal_reviews: {
        Row: { comment: string | null; created_at: string; goal_id: string; reviewer_id: string; verdict: string }
        Insert: { comment?: string | null; created_at?: string; goal_id: string; reviewer_id: string; verdict: string }
        Update: { comment?: string | null; created_at?: string; goal_id?: string; reviewer_id?: string; verdict?: string }
        Relationships: [
          { foreignKeyName: 'goal_reviews_goal_id_fkey'; columns: ['goal_id']; isOneToOne: false; referencedRelation: 'goals'; referencedColumns: ['id'] },
          { foreignKeyName: 'goal_reviews_reviewer_id_fkey'; columns: ['reviewer_id']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] },
        ]
      }
      goals: {
        Row: { challenge_id: string; id: string; target_value: string | null; title: string; unit: string | null; updated_at: string; user_id: string }
        Insert: { challenge_id: string; id?: string; target_value?: string | null; title: string; unit?: string | null; updated_at?: string; user_id: string }
        Update: { challenge_id?: string; id?: string; target_value?: string | null; title?: string; unit?: string | null; updated_at?: string; user_id?: string }
        Relationships: [
          { foreignKeyName: 'goals_challenge_id_fkey'; columns: ['challenge_id']; isOneToOne: false; referencedRelation: 'challenges'; referencedColumns: ['id'] },
          { foreignKeyName: 'goals_user_id_fkey'; columns: ['user_id']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] },
        ]
      }
      profiles: {
        Row: { created_at: string; display_name: string; id: string }
        Insert: { created_at?: string; display_name: string; id: string }
        Update: { created_at?: string; display_name?: string; id?: string }
        Relationships: Rel[]
      }
      proofs: {
        Row: { challenge_id: string; created_at: string; note: string | null; photo_path: string | null; user_id: string }
        Insert: { challenge_id: string; created_at?: string; note?: string | null; photo_path?: string | null; user_id: string }
        Update: { challenge_id?: string; created_at?: string; note?: string | null; photo_path?: string | null; user_id?: string }
        Relationships: Rel[]
      }
      training_sessions: {
        Row: { challenge_id: string; created_at: string; done_on: string; duration_min: number | null; id: string; kind: string | null; note: string | null; photo_path: string | null; user_id: string; value: number | null }
        Insert: { challenge_id: string; created_at?: string; done_on?: string; duration_min?: number | null; id?: string; kind?: string | null; note?: string | null; photo_path?: string | null; user_id: string; value?: number | null }
        Update: { challenge_id?: string; created_at?: string; done_on?: string; duration_min?: number | null; id?: string; kind?: string | null; note?: string | null; photo_path?: string | null; user_id?: string; value?: number | null }
        Relationships: Rel[]
      }
      votes: {
        Row: { challenge_id: string; created_at: string; target_id: string; verdict: string; voter_id: string }
        Insert: { challenge_id: string; created_at?: string; target_id: string; verdict: string; voter_id: string }
        Update: { challenge_id?: string; created_at?: string; target_id?: string; verdict?: string; voter_id?: string }
        Relationships: Rel[]
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      create_challenge: { Args: { p_end_date: string; p_name: string; p_stake: string }; Returns: string }
      get_invite: {
        Args: { p_code: string }
        Returns: { creator_name: string; end_date: string; id: string; member_count: number; name: string; stake: string | null }[]
      }
      join_challenge: { Args: { p_code: string }; Returns: string }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
