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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      agents: {
        Row: {
          bio: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_active: boolean
          mobile: string | null
          phone: string | null
          portrait_url: string | null
          role: string
          updated_at: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          is_active?: boolean
          mobile?: string | null
          phone?: string | null
          portrait_url?: string | null
          role: string
          updated_at?: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          mobile?: string | null
          phone?: string | null
          portrait_url?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      chatbot_content_chunks: {
        Row: {
          chunk_index: number
          content: string
          content_hash: string
          created_at: string
          document_key: string
          embedding: string | null
          id: string
          metadata: Json
          path: string
          section_heading: string | null
          source_kind: string
          source_url: string
          title: string | null
          token_estimate: number
          updated_at: string
        }
        Insert: {
          chunk_index: number
          content: string
          content_hash: string
          created_at?: string
          document_key: string
          embedding?: string | null
          id?: string
          metadata?: Json
          path: string
          section_heading?: string | null
          source_kind?: string
          source_url: string
          title?: string | null
          token_estimate?: number
          updated_at?: string
        }
        Update: {
          chunk_index?: number
          content?: string
          content_hash?: string
          created_at?: string
          document_key?: string
          embedding?: string | null
          id?: string
          metadata?: Json
          path?: string
          section_heading?: string | null
          source_kind?: string
          source_url?: string
          title?: string | null
          token_estimate?: number
          updated_at?: string
        }
        Relationships: []
      }
      chatbot_eval_cases: {
        Row: {
          active: boolean
          created_at: string
          expected: Json
          id: string
          input: Json
          name: string
          suite: string
          tags: string[]
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          expected?: Json
          id?: string
          input?: Json
          name: string
          suite: string
          tags?: string[]
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          expected?: Json
          id?: string
          input?: Json
          name?: string
          suite?: string
          tags?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      chatbot_eval_results: {
        Row: {
          actual: Json
          case_id: string
          cost_estimate_usd: number | null
          created_at: string
          failure_reason: string | null
          id: string
          latency_ms: number | null
          pass: boolean
          run_id: string
          scores: Json
        }
        Insert: {
          actual?: Json
          case_id: string
          cost_estimate_usd?: number | null
          created_at?: string
          failure_reason?: string | null
          id?: string
          latency_ms?: number | null
          pass: boolean
          run_id: string
          scores?: Json
        }
        Update: {
          actual?: Json
          case_id?: string
          cost_estimate_usd?: number | null
          created_at?: string
          failure_reason?: string | null
          id?: string
          latency_ms?: number | null
          pass?: boolean
          run_id?: string
          scores?: Json
        }
        Relationships: [
          {
            foreignKeyName: "chatbot_eval_results_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "chatbot_eval_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chatbot_eval_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "chatbot_eval_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chatbot_eval_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "chatbot_eval_summary_latest"
            referencedColumns: ["run_id"]
          },
        ]
      }
      chatbot_eval_runs: {
        Row: {
          env: string | null
          finished_at: string | null
          git_sha: string | null
          id: string
          started_at: string
          status: string
          suite: string
          summary: Json
        }
        Insert: {
          env?: string | null
          finished_at?: string | null
          git_sha?: string | null
          id?: string
          started_at?: string
          status: string
          suite: string
          summary?: Json
        }
        Update: {
          env?: string | null
          finished_at?: string | null
          git_sha?: string | null
          id?: string
          started_at?: string
          status?: string
          suite?: string
          summary?: Json
        }
        Relationships: []
      }
      chatbot_memory_events: {
        Row: {
          created_at: string
          delta: Json
          event_type: string
          id: string
          metadata: Json
          session_id: string
        }
        Insert: {
          created_at?: string
          delta?: Json
          event_type?: string
          id?: string
          metadata?: Json
          session_id: string
        }
        Update: {
          created_at?: string
          delta?: Json
          event_type?: string
          id?: string
          metadata?: Json
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chatbot_memory_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chatbot_memory_sessions"
            referencedColumns: ["session_id"]
          },
        ]
      }
      chatbot_memory_sessions: {
        Row: {
          created_at: string
          expires_at: string | null
          last_seen_at: string
          memory_version: string
          metadata: Json
          preferences: Json
          qualification: Json
          selected_property_ids: Json
          session_id: string
          summary: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          last_seen_at?: string
          memory_version?: string
          metadata?: Json
          preferences?: Json
          qualification?: Json
          selected_property_ids?: Json
          session_id: string
          summary?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          last_seen_at?: string
          memory_version?: string
          metadata?: Json
          preferences?: Json
          qualification?: Json
          selected_property_ids?: Json
          session_id?: string
          summary?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      chatbot_page_snapshot_cache: {
        Row: {
          content_hash: string | null
          content_text: string | null
          created_at: string
          expires_at: string | null
          fetch_mode: string
          last_error: string | null
          last_fetched_at: string
          metadata: Json
          path: string
          source_url: string
          status: string
          title: string | null
          updated_at: string
          word_count: number
        }
        Insert: {
          content_hash?: string | null
          content_text?: string | null
          created_at?: string
          expires_at?: string | null
          fetch_mode: string
          last_error?: string | null
          last_fetched_at?: string
          metadata?: Json
          path: string
          source_url: string
          status: string
          title?: string | null
          updated_at?: string
          word_count?: number
        }
        Update: {
          content_hash?: string | null
          content_text?: string | null
          created_at?: string
          expires_at?: string | null
          fetch_mode?: string
          last_error?: string | null
          last_fetched_at?: string
          metadata?: Json
          path?: string
          source_url?: string
          status?: string
          title?: string | null
          updated_at?: string
          word_count?: number
        }
        Relationships: []
      }
      chatbot_quality_events: {
        Row: {
          answer_chars: number | null
          citation_path: string | null
          citations_count: number
          conversation_id: string
          created_at: string
          edge_provider: string | null
          event_type: string
          feedback_reason: string | null
          feedback_value: number | null
          id: string
          intent: string | null
          message_id: string | null
          metadata: Json
          page_path: string | null
          rag_used: boolean | null
          request_chars: number | null
          request_id: string | null
          response_latency_ms: number | null
          retrieval_mode: string | null
          route_category: string | null
          route_decision: string | null
          session_id: string
          source: string | null
        }
        Insert: {
          answer_chars?: number | null
          citation_path?: string | null
          citations_count?: number
          conversation_id: string
          created_at?: string
          edge_provider?: string | null
          event_type: string
          feedback_reason?: string | null
          feedback_value?: number | null
          id?: string
          intent?: string | null
          message_id?: string | null
          metadata?: Json
          page_path?: string | null
          rag_used?: boolean | null
          request_chars?: number | null
          request_id?: string | null
          response_latency_ms?: number | null
          retrieval_mode?: string | null
          route_category?: string | null
          route_decision?: string | null
          session_id: string
          source?: string | null
        }
        Update: {
          answer_chars?: number | null
          citation_path?: string | null
          citations_count?: number
          conversation_id?: string
          created_at?: string
          edge_provider?: string | null
          event_type?: string
          feedback_reason?: string | null
          feedback_value?: number | null
          id?: string
          intent?: string | null
          message_id?: string | null
          metadata?: Json
          page_path?: string | null
          rag_used?: boolean | null
          request_chars?: number | null
          request_id?: string | null
          response_latency_ms?: number | null
          retrieval_mode?: string | null
          route_category?: string | null
          route_decision?: string | null
          session_id?: string
          source?: string | null
        }
        Relationships: []
      }
      cities: {
        Row: {
          created_at: string
          hero_image_url: string | null
          id: string
          is_active: boolean
          name: string
          postal_codes: string[]
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          hero_image_url?: string | null
          id?: string
          is_active?: boolean
          name: string
          postal_codes?: string[]
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          hero_image_url?: string | null
          id?: string
          is_active?: boolean
          name?: string
          postal_codes?: string[]
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          assigned_agent_id: string | null
          city_id: string | null
          consent: boolean
          created_at: string
          email: string
          first_name: string
          id: string
          ip_hash: string | null
          last_name: string
          message: string
          phone: string | null
          property_id: number | null
          source: Database["public"]["Enums"]["lead_source"]
          status: Database["public"]["Enums"]["lead_status"]
          user_agent: string | null
        }
        Insert: {
          assigned_agent_id?: string | null
          city_id?: string | null
          consent?: boolean
          created_at?: string
          email: string
          first_name: string
          id?: string
          ip_hash?: string | null
          last_name: string
          message: string
          phone?: string | null
          property_id?: number | null
          source: Database["public"]["Enums"]["lead_source"]
          status?: Database["public"]["Enums"]["lead_status"]
          user_agent?: string | null
        }
        Update: {
          assigned_agent_id?: string | null
          city_id?: string | null
          consent?: boolean
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          ip_hash?: string | null
          last_name?: string
          message?: string
          phone?: string | null
          property_id?: number | null
          source?: Database["public"]["Enums"]["lead_source"]
          status?: Database["public"]["Enums"]["lead_status"]
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_agent_id_fkey"
            columns: ["assigned_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          agent_id: string | null
          bathrooms: number | null
          bedrooms: number | null
          city_id: string | null
          created_at: string
          description: string | null
          dpe_label: string | null
          dpe_value: number | null
          garage_count: number | null
          ges_label: string | null
          ges_value: number | null
          id: number
          lat: number | null
          lng: number | null
          parking_count: number | null
          postal_code: string | null
          price_amount: number
          price_currency: string
          property_type: Database["public"]["Enums"]["property_type"]
          published_at: string | null
          rooms: number | null
          slug: string
          status: Database["public"]["Enums"]["property_status"]
          surface_m2: number | null
          terrain_m2: number | null
          title: string
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
        }
        Insert: {
          agent_id?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          city_id?: string | null
          created_at?: string
          description?: string | null
          dpe_label?: string | null
          dpe_value?: number | null
          garage_count?: number | null
          ges_label?: string | null
          ges_value?: number | null
          id: number
          lat?: number | null
          lng?: number | null
          parking_count?: number | null
          postal_code?: string | null
          price_amount: number
          price_currency?: string
          property_type: Database["public"]["Enums"]["property_type"]
          published_at?: string | null
          rooms?: number | null
          slug: string
          status?: Database["public"]["Enums"]["property_status"]
          surface_m2?: number | null
          terrain_m2?: number | null
          title: string
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
        }
        Update: {
          agent_id?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          city_id?: string | null
          created_at?: string
          description?: string | null
          dpe_label?: string | null
          dpe_value?: number | null
          garage_count?: number | null
          ges_label?: string | null
          ges_value?: number | null
          id?: number
          lat?: number | null
          lng?: number | null
          parking_count?: number | null
          postal_code?: string | null
          price_amount?: number
          price_currency?: string
          property_type?: Database["public"]["Enums"]["property_type"]
          published_at?: string | null
          rooms?: number | null
          slug?: string
          status?: Database["public"]["Enums"]["property_status"]
          surface_m2?: number | null
          terrain_m2?: number | null
          title?: string
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "properties_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      property_documents: {
        Row: {
          created_at: string
          expires_at: string | null
          file_size_bytes: number | null
          http_etag: string | null
          http_last_modified: string | null
          id: string
          kind: string
          last_error: string | null
          last_fetch_at: string | null
          metadata: Json
          mime_type: string | null
          page_count: number | null
          property_id: number
          sha256: string | null
          source_url: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          file_size_bytes?: number | null
          http_etag?: string | null
          http_last_modified?: string | null
          id?: string
          kind: string
          last_error?: string | null
          last_fetch_at?: string | null
          metadata?: Json
          mime_type?: string | null
          page_count?: number | null
          property_id: number
          sha256?: string | null
          source_url: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          file_size_bytes?: number | null
          http_etag?: string | null
          http_last_modified?: string | null
          id?: string
          kind?: string
          last_error?: string | null
          last_fetch_at?: string | null
          metadata?: Json
          mime_type?: string | null
          page_count?: number | null
          property_id?: number
          sha256?: string | null
          source_url?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_documents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_features: {
        Row: {
          feature_key: string
          label_fr: string
          property_id: number
        }
        Insert: {
          feature_key: string
          label_fr: string
          property_id: number
        }
        Update: {
          feature_key?: string
          label_fr?: string
          property_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "property_features_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_images: {
        Row: {
          alt_text: string | null
          created_at: string
          id: string
          property_id: number
          sort_order: number
          source_url: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          id?: string
          property_id: number
          sort_order?: number
          source_url: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          id?: string
          property_id?: number
          sort_order?: number
          source_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_images_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_media_analysis: {
        Row: {
          analysis_version: string
          cache_key: string | null
          cost_estimate_usd: number | null
          created_at: string
          evidence: Json
          id: string
          latency_ms: number | null
          metadata: Json
          model: string
          property_id: number
          safety_flags: Json
          source_hash: string | null
          source_id: string | null
          source_kind: string
          source_url: string
          status: string
          structured_facts: Json
          summary_long: string | null
          summary_short: string | null
          updated_at: string
        }
        Insert: {
          analysis_version: string
          cache_key?: string | null
          cost_estimate_usd?: number | null
          created_at?: string
          evidence?: Json
          id?: string
          latency_ms?: number | null
          metadata?: Json
          model: string
          property_id: number
          safety_flags?: Json
          source_hash?: string | null
          source_id?: string | null
          source_kind: string
          source_url: string
          status: string
          structured_facts?: Json
          summary_long?: string | null
          summary_short?: string | null
          updated_at?: string
        }
        Update: {
          analysis_version?: string
          cache_key?: string | null
          cost_estimate_usd?: number | null
          created_at?: string
          evidence?: Json
          id?: string
          latency_ms?: number | null
          metadata?: Json
          model?: string
          property_id?: number
          safety_flags?: Json
          source_hash?: string | null
          source_id?: string | null
          source_kind?: string
          source_url?: string
          status?: string
          structured_facts?: Json
          summary_long?: string | null
          summary_short?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_media_analysis_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_media_analysis_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "property_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      property_media_analysis_jobs: {
        Row: {
          attempts: number
          created_at: string
          finished_at: string | null
          id: string
          job_type: string
          last_error: string | null
          locked_by: string | null
          next_attempt_at: string | null
          payload: Json
          priority: number
          property_id: number
          started_at: string | null
          status: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          finished_at?: string | null
          id?: string
          job_type: string
          last_error?: string | null
          locked_by?: string | null
          next_attempt_at?: string | null
          payload?: Json
          priority?: number
          property_id: number
          started_at?: string | null
          status?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          finished_at?: string | null
          id?: string
          job_type?: string
          last_error?: string | null
          locked_by?: string | null
          next_attempt_at?: string | null
          payload?: Json
          priority?: number
          property_id?: number
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_media_analysis_jobs_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      chatbot_cost_estimate_daily: {
        Row: {
          day: string | null
          high_cost_count: number | null
          low_cost_count: number | null
          medium_cost_count: number | null
          multimodal_cache_hits: number | null
          reply_count: number | null
        }
        Relationships: []
      }
      chatbot_eval_summary_latest: {
        Row: {
          avg_latency_ms: number | null
          case_count: number | null
          env: string | null
          fail_count: number | null
          finished_at: string | null
          git_sha: string | null
          pass_count: number | null
          run_id: string | null
          started_at: string | null
          status: string | null
          suite: string | null
          total_cost_estimate_usd: number | null
        }
        Relationships: []
      }
      chatbot_feedback_daily: {
        Row: {
          day: string | null
          feedback_count: number | null
          helpfulness_rate: number | null
          thumbs_down_count: number | null
          thumbs_up_count: number | null
        }
        Relationships: []
      }
      chatbot_memory_daily: {
        Row: {
          avg_selected_properties: number | null
          day: string | null
          memory_events: number | null
          sessions_touched: number | null
        }
        Relationships: []
      }
      chatbot_multimodal_daily: {
        Row: {
          analyses_total: number | null
          avg_latency_ms: number | null
          day: string | null
          document_analyses: number | null
          error_count: number | null
          image_analyses: number | null
          ready_count: number | null
          total_cost_estimate_usd: number | null
        }
        Relationships: []
      }
      chatbot_planner_daily: {
        Row: {
          avg_planner_confidence: number | null
          day: string | null
          planner_clarify_count: number | null
          planner_events: number | null
          planner_fallback_ratio: number | null
          planner_plan_count: number | null
        }
        Relationships: []
      }
      chatbot_quality_daily: {
        Row: {
          avg_citations_count: number | null
          avg_reply_latency_ms: number | null
          day: string | null
          edge_reply_ratio: number | null
          local_reply_ratio: number | null
          rag_used_ratio: number | null
          reply_count: number | null
          request_failed_count: number | null
          total_events: number | null
        }
        Relationships: []
      }
      chatbot_regressions_7d: {
        Row: {
          failure_reasons: string[] | null
          failures: number | null
          last_failure_at: string | null
          name: string | null
          suite: string | null
        }
        Relationships: []
      }
      chatbot_top_citations_7d: {
        Row: {
          citation_path: string | null
          clicks: number | null
          last_clicked_at: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      match_chatbot_content_chunks: {
        Args: {
          match_count?: number
          match_threshold?: number
          path_prefix?: string
          query_embedding_text: string
        }
        Returns: {
          content: string
          document_key: string
          id: string
          metadata: Json
          path: string
          section_heading: string
          similarity: number
          source_url: string
          title: string
        }[]
      }
      match_chatbot_content_chunks_keyword: {
        Args: { match_count?: number; path_prefix?: string; query_text: string }
        Returns: {
          content: string
          document_key: string
          id: string
          keyword_rank: number
          metadata: Json
          path: string
          section_heading: string
          source_url: string
          title: string
        }[]
      }
    }
    Enums: {
      lead_source:
        | "contact_page"
        | "property_page"
        | "estimation"
        | "favorites_share"
      lead_status: "new" | "assigned" | "contacted" | "closed"
      property_status:
        | "active"
        | "under_offer"
        | "sold"
        | "rented"
        | "off_market"
      property_type: "appartement" | "maison_villa" | "autre"
      transaction_type: "vente" | "location"
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
      lead_source: [
        "contact_page",
        "property_page",
        "estimation",
        "favorites_share",
      ],
      lead_status: ["new", "assigned", "contacted", "closed"],
      property_status: [
        "active",
        "under_offer",
        "sold",
        "rented",
        "off_market",
      ],
      property_type: ["appartement", "maison_villa", "autre"],
      transaction_type: ["vente", "location"],
    },
  },
} as const
