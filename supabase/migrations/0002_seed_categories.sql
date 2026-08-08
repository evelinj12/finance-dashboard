-- Seed categories from the user's actual Budget Checker / Transaction Log data
-- (reconstructed by parsing 6 months of real entries, March-August 2026).
-- Category names repeat across tags on purpose -- e.g. "Utilities" appears
-- under Fixed (IPL, wifi, electricity as separate line items against the
-- same category) and "Transport" appears under Sinking Fund (STNK), Fixed
-- (parking), and Spent (day-to-day) as three distinct categories.

insert into categories (name, tag, sort_order) values
  ('Work income', 'income', 1),
  ('Other income', 'income', 2),

  ('Rent', 'sinking_fund', 10),
  ('Life insurance', 'sinking_fund', 11),
  ('Tax', 'sinking_fund', 12),
  ('Travel', 'sinking_fund', 13),
  ('Entertainment', 'sinking_fund', 14),
  ('Transport', 'sinking_fund', 15),

  ('Health insurance', 'fixed', 20),
  ('Gift & charity', 'fixed', 21),
  ('Work', 'fixed', 22),
  ('Pulsa & subscription', 'fixed', 23),
  ('CC insurance', 'fixed', 24),
  ('Utilities', 'fixed', 25),
  ('Transport', 'fixed', 26),

  ('Food & drinks', 'spent', 30),
  ('Grocery', 'spent', 31),
  ('Transport', 'spent', 32),
  ('Work', 'spent', 33),
  ('Home & living', 'spent', 34),
  ('Health & wellness', 'spent', 35),
  ('Entertainment', 'spent', 36),
  ('Clothing', 'spent', 37),
  ('Gift & charity', 'spent', 38),
  ('Laundry', 'spent', 39),
  ('Beauty & personal care', 'spent', 40),
  ('Travel', 'spent', 41),
  ('Gear/electronics', 'spent', 42),
  ('Utilities', 'spent', 43),
  ('Pulsa & subscription', 'spent', 44);

-- Sinking fund schedule, matching amounts/due dates from the source sheet.
insert into sinking_funds (category_id, name, monthly_amount, due_date, rolling, notes)
select id, 'Rent', 2000000, '2027-02-01', false, 'Due Feb 2027'
from categories where name = 'Rent' and tag = 'sinking_fund'
union all
select id, 'Life insurance', 572000, '2026-06-01', false, 'Due Jun 2026'
from categories where name = 'Life insurance' and tag = 'sinking_fund'
union all
select id, 'Tax (PPh)', 233654, '2027-03-01', false, 'Due Mar 2027'
from categories where name = 'Tax' and tag = 'sinking_fund'
union all
select id, 'Travel', 1300000, null, true, 'Rolling, draw when traveling'
from categories where name = 'Travel' and tag = 'sinking_fund'
union all
select id, 'Entertainment', 300000, null, true, 'Rolling, move to mutual fund if unused'
from categories where name = 'Entertainment' and tag = 'sinking_fund'
union all
select id, 'STNK', 100000, '2026-04-01', false, 'Due Apr 2026'
from categories where name = 'Transport' and tag = 'sinking_fund';

-- Income source seeds -- clients get added via the migration import script
-- (one per freelance contract found in the sheet) plus these two constants.
insert into income_sources (name, type) values
  ('Digital Products', 'digital_product'),
  ('Other', 'other');
