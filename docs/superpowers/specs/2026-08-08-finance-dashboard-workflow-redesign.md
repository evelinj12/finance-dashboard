# Finance Dashboard Workflow And Cozy Redesign Spec

## Status

Approved for user review. This spec captures the agreed design before implementation planning.

## Context

The finance dashboard centralizes expenses, budgets, income, team payouts, net worth, saving health, and exports from the user's Google Sheets and Supabase data. Recent fixes corrected monthly income and saving-health math. The next work should improve daily logging speed, make the data model better match the user's sheets, and refresh the UI so it feels clean, cozy, and more personal.

Implementation should happen in two phases:

1. Phase 1: workflow and data correctness.
2. Phase 2: Cozy Bento Ledger visual refresh.

The dashboard must remain practical and scannable. Cute elements are welcome, but they should support the product instead of crowding it.

## Decisions Already Made

- Visual direction: Cozy Bento Ledger, combining Cozy Ledger warmth with Pastel Bento restraint.
- Quick forms should be inline and immediately usable without opening a modal.
- Quick forms may have collapsible advanced fields, but the main log fields must always be visible.
- The current Brother feature becomes Team.
- Kevin is seeded as the first team member.
- Team members are managed on the Team page.
- Team payout amounts are manually entered per work entry.
- Team work entries include time.
- Income entries include total client time.
- Team money and time are deducted from client totals to calculate the user's net money and net time.
- Team deductions use owed plus paid amounts, because both are the team's portion.
- Team payment status is only `owed` or `paid`.
- Income payment status includes `waiting` and `paid`.
- Net worth categories should mirror the source sheet exactly and support add, edit, and delete.
- Navigation tabs support reorder and hide, with restore/reset.

## Phase 1 Scope

### Navigation Customization

Users can customize the primary dashboard tabs:

- Reorder tabs.
- Hide tabs that are not used often.
- Restore hidden tabs.
- Reset to default order and visibility.

The interaction can be drag-and-drop on desktop, but must also offer non-drag controls so it works with keyboard and touch. Hidden tabs should be managed from Settings in a navigation customization section.

### Budget Saving Ratio Trend

The Budget page should compare the selected month's saving-health ratio with the previous month:

- Green upward arrow when the ratio improves.
- Red downward arrow when the ratio drops.
- Neutral indicator when unchanged or when prior month is unavailable.
- Tooltip or accessible label should describe the comparison, for example "Compared with July 2026".

The indicator must not rely on color alone.

### Saving Health Unidentified State

For months without enough expense or budget data, Saving Health should show `Unidentified`, not `Below target`.

A month is unidentified when it has income but does not have the data needed to evaluate saving health fairly, such as missing expense transactions and missing sinking-fund/budget actuals. These rows should be visually muted and excluded from "failure" styling.

### Transactions Quick Log

Transactions page gets an inline quick form at the top:

- Date.
- Category.
- Amount.
- Notes.
- Submit.

Advanced fields, such as currency/fx or save-to details, can stay collapsible or remain in the full edit dialog. The main entry path must not require clicking an Add button first.

### Income Quick Log And Time

Income page gets an inline quick form at the top:

- Date.
- Client/source.
- Amount.
- Status: `waiting` or `paid`.
- Total client time.
- Notes.
- Submit.

The Income page should display client money and time in three layers:

- Gross client money/time.
- Team money/time.
- User net money/time.

Formula:

```text
user net money = gross client money - team money
user net time = gross client time - team time
```

Team money/time includes both owed and paid team work.

### Team Page

The existing Brother page becomes Team.

Team page includes:

- Inline "Log Team Work" form.
- Team member selector.
- Client selector.
- Date.
- Optional work period text.
- Description.
- Time contributed.
- Manual amount.
- Status: `owed` or `paid`.
- Submit.

Team page also includes:

- Team Members section.
- Kevin seeded by default.
- Ability to add team members.
- Ability to edit team members.
- Ability to deactivate team members.
- Ability to delete team members only when they have no work entries. Team members with work history should be deactivated instead so historical calculations stay intact.

Monthly summaries should include:

- Total team amount.
- Paid amount.
- Owed amount.
- Remaining to pay.
- Total team time.
- Breakdown by person.
- Breakdown by client.

Team entries affect client net calculations even when status is `owed`.

### Sinking Fund Editing

The sinking fund list should support editing existing items, not only add and delete.

Editable fields should include:

- Name.
- Monthly amount.
- Due date.
- Rolling/non-rolling behavior.
- Notes if already supported.

Changes should update future dashboard calculations predictably and should not silently destroy historical transactions.

### Net Worth Categories

Net worth submission should mirror the source sheet categories exactly.

Requirements:

- Add category rows.
- Edit category rows.
- Delete category rows when safe.
- Submit values by category.
- Preserve the full history already imported.
- Keep yearly trend visibility.

The net worth chart should include simple year-level numbers:

- Start-of-year net worth.
- Current/latest net worth.
- Year-to-date growth amount.
- Year-to-date growth percent.
- Progress toward yearly goal when a goal exists.

### Export Month Filter

Exports should support filtering by month.

Minimum:

- Dataset selector.
- Month selector.
- Download filtered CSV.

If no month is selected, exports can default to all data for that dataset.

## Phase 2 Scope

### Visual Direction

The app adopts a Cozy Bento Ledger visual system:

- Warm cream base surfaces.
- Soft coral, honey, mint, and gentle pastel accents.
- Clean bento-style sections.
- Rounded but not overly bubbly cards.
- Cute cat and money details in small, supportive places.
- Data tables stay readable and professional.

Cute elements should appear in:

- Empty states.
- Success feedback.
- Small badges.
- Overview accent area.
- Helpful "unidentified/no data" states.

Cute elements should not appear as structural navigation icons or replace meaningful labels. Use Lucide or inline SVG-style icons for interface controls.

### Layout Principles

- Keep dense finance pages scannable.
- Do not put cards inside cards.
- Keep page sections unframed or use simple individual cards only where useful.
- Use stable dimensions for controls and summary cards.
- Avoid decorative clutter and avoid gradients/orbs/bokeh backgrounds.
- Use color to clarify status, category, and hierarchy, not as pure decoration.

### Accessibility And Interaction

- Every form field has a visible label.
- Touch targets are at least 44px.
- Arrow/trend indicators include text or accessible labels.
- Drag-and-drop has keyboard alternatives.
- Contrast must remain readable in light and dark mode if dark mode exists.
- Motion should be subtle and respect reduced-motion preferences.

## Data Model Notes

The implementation requires schema changes for:

- Team members.
- Team work entries.
- Income entry time fields.
- Income status values.
- Net worth category tables and category detail entries.
- User navigation preferences.

Existing historical data must remain exportable. Any replacement of Brother with Team should migrate prior contractor payment history into the new Team model with Kevin as the associated member.

## Acceptance Criteria

Phase 1 is successful when:

- A transaction can be logged from the top of Transactions without opening an add modal.
- Income can be logged from the top of Income with status and total client time.
- Team work can be logged from the Team page with person, client, time, amount, and owed/paid status.
- Kevin exists as a default team member.
- Client summaries show gross, team, and net money/time.
- Team owed plus paid deducts from client net.
- Team remaining-to-pay uses owed vs paid.
- Sinking funds can be edited.
- Saving Health shows `Unidentified` for months with missing evaluation data.
- Budget ratio shows previous-month comparison.
- Net worth categories mirror the sheet and support add, edit, delete.
- Exports can be filtered by month.

Phase 2 is successful when:

- The dashboard uses the Cozy Bento Ledger visual system consistently.
- Pages feel warmer and more personal while staying clean.
- Cute cat/money elements are present but not crowded.
- Forms, tables, and charts remain readable and accessible.
- Navigation order and hidden tabs persist per user/session.

## Out Of Scope For This Spec

- Automatic bank sync.
- Automatic Google Sheets two-way sync.
- Automatic Team payout formulas beyond manual amounts.
- Multi-user permissions beyond the current authenticated-user model.
- Full mobile app rewrite.

## Implementation Sequencing Recommendation

1. Add database fields/tables and views needed for Team, time, net calculations, net worth categories, and nav preferences.
2. Implement Phase 1 quick forms and calculations page by page.
3. Verify calculations against known sheet examples.
4. Add export filtering.
5. Implement Phase 2 theme tokens and shared UI components.
6. Apply the visual refresh across pages.
7. Run browser checks on desktop and mobile widths.
