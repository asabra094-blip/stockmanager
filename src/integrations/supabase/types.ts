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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id?: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          sort_order?: number
        }
        Relationships: []
      }
      inventory_movements: {
        Row: {
          created_at: string
          id: string
          is_sample: boolean
          note: string | null
          occurred_at: string
          owner_id: string
          product_id: string | null
          product_name: string
          quantity_after: number
          quantity_change: number
          sale_id: string | null
          supplier_id: string | null
          type: string
          unit_cost: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_sample?: boolean
          note?: string | null
          occurred_at?: string
          owner_id?: string
          product_id?: string | null
          product_name: string
          quantity_after: number
          quantity_change: number
          sale_id?: string | null
          supplier_id?: string | null
          type: string
          unit_cost?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          is_sample?: boolean
          note?: string | null
          occurred_at?: string
          owner_id?: string
          product_id?: string | null
          product_name?: string
          quantity_after?: number
          quantity_change?: number
          sale_id?: string | null
          supplier_id?: string | null
          type?: string
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          archived: boolean
          barcode: string | null
          brand: string | null
          category_id: string | null
          created_at: string
          id: string
          image_url: string | null
          imei: string | null
          is_sample: boolean
          location: string | null
          min_stock: number
          model: string | null
          name: string
          notes: string | null
          owner_id: string
          purchase_price: number
          quantity: number
          sale_price: number
          sku: string | null
          supplier_id: string | null
          updated_at: string
        }
        Insert: {
          archived?: boolean
          barcode?: string | null
          brand?: string | null
          category_id?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          imei?: string | null
          is_sample?: boolean
          location?: string | null
          min_stock?: number
          model?: string | null
          name: string
          notes?: string | null
          owner_id?: string
          purchase_price?: number
          quantity?: number
          sale_price?: number
          sku?: string | null
          supplier_id?: string | null
          updated_at?: string
        }
        Update: {
          archived?: boolean
          barcode?: string | null
          brand?: string | null
          category_id?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          imei?: string | null
          is_sample?: boolean
          location?: string | null
          min_stock?: number
          model?: string | null
          name?: string
          notes?: string | null
          owner_id?: string
          purchase_price?: number
          quantity?: number
          sale_price?: number
          sku?: string | null
          supplier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_lines: {
        Row: {
          created_at: string
          id: string
          owner_id: string
          product_id: string | null
          product_name: string
          quantity: number
          sale_id: string
          unit_cost: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          owner_id?: string
          product_id?: string | null
          product_name: string
          quantity: number
          sale_id: string
          unit_cost: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          owner_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          sale_id?: string
          unit_cost?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_lines_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          created_at: string
          discount: number
          id: string
          is_sample: boolean
          note: string | null
          owner_id: string
          returned_at: string | null
          sold_at: string
          status: string
          subtotal: number
          total: number
          total_cost: number
        }
        Insert: {
          created_at?: string
          discount?: number
          id?: string
          is_sample?: boolean
          note?: string | null
          owner_id?: string
          returned_at?: string | null
          sold_at?: string
          status?: string
          subtotal?: number
          total?: number
          total_cost?: number
        }
        Update: {
          created_at?: string
          discount?: number
          id?: string
          is_sample?: boolean
          note?: string | null
          owner_id?: string
          returned_at?: string | null
          sold_at?: string
          status?: string
          subtotal?: number
          total?: number
          total_cost?: number
        }
        Relationships: []
      }
      store_settings: {
        Row: {
          created_at: string
          lbp_rate: number
          min_stock_default: number
          owner_id: string
          show_lbp: boolean
          store_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          lbp_rate?: number
          min_stock_default?: number
          owner_id: string
          show_lbp?: boolean
          store_name?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          lbp_rate?: number
          min_stock_default?: number
          owner_id?: string
          show_lbp?: boolean
          store_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          created_at: string
          id: string
          is_sample: boolean
          name: string
          notes: string | null
          owner_id: string
          phone: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_sample?: boolean
          name: string
          notes?: string | null
          owner_id?: string
          phone?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_sample?: boolean
          name?: string
          notes?: string | null
          owner_id?: string
          phone?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      clear_sample_data: { Args: never; Returns: undefined }
      handle_new_user_cats: { Args: { p_uid: string }; Returns: undefined }
      load_sample_data: { Args: never; Returns: undefined }
      record_sale: {
        Args: {
          p_discount?: number
          p_lines: Json
          p_note?: string
          p_sold_at?: string
        }
        Returns: string
      }
      restock_product: {
        Args: {
          p_date?: string
          p_note?: string
          p_product_id: string
          p_quantity: number
          p_supplier_id?: string
          p_unit_cost: number
          p_update_cost?: boolean
        }
        Returns: undefined
      }
      return_sale: {
        Args: { p_note?: string; p_sale_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const