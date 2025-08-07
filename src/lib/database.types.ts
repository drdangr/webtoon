export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          full_name: string | null;
          bio: string | null;
          avatar_url: string | null;
          website: string | null;
          social_links: Record<string, any>;
          total_projects: number;
          total_views: number;
          total_likes: number;
          subscription_tier: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          full_name?: string | null;
          bio?: string | null;
          avatar_url?: string | null;
          website?: string | null;
          social_links?: Record<string, any>;
          total_projects?: number;
          total_views?: number;
          total_likes?: number;
          subscription_tier?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          full_name?: string | null;
          bio?: string | null;
          avatar_url?: string | null;
          website?: string | null;
          social_links?: Record<string, any>;
          total_projects?: number;
          total_views?: number;
          total_likes?: number;
          subscription_tier?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      genres: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          color: string;
          icon: string;
          order_index: number;
          project_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          color?: string;
          icon?: string;
          order_index?: number;
          project_count?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          color?: string;
          icon?: string;
          order_index?: number;
          project_count?: number;
          created_at?: string;
        };
      };
      projects: {
        Row: {
          id: string;
          user_id: string;
          genre_id: string | null;
          title: string;
          description: string | null;
          thumbnail_url: string | null;
          slug: string | null;
          view_count: number;
          like_count: number;
          comment_count: number;
          is_published: boolean;
          is_public: boolean;
          is_featured: boolean;
          estimated_reading_time: number | null;
          tags: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          genre_id?: string | null;
          title: string;
          description?: string | null;
          thumbnail_url?: string | null;
          slug?: string | null;
          view_count?: number;
          like_count?: number;
          comment_count?: number;
          is_published?: boolean;
          is_public?: boolean;
          is_featured?: boolean;
          estimated_reading_time?: number | null;
          tags?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          genre_id?: string | null;
          title?: string;
          description?: string | null;
          thumbnail_url?: string | null;
          slug?: string | null;
          view_count?: number;
          like_count?: number;
          comment_count?: number;
          is_published?: boolean;
          is_public?: boolean;
          is_featured?: boolean;
          estimated_reading_time?: number | null;
          tags?: string[];
          created_at?: string;
          updated_at?: string;
        };
      };
      project_versions: {
        Row: {
          id: string;
          project_id: string;
          version_number: number;
          nodes: Record<string, any>;
          edges: Record<string, any>;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          version_number: number;
          nodes: Record<string, any>;
          edges: Record<string, any>;
          created_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          project_id?: string;
          version_number?: number;
          nodes?: Record<string, any>;
          edges?: Record<string, any>;
          created_at?: string;
          created_by?: string | null;
        };
      };
      images: {
        Row: {
          id: string;
          project_id: string;
          file_path: string;
          file_url: string;
          file_name: string;
          file_size: number | null;
          width: number | null;
          height: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          file_path: string;
          file_url: string;
          file_name: string;
          file_size?: number | null;
          width?: number | null;
          height?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          file_path?: string;
          file_url?: string;
          file_name?: string;
          file_size?: number | null;
          width?: number | null;
          height?: number | null;
          created_at?: string;
        };
      };
      likes: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string;
          created_at?: string;
        };
      };
      views: {
        Row: {
          id: string;
          project_id: string;
          user_id: string | null;
          session_id: string | null;
          ip_address: string | null;
          referrer: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id?: string | null;
          session_id?: string | null;
          ip_address?: string | null;
          referrer?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string | null;
          session_id?: string | null;
          ip_address?: string | null;
          referrer?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
      };
      comments: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          parent_id: string | null;
          content: string;
          is_edited: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          parent_id?: string | null;
          content: string;
          is_edited?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string;
          parent_id?: string | null;
          content?: string;
          is_edited?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      follows: {
        Row: {
          id: string;
          follower_id: string;
          following_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          follower_id: string;
          following_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          follower_id?: string;
          following_id?: string;
          created_at?: string;
        };
      };
      analytics: {
        Row: {
          id: string;
          project_id: string;
          session_id: string;
          user_id: string | null;
          path_taken: Record<string, any>;
          choices_made: Record<string, any> | null;
          completion_rate: number | null;
          time_spent: number | null;
          device_type: string | null;
          browser: string | null;
          country: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          session_id: string;
          user_id?: string | null;
          path_taken: Record<string, any>;
          choices_made?: Record<string, any> | null;
          completion_rate?: number | null;
          time_spent?: number | null;
          device_type?: string | null;
          browser?: string | null;
          country?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          session_id?: string;
          user_id?: string | null;
          path_taken?: Record<string, any>;
          choices_made?: Record<string, any> | null;
          completion_rate?: number | null;
          time_spent?: number | null;
          device_type?: string | null;
          browser?: string | null;
          country?: string | null;
          created_at?: string;
        };
      };
      hotspots: {
        Row: {
          id: string;
          project_id: string;
          edge_id: string;
          x_position: number;
          y_position: number;
          width: number;
          height: number;
          label: string | null;
          click_count: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          edge_id: string;
          x_position: number;
          y_position: number;
          width: number;
          height: number;
          label?: string | null;
          click_count?: number;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          edge_id?: string;
          x_position?: number;
          y_position?: number;
          width?: number;
          height?: number;
          label?: string | null;
          click_count?: number;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      increment_view_count: {
        Args: {
          p_project_id: string;
          p_user_id?: string | null;
          p_session_id?: string | null;
        };
        Returns: void;
      };
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

// Convenience types for working with the database
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Genre = Database['public']['Tables']['genres']['Row'];
export type Project = Database['public']['Tables']['projects']['Row'];
export type ProjectVersion = Database['public']['Tables']['project_versions']['Row'];
export type Image = Database['public']['Tables']['images']['Row'];
export type Like = Database['public']['Tables']['likes']['Row'];
export type View = Database['public']['Tables']['views']['Row'];
export type Comment = Database['public']['Tables']['comments']['Row'];
export type Follow = Database['public']['Tables']['follows']['Row'];
export type Analytics = Database['public']['Tables']['analytics']['Row'];
export type Hotspot = Database['public']['Tables']['hotspots']['Row'];

// Input types for creating new records
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
export type GenreInsert = Database['public']['Tables']['genres']['Insert'];
export type ProjectInsert = Database['public']['Tables']['projects']['Insert'];
export type ProjectVersionInsert = Database['public']['Tables']['project_versions']['Insert'];
export type ImageInsert = Database['public']['Tables']['images']['Insert'];
export type LikeInsert = Database['public']['Tables']['likes']['Insert'];
export type ViewInsert = Database['public']['Tables']['views']['Insert'];
export type CommentInsert = Database['public']['Tables']['comments']['Insert'];
export type FollowInsert = Database['public']['Tables']['follows']['Insert'];
export type AnalyticsInsert = Database['public']['Tables']['analytics']['Insert'];
export type HotspotInsert = Database['public']['Tables']['hotspots']['Insert'];

// Update types for updating existing records
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];
export type GenreUpdate = Database['public']['Tables']['genres']['Update'];
export type ProjectUpdate = Database['public']['Tables']['projects']['Update'];
export type ProjectVersionUpdate = Database['public']['Tables']['project_versions']['Update'];
export type ImageUpdate = Database['public']['Tables']['images']['Update'];
export type LikeUpdate = Database['public']['Tables']['likes']['Update'];
export type ViewUpdate = Database['public']['Tables']['views']['Update'];
export type CommentUpdate = Database['public']['Tables']['comments']['Update'];
export type FollowUpdate = Database['public']['Tables']['follows']['Update'];
export type AnalyticsUpdate = Database['public']['Tables']['analytics']['Update'];
export type HotspotUpdate = Database['public']['Tables']['hotspots']['Update'];
