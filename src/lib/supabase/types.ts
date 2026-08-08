// Hand-written to match supabase/migrations/0001_init.sql.
// Once the project is deployed, regenerate with:
//   npx supabase gen types typescript --project-id <id> > src/lib/supabase/types.ts

export type CategoryTag = "income" | "sinking_fund" | "fixed" | "spent";
export type TxDirection = "in" | "out";
export type EntrySource = "manual" | "import";
export type IncomeSourceType = "freelance_client" | "digital_product" | "other";
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
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["categories"]["Row"]> & {
          name: string;
          tag: CategoryTag;
        };
        Update: Partial<Database["public"]["Tables"]["categories"]["Row"]>;
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
      };
      budgets: {
        Row: {
          id: string;
          category_id: string;
          month: string;
          budget_amount: number;
          currency: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["budgets"]["Row"]> & {
          category_id: string;
          month: string;
        };
        Update: Partial<Database["public"]["Tables"]["budgets"]["Row"]>;
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
      };
      income_sources: {
        Row: {
          id: string;
          name: string;
          type: IncomeSourceType;
          notes: string | null;
          active: boolean;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["income_sources"]["Row"]> & {
          name: string;
          type: IncomeSourceType;
        };
        Update: Partial<Database["public"]["Tables"]["income_sources"]["Row"]>;
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
          source: EntrySource;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["income_transactions"]["Row"]> & {
          income_source_id: string;
          date: string;
          amount: number;
          amount_idr: number;
        };
        Update: Partial<Database["public"]["Tables"]["income_transactions"]["Row"]>;
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
          notes: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["contractor_payments"]["Row"]> & {
          date: string;
          amount: number;
          amount_idr: number;
        };
        Update: Partial<Database["public"]["Tables"]["contractor_payments"]["Row"]>;
      };
      net_worth_snapshots: {
        Row: {
          id: string;
          month: string;
          cash: number;
          investments: number;
          retirement: number;
          personal: number;
          unsecured_liabilities: number;
          secured_liabilities: number;
          notes: string | null;
          created_at: string;
          total_assets: number;
          total_liabilities: number;
          net_worth: number;
        };
        Insert: Partial<Database["public"]["Tables"]["net_worth_snapshots"]["Row"]> & {
          month: string;
        };
        Update: Partial<Database["public"]["Tables"]["net_worth_snapshots"]["Row"]>;
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
      };
    };
  };
}
