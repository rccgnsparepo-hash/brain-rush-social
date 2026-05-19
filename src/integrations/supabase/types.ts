export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      challenge_solves: {
        Row: {
          challenge_id: string
          correct: boolean
          created_at: string
          id: string
          time_taken_ms: number | null
          user_id: string
        }
        Insert: {
          challenge_id: string
          correct: boolean
          created_at?: string
          id?: string
          time_taken_ms?: number | null
          user_id: string
        }
        Update: {
          challenge_id?: string
          correct?: boolean
          created_at?: string
          id?: string
          time_taken_ms?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_solves_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_solves_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          answer: string
          created_at: string
          creator_id: string
          difficulty: Database["public"]["Enums"]["difficulty"]
          id: string
          options: string[]
          question: string
          reward_xp: number
          solved_count: number
          time_limit: number
        }
        Insert: {
          answer: string
          created_at?: string
          creator_id: string
          difficulty?: Database["public"]["Enums"]["difficulty"]
          id?: string
          options?: string[]
          question: string
          reward_xp?: number
          solved_count?: number
          time_limit?: number
        }
        Update: {
          answer?: string
          created_at?: string
          creator_id?: string
          difficulty?: Database["public"]["Enums"]["difficulty"]
          id?: string
          options?: string[]
          question?: string
          reward_xp?: number
          solved_count?: number
          time_limit?: number
        }
        Relationships: [
          {
            foreignKeyName: "challenges_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          content: string
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      duel_question_usage: {
        Row: {
          created_at: string
          duel_id: string
          question_id: string
          round_number: number
        }
        Insert: {
          created_at?: string
          duel_id: string
          question_id: string
          round_number: number
        }
        Update: {
          created_at?: string
          duel_id?: string
          question_id?: string
          round_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "duel_question_usage_duel_id_fkey"
            columns: ["duel_id"]
            isOneToOne: false
            referencedRelation: "duels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duel_question_usage_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "duel_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      duel_questions: {
        Row: {
          answer: string
          category: string
          created_at: string
          difficulty: Database["public"]["Enums"]["difficulty"]
          id: string
          options: string[]
          question: string
          used_count: number
        }
        Insert: {
          answer: string
          category?: string
          created_at?: string
          difficulty?: Database["public"]["Enums"]["difficulty"]
          id?: string
          options: string[]
          question: string
          used_count?: number
        }
        Update: {
          answer?: string
          category?: string
          created_at?: string
          difficulty?: Database["public"]["Enums"]["difficulty"]
          id?: string
          options?: string[]
          question?: string
          used_count?: number
        }
        Relationships: []
      }
      duel_queue: {
        Row: {
          joined_at: string
          user_id: string
        }
        Insert: {
          joined_at?: string
          user_id: string
        }
        Update: {
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "duel_queue_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      duel_rounds: {
        Row: {
          answer: string
          answer_a: string | null
          answer_b: string | null
          answered_at_a: string | null
          answered_at_b: string | null
          created_at: string
          duel_id: string
          id: string
          options: string[]
          question: string
          round_number: number
          winner: string | null
        }
        Insert: {
          answer: string
          answer_a?: string | null
          answer_b?: string | null
          answered_at_a?: string | null
          answered_at_b?: string | null
          created_at?: string
          duel_id: string
          id?: string
          options: string[]
          question: string
          round_number: number
          winner?: string | null
        }
        Update: {
          answer?: string
          answer_a?: string | null
          answer_b?: string | null
          answered_at_a?: string | null
          answered_at_b?: string | null
          created_at?: string
          duel_id?: string
          id?: string
          options?: string[]
          question?: string
          round_number?: number
          winner?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "duel_rounds_duel_id_fkey"
            columns: ["duel_id"]
            isOneToOne: false
            referencedRelation: "duels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duel_rounds_winner_fkey"
            columns: ["winner"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      duels: {
        Row: {
          created_at: string
          current_round: number
          finished_at: string | null
          id: string
          player_a: string
          player_b: string | null
          score_a: number
          score_b: number
          status: Database["public"]["Enums"]["duel_status"]
          total_rounds: number
          winner_id: string | null
        }
        Insert: {
          created_at?: string
          current_round?: number
          finished_at?: string | null
          id?: string
          player_a: string
          player_b?: string | null
          score_a?: number
          score_b?: number
          status?: Database["public"]["Enums"]["duel_status"]
          total_rounds?: number
          winner_id?: string | null
        }
        Update: {
          created_at?: string
          current_round?: number
          finished_at?: string | null
          id?: string
          player_a?: string
          player_b?: string | null
          score_a?: number
          score_b?: number
          status?: Database["public"]["Enums"]["duel_status"]
          total_rounds?: number
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "duels_player_a_fkey"
            columns: ["player_a"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duels_player_b_fkey"
            columns: ["player_b"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duels_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      likes: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          duration_ms: number | null
          id: string
          kind: Database["public"]["Enums"]["message_kind"]
          media_mime: string | null
          media_size: number | null
          media_url: string | null
          read: boolean
          recipient_id: string
          sender_id: string
          viewed_at: string | null
        }
        Insert: {
          content: string
          created_at?: string
          duration_ms?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["message_kind"]
          media_mime?: string | null
          media_size?: number | null
          media_url?: string | null
          read?: boolean
          recipient_id: string
          sender_id: string
          viewed_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          duration_ms?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["message_kind"]
          media_mime?: string | null
          media_size?: number | null
          media_url?: string | null
          read?: boolean
          recipient_id?: string
          sender_id?: string
          viewed_at?: string | null
        }
        Relationships: []
      }
      notification_prefs: {
        Row: {
          challenges: boolean
          comments: boolean
          duels: boolean
          in_app: boolean
          likes: boolean
          streaks: boolean
          updated_at: string
          user_id: string
          web_push: boolean
        }
        Insert: {
          challenges?: boolean
          comments?: boolean
          duels?: boolean
          in_app?: boolean
          likes?: boolean
          streaks?: boolean
          updated_at?: string
          user_id: string
          web_push?: boolean
        }
        Update: {
          challenges?: boolean
          comments?: boolean
          duels?: boolean
          in_app?: boolean
          likes?: boolean
          streaks?: boolean
          updated_at?: string
          user_id?: string
          web_push?: boolean
        }
        Relationships: []
      }
      notifications: {
        Row: {
          actor_id: string | null
          body: string | null
          created_at: string
          id: string
          link: string | null
          read: boolean
          title: string
          type: Database["public"]["Enums"]["notif_type"]
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title: string
          type: Database["public"]["Enums"]["notif_type"]
          user_id: string
        }
        Update: {
          actor_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title?: string
          type?: Database["public"]["Enums"]["notif_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          achievement_icon: string | null
          achievement_title: string | null
          challenge_id: string | null
          comments_count: number
          content: string
          created_at: string
          duel_id: string | null
          id: string
          likes_count: number
          reposts_count: number
          type: Database["public"]["Enums"]["post_type"]
          user_id: string
        }
        Insert: {
          achievement_icon?: string | null
          achievement_title?: string | null
          challenge_id?: string | null
          comments_count?: number
          content: string
          created_at?: string
          duel_id?: string | null
          id?: string
          likes_count?: number
          reposts_count?: number
          type?: Database["public"]["Enums"]["post_type"]
          user_id: string
        }
        Update: {
          achievement_icon?: string | null
          achievement_title?: string | null
          challenge_id?: string | null
          comments_count?: number
          content?: string
          created_at?: string
          duel_id?: string | null
          id?: string
          likes_count?: number
          reposts_count?: number
          type?: Database["public"]["Enums"]["post_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_duel_id_fkey"
            columns: ["duel_id"]
            isOneToOne: false
            referencedRelation: "duels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar: string
          avatar_url: string | null
          bio: string | null
          chat_bg_url: string | null
          created_at: string
          display_name: string
          grade: string | null
          handle: string
          id: string
          instagram: string | null
          last_active_date: string | null
          last_seen_at: string | null
          level: number
          losses: number
          school: string
          streak: number
          updated_at: string
          wins: number
          xp: number
        }
        Insert: {
          avatar?: string
          avatar_url?: string | null
          bio?: string | null
          chat_bg_url?: string | null
          created_at?: string
          display_name: string
          grade?: string | null
          handle: string
          id: string
          instagram?: string | null
          last_active_date?: string | null
          last_seen_at?: string | null
          level?: number
          losses?: number
          school: string
          streak?: number
          updated_at?: string
          wins?: number
          xp?: number
        }
        Update: {
          avatar?: string
          avatar_url?: string | null
          bio?: string | null
          chat_bg_url?: string | null
          created_at?: string
          display_name?: string
          grade?: string | null
          handle?: string
          id?: string
          instagram?: string | null
          last_active_date?: string | null
          last_seen_at?: string | null
          level?: number
          losses?: number
          school?: string
          streak?: number
          updated_at?: string
          wins?: number
          xp?: number
        }
        Relationships: []
      }
      reposts: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reposts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reposts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      school_leaderboard_weekly: {
        Row: {
          member_count: number
          rank: number
          school: string
          total_xp: number
          updated_at: string
          week_start: string
        }
        Insert: {
          member_count?: number
          rank?: number
          school: string
          total_xp?: number
          updated_at?: string
          week_start: string
        }
        Update: {
          member_count?: number
          rank?: number
          school?: string
          total_xp?: number
          updated_at?: string
          week_start?: string
        }
        Relationships: []
      }
      xp_events: {
        Row: {
          amount: number
          created_at: string
          id: string
          reason: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          reason: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "xp_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      advance_duel: { Args: { _duel_id: string }; Returns: undefined }
      advance_duel_from_round: {
        Args: { _duel_id: string; _round_number: number }
        Returns: undefined
      }
      award_xp: {
        Args: { _amount: number; _reason: string; _user_id: string }
        Returns: undefined
      }
      finish_duel: { Args: { _duel_id: string }; Returns: undefined }
      join_duel_queue: { Args: never; Returns: Json }
      refresh_school_leaderboard: { Args: never; Returns: undefined }
      resolve_duel_round: { Args: { _round_id: string }; Returns: undefined }
      seed_duel_round:
        | { Args: { _duel_id: string }; Returns: string }
        | {
            Args: { _duel_id: string; _round_number?: number }
            Returns: string
          }
      solve_challenge: {
        Args: { _answer: string; _challenge_id: string; _time_taken_ms: number }
        Returns: Json
      }
      touch_presence: { Args: never; Returns: undefined }
    }
    Enums: {
      difficulty: "easy" | "medium" | "hard"
      duel_status: "waiting" | "active" | "finished" | "cancelled"
      message_kind: "text" | "image" | "video" | "file" | "voice" | "view_once"
      notif_type:
        | "challenge_invite"
        | "duel_invite"
        | "duel_win"
        | "duel_loss"
        | "streak_reward"
        | "level_up"
        | "like"
        | "comment"
        | "repost"
        | "mention"
      post_type: "text" | "challenge" | "duel" | "achievement"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      difficulty: ["easy", "medium", "hard"],
      duel_status: ["waiting", "active", "finished", "cancelled"],
      message_kind: ["text", "image", "video", "file", "voice", "view_once"],
      notif_type: [
        "challenge_invite",
        "duel_invite",
        "duel_win",
        "duel_loss",
        "streak_reward",
        "level_up",
        "like",
        "comment",
        "repost",
        "mention",
      ],
      post_type: ["text", "challenge", "duel", "achievement"],
    },
  },
} as const
