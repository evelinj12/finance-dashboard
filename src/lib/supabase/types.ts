// Hand-written to match supabase/migrations/.
// Once the project is deployed, regenerate with:
//   npx supabase gen types typescript --project-id <id> > src/lib/supabase/types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type CategoryTag = "income" | "sinking_fund" | "fixed" | "spent";
export type TxDirection = "in" | "out";
export type EntrySource = "manual" | "import";
export type IncomeSourceType = "freelance_client" | "digital_product" | "other";
export type IncomePaymentStatus = "waiting" | "paid";
export type ContractorPaymentStatus = "owed" | "paid" | "transferred" | "unknown";
export type TeamWorkStatus = "owed" | "paid";
export type NetWorthBreakdownQuality = "full" | "total_only";
export type NetWorthCategoryGroup = "asset" | "liability";
export type GoalType = "net_worth" | "income" | "savings";

export interface Database {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string;
          name: string;
          tag: CategoryTag;
          notes: string | null;
          active: boolean;
          sort_order: number;
          source_key: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["categories"]["Row"]> & {
          name: string;
          tag: CategoryTag;
        };
        Update: Partial<Database["public"]["Tables"]["categories"]["Row"]>;
        Relationships: [];
      };
      sinking_funds: {
        Row: {
          id: string;
          category_id: string | null;
          name: string;
          monthly_amount: number;
          due_date: string | null;
          rolling: boolean;
          notes: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["sinking_funds"]["Row"]> & {
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["sinking_funds"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "sinking_funds_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      budgets: {
        Row: {
          id: string;
          category_id: string;
          month: string;
          budget_amount: number;
          currency: string;
          source_sheet: string | null;
          source_row: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["budgets"]["Row"]> & {
          category_id: string;
          month: string;
        };
        Update: Partial<Database["public"]["Tables"]["budgets"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "budgets_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      transactions: {
        Row: {
          id: string;
          date: string;
          category_id: string;
          direction: TxDirection;
          amount: number;
          currency: string;
          fx_rate: number;
          amount_idr: number;
          notes: string | null;
          save_to: string | null;
          source: EntrySource;
          source_sheet: string | null;
          source_row: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["transactions"]["Row"]> & {
          date: string;
          category_id: string;
          direction: TxDirection;
          amount: number;
          amount_idr: number;
        };
        Update: Partial<Database["public"]["Tables"]["transactions"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "transactions_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      income_sources: {
        Row: {
          id: string;
          name: string;
          type: IncomeSourceType;
          notes: string | null;
          active: boolean;
          source_key: string | null;
          visible_in_active_breakdown: boolean;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["income_sources"]["Row"]> & {
          name: string;
          type: IncomeSourceType;
        };
        Update: Partial<Database["public"]["Tables"]["income_sources"]["Row"]>;
        Relationships: [];
      };
      income_transactions: {
        Row: {
          id: string;
          income_source_id: string;
          date: string;
          description: string | null;
          amount: number;
          currency: string;
          fx_rate: number;
          amount_idr: number;
          status: string | null;
          payment_status: IncomePaymentStatus;
          total_hours: number | null;
          source: EntrySource;
          source_sheet: string | null;
          source_row: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["income_transactions"]["Row"]> & {
          income_source_id: string;
          date: string;
          amount: number;
          amount_idr: number;
        };
        Update: Partial<Database["public"]["Tables"]["income_transactions"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "income_transactions_income_source_id_fkey";
            columns: ["income_source_id"];
            isOneToOne: false;
            referencedRelation: "income_sources";
            referencedColumns: ["id"];
          },
        ];
      };
      team_members: {
        Row: {
          id: string;
          name: string;
          active: boolean;
          default_currency: string;
          notes: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["team_members"]["Row"]> & {
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["team_members"]["Row"]>;
        Relationships: [];
      };
      team_work_entries: {
        Row: {
          id: string;
          team_member_id: string;
          income_source_id: string | null;
          source_contractor_payment_id: string | null;
          date: string;
          description: string | null;
          work_period: string | null;
          hours: number | null;
          amount: number;
          currency: string;
          fx_rate: number;
          amount_idr: number;
          status: TeamWorkStatus;
          paid_at: string | null;
          source_sheet: string | null;
          source_row: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["team_work_entries"]["Row"]> & {
          team_member_id: string;
          date: string;
          amount: number;
          amount_idr: number;
        };
        Update: Partial<Database["public"]["Tables"]["team_work_entries"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "team_work_entries_team_member_id_fkey";
            columns: ["team_member_id"];
            isOneToOne: false;
            referencedRelation: "team_members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_work_entries_income_source_id_fkey";
            columns: ["income_source_id"];
            isOneToOne: false;
            referencedRelation: "income_sources";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_work_entries_source_contractor_payment_id_fkey";
            columns: ["source_contractor_payment_id"];
            isOneToOne: true;
            referencedRelation: "contractor_payments";
            referencedColumns: ["id"];
          },
        ];
      };
      monthly_income_rollups: {
        Row: {
          month: string;
          client_income_idr: number;
          digital_product_income_idr: number;
          total_income_idr: number;
          source: EntrySource;
          source_sheet: string | null;
          source_row: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["monthly_income_rollups"]["Row"]> & {
          month: string;
          total_income_idr: number;
        };
        Update: Partial<Database["public"]["Tables"]["monthly_income_rollups"]["Row"]>;
        Relationships: [];
      };
      contractor_payments: {
        Row: {
          id: string;
          date: string;
          payee: string;
          amount: number;
          currency: string;
          fx_rate: number;
          amount_idr: number;
          related_income_transaction_id: string | null;
          client_or_project: string | null;
          work_period: string | null;
          hours: number | null;
          status: ContractorPaymentStatus;
          paid_at: string | null;
          source_sheet: string | null;
          source_row: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["contractor_payments"]["Row"]> & {
          date: string;
          amount: number;
          amount_idr: number;
        };
        Update: Partial<Database["public"]["Tables"]["contractor_payments"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "contractor_payments_related_income_transaction_id_fkey";
            columns: ["related_income_transaction_id"];
            isOneToOne: false;
            referencedRelation: "income_transactions";
            referencedColumns: ["id"];
          },
        ];
      };
      dashboard_preferences: {
        Row: {
          key: string;
          value: Json;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["dashboard_preferences"]["Row"]> & {
          key: string;
          value: Json;
        };
        Update: Partial<Database["public"]["Tables"]["dashboard_preferences"]["Row"]>;
        Relationships: [];
      };
      net_worth_snapshots: {
        Row: {
          id: string;
          month: string;
          snapshot_date: string | null;
          cash: number;
          investments: number;
          retirement: number;
          personal: number;
          unsecured_liabilities: number;
          secured_liabilities: number;
          notes: string | null;
          created_at: string;
          source_sheet: string | null;
          source_row: string | null;
          breakdown_quality: NetWorthBreakdownQuality;
          total_assets: number;
          total_liabilities: number;
          net_worth: number;
        };
        Insert: Partial<
          Omit<
            Database["public"]["Tables"]["net_worth_snapshots"]["Row"],
            "total_assets" | "total_liabilities" | "net_worth"
          >
        > & {
          month: string;
          total_assets?: never;
          total_liabilities?: never;
          net_worth?: never;
        };
        Update: Partial<
          Omit<
            Database["public"]["Tables"]["net_worth_snapshots"]["Row"],
            "total_assets" | "total_liabilities" | "net_worth"
          >
        > & {
          total_assets?: never;
          total_liabilities?: never;
          net_worth?: never;
        };
        Relationships: [];
      };
      net_worth_categories: {
        Row: {
          id: string;
          name: string;
          group_name: NetWorthCategoryGroup;
          sort_order: number;
          active: boolean;
          source_key: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["net_worth_categories"]["Row"]> & {
          name: string;
          group_name: NetWorthCategoryGroup;
        };
        Update: Partial<Database["public"]["Tables"]["net_worth_categories"]["Row"]>;
        Relationships: [];
      };
      net_worth_category_values: {
        Row: {
          id: string;
          snapshot_id: string;
          category_id: string;
          amount_idr: number;
          notes: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["net_worth_category_values"]["Row"]> & {
          snapshot_id: string;
          category_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["net_worth_category_values"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "net_worth_category_values_snapshot_id_fkey";
            columns: ["snapshot_id"];
            isOneToOne: false;
            referencedRelation: "net_worth_snapshots";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "net_worth_category_values_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "net_worth_categories";
            referencedColumns: ["id"];
          },
        ];
      };
      goals: {
        Row: {
          id: string;
          type: GoalType;
          year: number;
          target_amount: number;
          currency: string;
          notes: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["goals"]["Row"]> & {
          type: GoalType;
          year: number;
          target_amount: number;
        };
        Update: Partial<Database["public"]["Tables"]["goals"]["Row"]>;
        Relationships: [];
      };
    };
    Views: {
      monthly_finance_summary_v2: {
        Row: {
          month: string;
          total_income_idr: number;
          monthly_rollup_income_idr: number;
          detailed_total_income_idr: number;
          active_income_idr: number;
          inactive_income_idr: number;
          active_visible_income_idr: number;
          active_hidden_income_idr: number;
          freelance_client_income_idr: number;
          digital_product_income_idr: number;
          other_income_idr: number;
          category_income_actual_idr: number;
          reconciliation_category_income_idr: number;
          fixed_expenses_idr: number;
          variable_spend_idr: number;
          sinking_funds_idr: number;
          income_budget_idr: number;
          fixed_budget_idr: number;
          variable_budget_idr: number;
          sinking_budget_idr: number;
          contractor_paid_idr: number;
          contractor_owed_idr: number;
          true_expenses_idr: number;
          net_after_savings_idr: number;
          saving_health_ratio: number;
        };
        Relationships: [];
      };
      monthly_finance_summary_v3: {
        Row: {
          month: string;
          total_income_idr: number;
          monthly_rollup_income_idr: number;
          detailed_total_income_idr: number;
          active_income_idr: number;
          inactive_income_idr: number;
          active_visible_income_idr: number;
          active_hidden_income_idr: number;
          freelance_client_income_idr: number;
          digital_product_income_idr: number;
          other_income_idr: number;
          category_income_actual_idr: number;
          reconciliation_category_income_idr: number;
          fixed_expenses_idr: number;
          variable_spend_idr: number;
          sinking_funds_idr: number;
          income_budget_idr: number;
          fixed_budget_idr: number;
          variable_budget_idr: number;
          sinking_budget_idr: number;
          contractor_paid_idr: number;
          contractor_owed_idr: number;
          true_expenses_idr: number;
          net_after_savings_idr: number;
          saving_health_ratio: number;
          team_owed_idr: number;
          team_paid_idr: number;
          team_total_idr: number;
          has_expense_data: boolean;
          has_income_data: boolean;
          saving_health_identified: boolean;
        };
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
  };
}
