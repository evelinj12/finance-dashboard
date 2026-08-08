import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/server";
import { CategoriesSection } from "./categories-section";
import { SinkingFundsSection } from "./sinking-funds-section";
import { GoalSection } from "./goal-section";
import { CurrencySection } from "./currency-section";

export default async function SettingsPage() {
  const supabase = await createClient();
  const currentYear = new Date().getFullYear();

  const [{ data: categories }, { data: sinkingFunds }, { data: goal }] = await Promise.all([
    supabase.from("categories").select("id, name, tag, active").order("sort_order"),
    supabase.from("sinking_funds").select("id, name, monthly_amount, due_date, rolling, notes").order("name"),
    supabase.from("goals").select("target_amount").eq("type", "net_worth").eq("year", currentYear).maybeSingle(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl font-semibold">Settings</h2>

      <Tabs defaultValue="categories">
        <TabsList>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="sinking-funds">Sinking Funds</TabsTrigger>
          <TabsTrigger value="goals">Goals</TabsTrigger>
          <TabsTrigger value="currency">Currency</TabsTrigger>
        </TabsList>

        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <CardTitle>Budget categories</CardTitle>
            </CardHeader>
            <CardContent>
              <CategoriesSection categories={categories ?? []} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sinking-funds">
          <Card>
            <CardHeader>
              <CardTitle>Sinking fund schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <SinkingFundsSection funds={sinkingFunds ?? []} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="goals">
          <Card>
            <CardHeader>
              <CardTitle>Yearly goals</CardTitle>
            </CardHeader>
            <CardContent>
              <GoalSection year={currentYear} currentTarget={goal?.target_amount ?? 0} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="currency">
          <Card>
            <CardHeader>
              <CardTitle>Currency display</CardTitle>
            </CardHeader>
            <CardContent>
              <CurrencySection />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
