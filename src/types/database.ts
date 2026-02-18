// Generierte Supabase Database Types
// Wird später mit supabase gen types ersetzt – bis dahin manuelle Definition

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          personalnummer: string
          display_name: string | null
          role: 'super_admin' | 'admin' | 'user' | 'viewer'
          must_change_password: boolean
          created_by: string | null
          created_at: string
          last_login: string | null
        }
        Insert: {
          id: string
          email: string
          personalnummer: string
          display_name?: string | null
          role?: 'super_admin' | 'admin' | 'user' | 'viewer'
          must_change_password?: boolean
          created_by?: string | null
          created_at?: string
          last_login?: string | null
        }
        Update: {
          id?: string
          email?: string
          personalnummer?: string
          display_name?: string | null
          role?: 'super_admin' | 'admin' | 'user' | 'viewer'
          must_change_password?: boolean
          last_login?: string | null
        }
      }
      versions: {
        Row: {
          id: string
          kw_nummer: number
          jahr: number
          kw_label: string
          status: 'draft' | 'active' | 'frozen'
          created_at: string
          published_at: string | null
          frozen_at: string | null
          delete_after: string | null
          created_by: string | null
        }
        Insert: {
          id?: string
          kw_nummer: number
          jahr: number
          status?: 'draft' | 'active' | 'frozen'
          created_at?: string
          published_at?: string | null
          frozen_at?: string | null
          delete_after?: string | null
          created_by?: string | null
        }
        Update: {
          kw_nummer?: number
          jahr?: number
          status?: 'draft' | 'active' | 'frozen'
          published_at?: string | null
          frozen_at?: string | null
          delete_after?: string | null
        }
      }
      master_plu_items: {
        Row: {
          id: string
          version_id: string
          plu: string
          system_name: string
          display_name: string | null
          item_type: 'PIECE' | 'WEIGHT'
          status: 'UNCHANGED' | 'NEW_PRODUCT_YELLOW' | 'PLU_CHANGED_RED'
          old_plu: string | null
          warengruppe: string | null
          block_id: string | null
          is_admin_eigen: boolean
          is_manually_renamed: boolean
          preis: number | null
          created_at: string
        }
        Insert: {
          id?: string
          version_id: string
          plu: string
          system_name: string
          display_name?: string | null
          item_type: 'PIECE' | 'WEIGHT'
          status?: 'UNCHANGED' | 'NEW_PRODUCT_YELLOW' | 'PLU_CHANGED_RED'
          old_plu?: string | null
          warengruppe?: string | null
          block_id?: string | null
          is_admin_eigen?: boolean
          is_manually_renamed?: boolean
          preis?: number | null
          created_at?: string
        }
        Update: {
          plu?: string
          system_name?: string
          display_name?: string | null
          item_type?: 'PIECE' | 'WEIGHT'
          status?: 'UNCHANGED' | 'NEW_PRODUCT_YELLOW' | 'PLU_CHANGED_RED'
          old_plu?: string | null
          warengruppe?: string | null
          block_id?: string | null
          is_admin_eigen?: boolean
          is_manually_renamed?: boolean
          preis?: number | null
        }
      }
      user_overrides: {
        Row: {
          id: string
          user_id: string
          plu: string
          override_type: 'eigen' | 'ausgeblendet' | 'umbenannt'
          custom_name: string | null
          custom_preis: number | null
          item_type: 'PIECE' | 'WEIGHT' | null
          block_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          plu: string
          override_type: 'eigen' | 'ausgeblendet' | 'umbenannt'
          custom_name?: string | null
          custom_preis?: number | null
          item_type?: 'PIECE' | 'WEIGHT' | null
          block_id?: string | null
        }
        Update: {
          plu?: string
          override_type?: 'eigen' | 'ausgeblendet' | 'umbenannt'
          custom_name?: string | null
          custom_preis?: number | null
          item_type?: 'PIECE' | 'WEIGHT' | null
          block_id?: string | null
        }
      }
      blocks: {
        Row: {
          id: string
          name: string
          order_index: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          order_index?: number
        }
        Update: {
          name?: string
          order_index?: number
        }
      }
      block_rules: {
        Row: {
          id: string
          block_id: string
          rule_type: 'NAME_CONTAINS' | 'NAME_REGEX' | 'PLU_RANGE'
          value: string
          case_sensitive: boolean
          modify_name_action: 'PREFIX' | 'SUFFIX' | 'NONE' | null
          modify_name_keyword: string | null
          created_at: string
        }
        Insert: {
          id?: string
          block_id: string
          rule_type: 'NAME_CONTAINS' | 'NAME_REGEX' | 'PLU_RANGE'
          value: string
          case_sensitive?: boolean
          modify_name_action?: 'PREFIX' | 'SUFFIX' | 'NONE' | null
          modify_name_keyword?: string | null
        }
        Update: {
          rule_type?: 'NAME_CONTAINS' | 'NAME_REGEX' | 'PLU_RANGE'
          value?: string
          case_sensitive?: boolean
          modify_name_action?: 'PREFIX' | 'SUFFIX' | 'NONE' | null
          modify_name_keyword?: string | null
        }
      }
      layout_settings: {
        Row: {
          id: string
          sort_mode: 'ALPHABETICAL' | 'BY_BLOCK'
          display_mode: 'MIXED' | 'SEPARATED'
          flow_direction: 'ROW_BY_ROW' | 'COLUMN_FIRST'
          font_header_px: number
          font_column_px: number
          font_product_px: number
          mark_red_kw_count: number
          mark_yellow_kw_count: number
          features_custom_products: boolean
          features_hidden_items: boolean
          features_blocks: boolean
          features_keyword_rules: boolean
          allow_mixed_mode: boolean
          allow_separated_mode: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          sort_mode?: 'ALPHABETICAL' | 'BY_BLOCK'
          display_mode?: 'MIXED' | 'SEPARATED'
          flow_direction?: 'ROW_BY_ROW' | 'COLUMN_FIRST'
          font_header_px?: number
          font_column_px?: number
          font_product_px?: number
          mark_red_kw_count?: number
          mark_yellow_kw_count?: number
          features_custom_products?: boolean
          features_hidden_items?: boolean
          features_blocks?: boolean
          features_keyword_rules?: boolean
          allow_mixed_mode?: boolean
          allow_separated_mode?: boolean
        }
        Update: {
          sort_mode?: 'ALPHABETICAL' | 'BY_BLOCK'
          display_mode?: 'MIXED' | 'SEPARATED'
          flow_direction?: 'ROW_BY_ROW' | 'COLUMN_FIRST'
          font_header_px?: number
          font_column_px?: number
          font_product_px?: number
          mark_red_kw_count?: number
          mark_yellow_kw_count?: number
          features_custom_products?: boolean
          features_hidden_items?: boolean
          features_blocks?: boolean
          features_keyword_rules?: boolean
          allow_mixed_mode?: boolean
          allow_separated_mode?: boolean
        }
      }
      bezeichnungsregeln: {
        Row: {
          id: string
          keyword: string
          position: 'PREFIX' | 'SUFFIX'
          case_sensitive: boolean
          is_active: boolean
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          keyword: string
          position: 'PREFIX' | 'SUFFIX'
          case_sensitive?: boolean
          is_active?: boolean
          created_by?: string | null
        }
        Update: {
          keyword?: string
          position?: 'PREFIX' | 'SUFFIX'
          case_sensitive?: boolean
          is_active?: boolean
        }
      }
      notifications_queue: {
        Row: {
          id: string
          user_id: string
          version_id: string
          plu: string
          product_name: string
          item_type: string
          user_decision: 'pending' | 'uebernommen' | 'ausgeblendet'
          created_at: string
          resolved_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          version_id: string
          plu: string
          product_name: string
          item_type: string
          user_decision?: 'pending' | 'uebernommen' | 'ausgeblendet'
        }
        Update: {
          user_decision?: 'pending' | 'uebernommen' | 'ausgeblendet'
          resolved_at?: string | null
        }
      }
      custom_products: {
        Row: {
          id: string
          plu: string
          name: string
          item_type: 'PIECE' | 'WEIGHT'
          preis: number | null
          block_id: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          plu: string
          name: string
          item_type: 'PIECE' | 'WEIGHT'
          preis?: number | null
          block_id?: string | null
          created_by: string
        }
        Update: {
          name?: string
          item_type?: 'PIECE' | 'WEIGHT'
          preis?: number | null
          block_id?: string | null
        }
      }
      hidden_items: {
        Row: {
          id: string
          plu: string
          hidden_by: string
          created_at: string
        }
        Insert: {
          id?: string
          plu: string
          hidden_by: string
        }
        Update: {
          plu?: string
        }
      }
      version_notifications: {
        Row: {
          id: string
          user_id: string
          version_id: string
          is_read: boolean
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          version_id: string
          is_read?: boolean
          read_at?: string | null
        }
        Update: {
          is_read?: boolean
          read_at?: string | null
        }
      }
    }
    Views: Record<string, never>
    Functions: {
      is_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
      is_super_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
      get_current_kw: {
        Args: Record<string, never>
        Returns: { kw_nummer: number; jahr: number }[]
      }
      lookup_email_by_personalnummer: {
        Args: { p_nummer: string }
        Returns: string | null
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

// Convenience Types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Version = Database['public']['Tables']['versions']['Row']
export type MasterPLUItem = Database['public']['Tables']['master_plu_items']['Row']
export type UserOverride = Database['public']['Tables']['user_overrides']['Row']
export type Block = Database['public']['Tables']['blocks']['Row']
export type BlockRule = Database['public']['Tables']['block_rules']['Row']
export type LayoutSettings = Database['public']['Tables']['layout_settings']['Row']
export type Bezeichnungsregel = Database['public']['Tables']['bezeichnungsregeln']['Row']
export type Notification = Database['public']['Tables']['notifications_queue']['Row']
export type CustomProduct = Database['public']['Tables']['custom_products']['Row']
export type HiddenItem = Database['public']['Tables']['hidden_items']['Row']
export type VersionNotification = Database['public']['Tables']['version_notifications']['Row']
