export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ChatMessageRecord = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  status?: "streaming" | "error";
  created_at?: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          api_key_status: "absent" | "present" | null;
          usage_chat_count: number | null;
          usage_total_tokens: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          avatar_url?: string | null;
          api_key_status?: "absent" | "present" | null;
          usage_chat_count?: number | null;
          usage_total_tokens?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          api_key_status?: "absent" | "present" | null;
          usage_chat_count?: number | null;
          usage_total_tokens?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      chat_sessions: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          messages: Json | null;
          updated_at: string;
          usage_total_tokens: number | null;
          usage_prompt_tokens: number | null;
          usage_completion_tokens: number | null;
          usage_cost: number | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          messages?: Json | null;
          updated_at?: string;
          usage_total_tokens?: number | null;
          usage_prompt_tokens?: number | null;
          usage_completion_tokens?: number | null;
          usage_cost?: number | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          messages?: Json | null;
          updated_at?: string;
          usage_total_tokens?: number | null;
          usage_prompt_tokens?: number | null;
          usage_completion_tokens?: number | null;
          usage_cost?: number | null;
        };
        Relationships: [];
      };
      note_documents: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          source_type: "pdf" | "markdown" | "text";
          size_bytes: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          source_type: "pdf" | "markdown" | "text";
          size_bytes?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          source_type?: "pdf" | "markdown" | "text";
          size_bytes?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
      note_summaries: {
        Row: {
          id: string;
          document_id: string;
          summary_type: "concise" | "outline" | "flashcards";
          content: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          summary_type: "concise" | "outline" | "flashcards";
          content: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          document_id?: string;
          summary_type?: "concise" | "outline" | "flashcards";
          content?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      tool_activity: {
        Row: {
          id: string;
          user_id: string;
          tool_id: string;
          run_at: string;
          metadata: Json | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          tool_id: string;
          run_at?: string;
          metadata?: Json | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          tool_id?: string;
          run_at?: string;
          metadata?: Json | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type ChatSessionRow = Database["public"]["Tables"]["chat_sessions"]["Row"];
