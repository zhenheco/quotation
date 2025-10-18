export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      customers: {
        Row: {
          id: string
          name: Json // { zh: string, en: string }
          email: string
          phone: string | null
          address: Json | null // { zh: string, en: string }
          user_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: Json
          email: string
          phone?: string | null
          address?: Json | null
          user_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: Json
          email?: string
          phone?: string | null
          address?: Json | null
          user_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      products: {
        Row: {
          id: string
          name: Json // { zh: string, en: string }
          description: Json | null // { zh: string, en: string }
          base_price: number
          base_currency: string
          category: string | null
          user_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: Json
          description?: Json | null
          base_price: number
          base_currency: string
          category?: string | null
          user_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: Json
          description?: Json | null
          base_price?: number
          base_currency?: string
          category?: string | null
          user_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      quotations: {
        Row: {
          id: string
          quotation_number: string
          customer_id: string
          issue_date: string
          valid_until: string
          status: 'draft' | 'sent' | 'accepted' | 'rejected'
          currency: string
          exchange_rate: number
          subtotal: number
          tax_rate: number
          tax_amount: number
          total: number
          notes: Json | null // { zh: string, en: string }
          user_id: string
          // Payment tracking fields
          payment_status: 'unpaid' | 'partial' | 'paid' | 'overdue'
          payment_due_date: string | null
          total_paid: number
          deposit_amount: number | null
          deposit_paid_date: string | null
          final_payment_amount: number | null
          final_payment_due_date: string | null
          // Contract fields (when quotation is accepted)
          contract_signed_date: string | null
          contract_expiry_date: string | null
          payment_frequency: 'monthly' | 'quarterly' | 'semi_annual' | 'annual' | null
          next_collection_date: string | null
          next_collection_amount: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          quotation_number: string
          customer_id: string
          issue_date: string
          valid_until: string
          status?: 'draft' | 'sent' | 'accepted' | 'rejected'
          currency: string
          exchange_rate?: number
          subtotal: number
          tax_rate?: number
          tax_amount: number
          total: number
          notes?: Json | null
          user_id: string
          payment_status?: 'unpaid' | 'partial' | 'paid' | 'overdue'
          payment_due_date?: string | null
          total_paid?: number
          deposit_amount?: number | null
          deposit_paid_date?: string | null
          final_payment_amount?: number | null
          final_payment_due_date?: string | null
          contract_signed_date?: string | null
          contract_expiry_date?: string | null
          payment_frequency?: 'monthly' | 'quarterly' | 'semi_annual' | 'annual' | null
          next_collection_date?: string | null
          next_collection_amount?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          quotation_number?: string
          customer_id?: string
          issue_date?: string
          valid_until?: string
          status?: 'draft' | 'sent' | 'accepted' | 'rejected'
          currency?: string
          exchange_rate?: number
          subtotal?: number
          tax_rate?: number
          tax_amount?: number
          total?: number
          notes?: Json | null
          user_id?: string
          payment_status?: 'unpaid' | 'partial' | 'paid' | 'overdue'
          payment_due_date?: string | null
          total_paid?: number
          deposit_amount?: number | null
          deposit_paid_date?: string | null
          final_payment_amount?: number | null
          final_payment_due_date?: string | null
          contract_signed_date?: string | null
          contract_expiry_date?: string | null
          payment_frequency?: 'monthly' | 'quarterly' | 'semi_annual' | 'annual' | null
          next_collection_date?: string | null
          next_collection_amount?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      quotation_items: {
        Row: {
          id: string
          quotation_id: string
          product_id: string | null
          description: Json // { zh: string, en: string }
          quantity: number
          unit_price: number
          discount: number
          amount: number
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          quotation_id: string
          product_id?: string | null
          description: Json
          quantity: number
          unit_price: number
          discount?: number
          amount: number
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          quotation_id?: string
          product_id?: string | null
          description?: Json
          quantity?: number
          unit_price?: number
          discount?: number
          amount?: number
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
      }
      exchange_rates: {
        Row: {
          id: string
          from_currency: string
          to_currency: string
          rate: number
          date: string
          source: string
          created_at: string
        }
        Insert: {
          id?: string
          from_currency: string
          to_currency: string
          rate: number
          date: string
          source: string
          created_at?: string
        }
        Update: {
          id?: string
          from_currency?: string
          to_currency?: string
          rate?: number
          date?: string
          source?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
