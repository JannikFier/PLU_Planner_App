// Generierte Supabase Database Types
// Wird später mit supabase gen types ersetzt – bis dahin manuelle Definition

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string
          name: string
          logo_url: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          logo_url?: string | null
          is_active?: boolean
        }
        Update: {
          name?: string
          logo_url?: string | null
          is_active?: boolean
          updated_at?: string
        }
      }
      stores: {
        Row: {
          id: string
          company_id: string
          name: string
          subdomain: string
          logo_url: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          name: string
          subdomain: string
          logo_url?: string | null
          is_active?: boolean
        }
        Update: {
          company_id?: string
          name?: string
          subdomain?: string
          logo_url?: string | null
          is_active?: boolean
          updated_at?: string
        }
      }
      user_store_access: {
        Row: {
          id: string
          user_id: string
          store_id: string
          is_home_store: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          store_id: string
          is_home_store?: boolean
        }
        Update: {
          is_home_store?: boolean
        }
      }
      store_list_visibility: {
        Row: {
          id: string
          store_id: string
          list_type: string
          is_visible: boolean
        }
        Insert: {
          id?: string
          store_id: string
          list_type: string
          is_visible?: boolean
        }
        Update: {
          is_visible?: boolean
        }
      }
      user_list_visibility: {
        Row: {
          id: string
          user_id: string
          store_id: string
          list_type: string
          is_visible: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          store_id: string
          list_type: string
          is_visible?: boolean
        }
        Update: {
          is_visible?: boolean
        }
      }
      user_tutorial_state: {
        Row: {
          user_id: string
          store_id: string
          state: Record<string, unknown>
          updated_at: string
        }
        Insert: {
          user_id: string
          store_id: string
          state?: Record<string, unknown>
          updated_at?: string
        }
        Update: {
          state?: Record<string, unknown>
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          email: string
          personalnummer: string
          display_name: string | null
          role: 'super_admin' | 'admin' | 'user' | 'viewer' | 'kiosk'
          must_change_password: boolean
          created_by: string | null
          created_at: string
          last_login: string | null
          current_store_id: string | null
        }
        Insert: {
          id: string
          email: string
          personalnummer: string
          display_name?: string | null
          role?: 'super_admin' | 'admin' | 'user' | 'viewer' | 'kiosk'
          must_change_password?: boolean
          created_by?: string | null
          created_at?: string
          last_login?: string | null
          current_store_id?: string | null
        }
        Update: {
          id?: string
          email?: string
          personalnummer?: string
          display_name?: string | null
          role?: 'super_admin' | 'admin' | 'user' | 'viewer' | 'kiosk'
          must_change_password?: boolean
          last_login?: string | null
          current_store_id?: string | null
        }
      }
      store_kiosk_entrances: {
        Row: {
          id: string
          store_id: string
          token: string
          created_at: string
          revoked_at: string | null
        }
        Insert: {
          id?: string
          store_id: string
          token: string
          created_at?: string
          revoked_at?: string | null
        }
        Update: {
          revoked_at?: string | null
        }
      }
      store_kiosk_registers: {
        Row: {
          id: string
          store_id: string
          sort_order: number
          display_label: string
          auth_user_id: string
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          store_id: string
          sort_order: number
          display_label: string
          auth_user_id: string
          active?: boolean
          created_at?: string
        }
        Update: {
          sort_order?: number
          display_label?: string
          active?: boolean
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
          is_manual_supplement: boolean
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
          is_manual_supplement?: boolean
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
          is_manual_supplement?: boolean
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
          store_id: string
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
          show_week_mon_sat_in_labels: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          store_id: string
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
          show_week_mon_sat_in_labels?: boolean
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
          show_week_mon_sat_in_labels?: boolean
        }
      }
      bezeichnungsregeln: {
        Row: {
          id: string
          store_id: string
          keyword: string
          position: 'PREFIX' | 'SUFFIX'
          case_sensitive: boolean
          is_active: boolean
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          store_id: string
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
          store_id: string
        }
        Insert: {
          id?: string
          plu: string
          name: string
          item_type: 'PIECE' | 'WEIGHT'
          preis?: number | null
          block_id?: string | null
          created_by: string
          store_id?: string
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
          store_id: string
        }
        Insert: {
          id?: string
          plu: string
          hidden_by: string
          store_id?: string
        }
        Update: {
          plu?: string
        }
      }
      store_list_carryover: {
        Row: {
          id: string
          store_id: string
          list_type: 'obst' | 'backshop'
          for_version_id: string
          from_version_id: string
          plu: string
          system_name: string
          display_name: string | null
          item_type: 'PIECE' | 'WEIGHT'
          preis: number | null
          block_id: string | null
          warengruppe: string | null
          old_plu: string | null
          image_url: string | null
          source: string | null
          market_include: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          store_id: string
          list_type: 'obst' | 'backshop'
          for_version_id: string
          from_version_id: string
          plu: string
          system_name: string
          display_name?: string | null
          item_type: 'PIECE' | 'WEIGHT'
          preis?: number | null
          block_id?: string | null
          warengruppe?: string | null
          old_plu?: string | null
          image_url?: string | null
          source?: string | null
          market_include?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          system_name?: string
          display_name?: string | null
          item_type?: 'PIECE' | 'WEIGHT'
          preis?: number | null
          block_id?: string | null
          warengruppe?: string | null
          old_plu?: string | null
          image_url?: string | null
          source?: string | null
          market_include?: boolean
          updated_at?: string
          updated_by?: string | null
        }
      }
      plu_offer_items: {
        Row: {
          id: string
          plu: string
          start_kw: number
          start_jahr: number
          duration_weeks: number
          created_by: string
          created_at: string
          store_id?: string
          promo_price: number | null
          offer_source: 'manual'
        }
        Insert: {
          id?: string
          plu: string
          start_kw: number
          start_jahr: number
          duration_weeks: number
          created_by: string
          store_id?: string
          promo_price?: number | null
          offer_source?: 'manual'
        }
        Update: {
          plu?: string
          start_kw?: number
          start_jahr?: number
          duration_weeks?: number
          promo_price?: number | null
          offer_source?: 'manual'
        }
      }
      obst_offer_campaigns: {
        Row: {
          id: string
          kw_nummer: number
          jahr: number
          campaign_kind: 'exit' | 'ordersatz_week' | 'ordersatz_3day'
          source_file_name: string | null
          created_at: string
          created_by: string
        }
        Insert: {
          id?: string
          kw_nummer: number
          jahr: number
          campaign_kind: 'exit' | 'ordersatz_week' | 'ordersatz_3day'
          source_file_name?: string | null
          created_at?: string
          created_by: string
        }
        Update: {
          kw_nummer?: number
          jahr?: number
          campaign_kind?: 'exit' | 'ordersatz_week' | 'ordersatz_3day'
          source_file_name?: string | null
        }
      }
      obst_offer_campaign_lines: {
        Row: {
          id: string
          campaign_id: string
          plu: string | null
          promo_price: number
          sort_index: number
          source_art_nr: string | null
          source_plu: string | null
          source_artikel: string | null
          origin: 'excel' | 'manual' | 'unassigned'
        }
        Insert: {
          id?: string
          campaign_id: string
          plu?: string | null
          promo_price: number
          sort_index?: number
          source_art_nr?: string | null
          source_plu?: string | null
          source_artikel?: string | null
          origin?: 'excel' | 'manual' | 'unassigned'
        }
        Update: {
          plu?: string | null
          promo_price?: number
          sort_index?: number
          source_art_nr?: string | null
          source_plu?: string | null
          source_artikel?: string | null
          origin?: 'excel' | 'manual' | 'unassigned'
        }
      }
      obst_offer_store_disabled: {
        Row: {
          store_id: string
          plu: string
          created_at: string
          created_by: string | null
        }
        Insert: {
          store_id: string
          plu: string
          created_at?: string
          created_by?: string | null
        }
        Update: Record<string, never>
      }
      obst_offer_store_local_prices: {
        Row: {
          store_id: string
          plu: string
          kw_nummer: number
          jahr: number
          local_promo_price: number
          updated_at: string
        }
        Insert: {
          store_id: string
          plu: string
          kw_nummer: number
          jahr: number
          local_promo_price: number
          updated_at?: string
        }
        Update: {
          local_promo_price?: number
          updated_at?: string
        }
      }
      renamed_items: {
        Row: {
          id: string
          plu: string
          store_id: string
          display_name: string
          is_manually_renamed: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          plu: string
          store_id: string
          display_name: string
          is_manually_renamed?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          display_name?: string
          is_manually_renamed?: boolean
          updated_at?: string
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
          store_id: string
        }
        Insert: {
          id?: string
          user_id: string
          version_id: string
          is_read?: boolean
          read_at?: string | null
          store_id?: string
        }
        Update: {
          is_read?: boolean
          read_at?: string | null
        }
      }
      // Backshop (getrennte Liste)
      backshop_versions: {
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
          transfer_week_started_at: string | null
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
          transfer_week_started_at?: string | null
        }
        Update: {
          kw_nummer?: number
          jahr?: number
          status?: 'draft' | 'active' | 'frozen'
          published_at?: string | null
          frozen_at?: string | null
          delete_after?: string | null
          transfer_week_started_at?: string | null
        }
      }
      backshop_version_source_publish: {
        Row: {
          version_id: string
          source: 'edeka' | 'harry' | 'aryzta'
          published_at: string
          published_by: string | null
          row_count: number
          updated_at: string
        }
        Insert: {
          version_id: string
          source: 'edeka' | 'harry' | 'aryzta'
          published_at: string
          published_by?: string | null
          row_count: number
          updated_at?: string
        }
        Update: {
          published_at?: string
          published_by?: string | null
          row_count?: number
          updated_at?: string
        }
      }
      backshop_master_plu_items: {
        Row: {
          id: string
          version_id: string
          plu: string
          system_name: string
          display_name: string | null
          status: 'UNCHANGED' | 'NEW_PRODUCT_YELLOW' | 'PLU_CHANGED_RED'
          old_plu: string | null
          warengruppe: string | null
          block_id: string | null
          is_manually_renamed: boolean
          image_url: string | null
          source: 'edeka' | 'harry' | 'aryzta' | 'manual'
          is_manual_supplement: boolean
          created_at: string
        }
        Insert: {
          id?: string
          version_id: string
          plu: string
          system_name: string
          display_name?: string | null
          status?: 'UNCHANGED' | 'NEW_PRODUCT_YELLOW' | 'PLU_CHANGED_RED'
          old_plu?: string | null
          warengruppe?: string | null
          block_id?: string | null
          is_manually_renamed?: boolean
          image_url?: string | null
          source?: 'edeka' | 'harry' | 'aryzta' | 'manual'
          is_manual_supplement?: boolean
          created_at?: string
        }
        Update: {
          plu?: string
          system_name?: string
          display_name?: string | null
          status?: 'UNCHANGED' | 'NEW_PRODUCT_YELLOW' | 'PLU_CHANGED_RED'
          old_plu?: string | null
          warengruppe?: string | null
          block_id?: string | null
          is_manually_renamed?: boolean
          image_url?: string | null
          source?: 'edeka' | 'harry' | 'aryzta' | 'manual'
          is_manual_supplement?: boolean
        }
      }
      backshop_blocks: {
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
          created_at?: string
        }
        Update: {
          name?: string
          order_index?: number
        }
      }
      backshop_block_rules: {
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
          created_at?: string
        }
        Update: {
          rule_type?: 'NAME_CONTAINS' | 'NAME_REGEX' | 'PLU_RANGE'
          value?: string
          case_sensitive?: boolean
          modify_name_action?: 'PREFIX' | 'SUFFIX' | 'NONE' | null
          modify_name_keyword?: string | null
        }
      }
      backshop_custom_products: {
        Row: {
          id: string
          plu: string
          name: string
          image_url: string
          block_id: string | null
          created_by: string
          created_at: string
          updated_at: string
          store_id: string
          /** true: Block „Neue Produkte“ auf Angebots-PDF; false: fest in Hauptliste */
          is_offer_sheet_test: boolean
        }
        Insert: {
          id?: string
          plu: string
          name: string
          image_url: string
          block_id?: string | null
          created_by: string
          store_id?: string
          created_at?: string
          updated_at?: string
          is_offer_sheet_test?: boolean
        }
        Update: {
          plu?: string
          name?: string
          image_url?: string
          block_id?: string | null
          updated_at?: string
          is_offer_sheet_test?: boolean
        }
      }
      backshop_hidden_items: {
        Row: {
          id: string
          plu: string
          hidden_by: string
          created_at: string
          store_id: string
        }
        Insert: {
          id?: string
          plu: string
          hidden_by: string
          store_id?: string
          created_at?: string
        }
        Update: Record<string, never>
      }
      backshop_store_line_visibility_overrides: {
        Row: {
          id: string
          store_id: string
          plu: string
          source: 'edeka' | 'harry' | 'aryzta' | 'manual'
          mode: 'force_show' | 'force_hide'
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          store_id: string
          plu: string
          source: 'edeka' | 'harry' | 'aryzta' | 'manual'
          mode: 'force_show' | 'force_hide'
          created_at?: string
          created_by?: string | null
        }
        Update: {
          mode?: 'force_show' | 'force_hide'
          created_at?: string
          created_by?: string | null
        }
      }
      backshop_renamed_items: {
        Row: {
          id: string
          plu: string
          display_name: string
          is_manually_renamed: boolean
          image_url: string | null
          created_by: string | null
          created_at: string
          updated_at: string
          store_id: string
        }
        Insert: {
          id?: string
          plu: string
          display_name: string
          is_manually_renamed?: boolean
          image_url?: string | null
          created_by?: string | null
          store_id?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          display_name?: string
          is_manually_renamed?: boolean
          image_url?: string | null
          updated_at?: string
        }
      }
      backshop_offer_items: {
        Row: {
          id: string
          plu: string
          start_kw: number
          start_jahr: number
          duration_weeks: number
          created_by: string
          created_at: string
          store_id?: string
          promo_price: number | null
          offer_source: 'manual'
        }
        Insert: {
          id?: string
          plu: string
          start_kw: number
          start_jahr: number
          duration_weeks: number
          created_by: string
          store_id?: string
          promo_price?: number | null
          offer_source?: 'manual'
        }
        Update: {
          plu?: string
          start_kw?: number
          start_jahr?: number
          duration_weeks?: number
          promo_price?: number | null
          offer_source?: 'manual'
        }
      }
      backshop_offer_campaigns: {
        Row: {
          id: string
          kw_nummer: number
          jahr: number
          source_file_name: string | null
          /** Auslieferung ab (Exit-Excel), nur Datum */
          auslieferung_ab: string | null
          created_at: string
          created_by: string
        }
        Insert: {
          id?: string
          kw_nummer: number
          jahr: number
          source_file_name?: string | null
          auslieferung_ab?: string | null
          created_at?: string
          created_by: string
        }
        Update: {
          kw_nummer?: number
          jahr?: number
          source_file_name?: string | null
          auslieferung_ab?: string | null
        }
      }
      backshop_offer_campaign_lines: {
        Row: {
          id: string
          campaign_id: string
          plu: string | null
          promo_price: number
          /** Erwerbspreis aus Zentral-Excel (optional) */
          purchase_price: number | null
          /** Listen-EK (optional) */
          list_ek: number | null
          /** Listen-VK (optional) */
          list_vk: number | null
          sort_index: number
          source_art_nr: string | null
          source_plu: string | null
          source_artikel: string | null
          origin: 'excel' | 'manual' | 'unassigned'
        }
        Insert: {
          id?: string
          campaign_id: string
          plu?: string | null
          promo_price: number
          purchase_price?: number | null
          list_ek?: number | null
          list_vk?: number | null
          sort_index?: number
          source_art_nr?: string | null
          source_plu?: string | null
          source_artikel?: string | null
          origin?: 'excel' | 'manual' | 'unassigned'
        }
        Update: {
          plu?: string | null
          promo_price?: number
          purchase_price?: number | null
          list_ek?: number | null
          list_vk?: number | null
          sort_index?: number
          source_art_nr?: string | null
          source_plu?: string | null
          source_artikel?: string | null
          origin?: 'excel' | 'manual' | 'unassigned'
        }
      }
      backshop_offer_store_disabled: {
        Row: {
          store_id: string
          plu: string
          created_at: string
          created_by: string | null
        }
        Insert: {
          store_id: string
          plu: string
          created_at?: string
          created_by?: string | null
        }
        Update: Record<string, never>
      }
      backshop_offer_store_local_prices: {
        Row: {
          store_id: string
          plu: string
          kw_nummer: number
          jahr: number
          local_promo_price: number
          updated_at: string
        }
        Insert: {
          store_id: string
          plu: string
          kw_nummer: number
          jahr: number
          local_promo_price: number
          updated_at?: string
        }
        Update: {
          local_promo_price?: number
          updated_at?: string
        }
      }
      backshop_werbung_weekday_quantities: {
        Row: {
          store_id: string
          kw_nummer: number
          jahr: number
          plu: string
          qty_mo: number | null
          qty_di: number | null
          qty_mi: number | null
          qty_do: number | null
          qty_fr: number | null
          qty_sa: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          store_id: string
          kw_nummer: number
          jahr: number
          plu: string
          qty_mo?: number | null
          qty_di?: number | null
          qty_mi?: number | null
          qty_do?: number | null
          qty_fr?: number | null
          qty_sa?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          qty_mo?: number | null
          qty_di?: number | null
          qty_mi?: number | null
          qty_do?: number | null
          qty_fr?: number | null
          qty_sa?: number | null
          updated_at?: string
          updated_by?: string | null
        }
      }
      backshop_version_notifications: {
        Row: {
          id: string
          user_id: string
          version_id: string
          is_read: boolean
          read_at: string | null
          created_at: string
          store_id: string
        }
        Insert: {
          id?: string
          user_id: string
          version_id: string
          is_read?: boolean
          read_at?: string | null
          store_id?: string
          created_at?: string
        }
        Update: {
          is_read?: boolean
          read_at?: string | null
        }
      }
      backshop_layout_settings: {
        Row: {
          id: string
          store_id: string
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
          page_break_per_block: boolean
          show_week_mon_sat_in_labels: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          store_id: string
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
          page_break_per_block?: boolean
          show_week_mon_sat_in_labels?: boolean
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
          page_break_per_block?: boolean
          show_week_mon_sat_in_labels?: boolean
        }
      }
      backshop_bezeichnungsregeln: {
        Row: {
          id: string
          store_id: string
          keyword: string
          position: 'PREFIX' | 'SUFFIX'
          case_sensitive: boolean
          is_active: boolean
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          store_id: string
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
      store_obst_block_order: {
        Row: {
          store_id: string
          block_id: string
          order_index: number
          updated_at: string
        }
        Insert: {
          store_id: string
          block_id: string
          order_index?: number
          updated_at?: string
        }
        Update: {
          order_index?: number
          updated_at?: string
        }
      }
      store_backshop_block_order: {
        Row: {
          store_id: string
          block_id: string
          order_index: number
          updated_at: string
        }
        Insert: {
          store_id: string
          block_id: string
          order_index?: number
          updated_at?: string
        }
        Update: {
          order_index?: number
          updated_at?: string
        }
      }
      store_obst_name_block_override: {
        Row: {
          store_id: string
          system_name_normalized: string
          block_id: string
          updated_at: string
        }
        Insert: {
          store_id: string
          system_name_normalized: string
          block_id: string
          updated_at?: string
        }
        Update: {
          block_id?: string
          updated_at?: string
        }
      }
      store_backshop_name_block_override: {
        Row: {
          store_id: string
          system_name_normalized: string
          block_id: string
          updated_at: string
        }
        Insert: {
          store_id: string
          system_name_normalized: string
          block_id: string
          updated_at?: string
        }
        Update: {
          block_id?: string
          updated_at?: string
        }
      }
      backshop_product_groups: {
        Row: {
          id: string
          display_name: string
          block_id: string | null
          origin: 'auto' | 'manual'
          needs_review: boolean
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          display_name: string
          block_id?: string | null
          origin?: 'auto' | 'manual'
          needs_review?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          display_name?: string
          block_id?: string | null
          origin?: 'auto' | 'manual'
          needs_review?: boolean
          updated_at?: string
        }
      }
      backshop_product_group_members: {
        Row: {
          group_id: string
          plu: string
          source: 'edeka' | 'harry' | 'aryzta'
          added_at: string
        }
        Insert: {
          group_id: string
          plu: string
          source: 'edeka' | 'harry' | 'aryzta'
          added_at?: string
        }
        Update: {
          group_id?: string
        }
      }
      backshop_source_choice_per_store: {
        Row: {
          id: string
          store_id: string
          group_id: string
          chosen_sources: ('edeka' | 'harry' | 'aryzta')[]
          origin: 'bulk' | 'manual'
          created_at: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          store_id: string
          group_id: string
          chosen_sources?: ('edeka' | 'harry' | 'aryzta')[]
          origin?: 'bulk' | 'manual'
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          chosen_sources?: ('edeka' | 'harry' | 'aryzta')[]
          origin?: 'bulk' | 'manual'
          updated_by?: string | null
          updated_at?: string
        }
      }
      backshop_source_rules_per_store: {
        Row: {
          id: string
          store_id: string
          block_id: string
          preferred_source: 'edeka' | 'harry' | 'aryzta'
          created_at: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          store_id: string
          block_id: string
          preferred_source: 'edeka' | 'harry' | 'aryzta'
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          preferred_source?: 'edeka' | 'harry' | 'aryzta'
          updated_by?: string | null
          updated_at?: string
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
      /** Eigenes Profil (RLS-umgehend); null wenn keine Zeile zu auth.uid(). */
      get_my_profile: {
        Args: Record<string, never>
        Returns: Record<string, unknown> | null
      }
      rename_backshop_master_plu_item: {
        Args: { item_id: string; new_display_name: string; new_image_url?: string | null }
        Returns: undefined
      }
      reset_backshop_master_plu_item_display_name: {
        Args: { item_id: string; system_name: string }
        Returns: undefined
      }
      get_user_store_ids: {
        Args: Record<string, never>
        Returns: string[]
      }
      get_current_store_id: {
        Args: Record<string, never>
        Returns: string | null
      }
      get_store_company_id: {
        Args: { p_store_id: string }
        Returns: string | null
      }
      get_home_store_subdomain: {
        Args: { p_user_id: string }
        Returns: string | null
      }
      insert_obst_manual_supplement: {
        Args: {
          p_version_id: string
          p_plu: string
          p_system_name: string
          p_item_type: string
          p_block_id?: string | null
          p_preis?: number | null
        }
        Returns: string
      }
      insert_backshop_manual_supplement: {
        Args: {
          p_version_id: string
          p_plu: string
          p_system_name: string
          p_image_url: string
          p_block_id?: string | null
        }
        Returns: string
      }
      carry_over_obst_manual_supplements: {
        Args: { p_from_version_id: string; p_to_version_id: string }
        Returns: number
      }
      carry_over_backshop_manual_supplements: {
        Args: { p_from_version_id: string; p_to_version_id: string }
        Returns: number
      }
      update_obst_manual_supplement: {
        Args: {
          p_id: string
          p_plu: string
          p_system_name: string
          p_item_type: string
          p_block_id?: string | null
          p_preis?: number | null
        }
        Returns: undefined
      }
      update_backshop_manual_supplement: {
        Args: {
          p_id: string
          p_plu: string
          p_system_name: string
          p_image_url: string
          p_block_id?: string | null
        }
        Returns: undefined
      }
      set_backshop_transfer_week_started: {
        Args: Record<string, never>
        Returns: undefined
      }
      delete_backshop_master_items_by_source: {
        Args: { p_version_id: string; p_source: string }
        Returns: undefined
      }
      kiosk_list_registers: {
        Args: { p_token: string }
        Returns: {
          id: string
          display_label: string
          sort_order: number
          store_id: string
          store_name: string
          company_name: string
        }[]
      }
      kiosk_resolve_register_auth: {
        Args: { p_token: string; p_register_id: string }
        Returns: { email: string }[]
      }
      kiosk_finalize_entrance_session: {
        Args: { p_token: string }
        Returns: undefined
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

// Convenience Types – Multi-Tenancy
export type Company = Database['public']['Tables']['companies']['Row']
export type Store = Database['public']['Tables']['stores']['Row']
export type UserStoreAccess = Database['public']['Tables']['user_store_access']['Row']
export type StoreListVisibility = Database['public']['Tables']['store_list_visibility']['Row']
export type UserListVisibility = Database['public']['Tables']['user_list_visibility']['Row']
export type UserTutorialStateRow = Database['public']['Tables']['user_tutorial_state']['Row']

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
export type RenamedItem = Database['public']['Tables']['renamed_items']['Row']
export type OfferItem = Database['public']['Tables']['plu_offer_items']['Row']
export type ObstOfferCampaign = Database['public']['Tables']['obst_offer_campaigns']['Row']
export type ObstOfferCampaignLine = Database['public']['Tables']['obst_offer_campaign_lines']['Row']
export type ObstOfferStoreDisabled = Database['public']['Tables']['obst_offer_store_disabled']['Row']
export type ObstOfferStoreLocalPrice = Database['public']['Tables']['obst_offer_store_local_prices']['Row']
export type VersionNotification = Database['public']['Tables']['version_notifications']['Row']
export type StoreListCarryover = Database['public']['Tables']['store_list_carryover']['Row']

// Backshop
export type BackshopVersion = Database['public']['Tables']['backshop_versions']['Row']
export type BackshopVersionSourcePublish = Database['public']['Tables']['backshop_version_source_publish']['Row']
export type BackshopMasterPLUItem = Database['public']['Tables']['backshop_master_plu_items']['Row']
export type BackshopBlock = Database['public']['Tables']['backshop_blocks']['Row']
export type BackshopCustomProduct = Database['public']['Tables']['backshop_custom_products']['Row']
export type BackshopHiddenItem = Database['public']['Tables']['backshop_hidden_items']['Row']
export type BackshopRenamedItem = Database['public']['Tables']['backshop_renamed_items']['Row']
export type BackshopOfferItem = Database['public']['Tables']['backshop_offer_items']['Row']
export type BackshopOfferCampaign = Database['public']['Tables']['backshop_offer_campaigns']['Row']
export type BackshopOfferCampaignLine = Database['public']['Tables']['backshop_offer_campaign_lines']['Row']
export type BackshopOfferStoreDisabled = Database['public']['Tables']['backshop_offer_store_disabled']['Row']
export type BackshopOfferStoreLocalPrice = Database['public']['Tables']['backshop_offer_store_local_prices']['Row']
export type BackshopWerbungWeekdayQuantity = Database['public']['Tables']['backshop_werbung_weekday_quantities']['Row']
export type BackshopVersionNotification = Database['public']['Tables']['backshop_version_notifications']['Row']
export type BackshopLayoutSettings = Database['public']['Tables']['backshop_layout_settings']['Row']
export type BackshopBlockRule = Database['public']['Tables']['backshop_block_rules']['Row']
export type BackshopBezeichnungsregel = Database['public']['Tables']['backshop_bezeichnungsregeln']['Row']
export type StoreObstBlockOrder = Database['public']['Tables']['store_obst_block_order']['Row']
export type StoreBackshopBlockOrder = Database['public']['Tables']['store_backshop_block_order']['Row']
export type StoreObstNameBlockOverride = Database['public']['Tables']['store_obst_name_block_override']['Row']
export type StoreBackshopNameBlockOverride = Database['public']['Tables']['store_backshop_name_block_override']['Row']

// Backshop Multi-Source (Edeka/Harry/Aryzta)
export type BackshopSource = 'edeka' | 'harry' | 'aryzta' | 'manual'
export type BackshopProductGroup = Database['public']['Tables']['backshop_product_groups']['Row']
export type BackshopProductGroupMember = Database['public']['Tables']['backshop_product_group_members']['Row']
export type BackshopSourceChoicePerStore = Database['public']['Tables']['backshop_source_choice_per_store']['Row']
export type BackshopSourceRulePerStore = Database['public']['Tables']['backshop_source_rules_per_store']['Row']
