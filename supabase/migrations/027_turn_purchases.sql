-- Fab Collab - "Buy a Turn" Stripe-backed feature.

alter table public.sections
  add column if not exists purchasable boolean not null default false;

alter table public.sections
  add column if not exists purchase_price_cents integer
    check (purchase_price_cents is null or purchase_price_cents >= 0);

create index if not exists sections_purchasable_idx
  on public.sections(project_id) where purchasable = true;

create table if not exists public.turn_purchases (
  id                        uuid primary key default gen_random_uuid(),
  section_id                uuid not null references public.sections(id) on delete cascade,
  project_id                uuid not null references public.projects(id) on delete cascade,
  buyer_email               text,
  buyer_user_id             uuid references public.users(id) on delete set null,
  amount_cents              integer not null check (amount_cents > 0),
  platform_fee_cents        integer not null default 0,
  stripe_payment_intent_id  text,
  stripe_session_id         text unique,
  status                    text not null default 'pending' check (status in ('pending','succeeded','failed')),
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create index if not exists turn_purchases_project_idx on public.turn_purchases(project_id, created_at desc);
create index if not exists turn_purchases_section_idx on public.turn_purchases(section_id, created_at desc);

drop trigger if exists set_updated_at_turn_purchases on public.turn_purchases;
create trigger set_updated_at_turn_purchases
  before update on public.turn_purchases
  for each row execute function public.set_updated_at();

grant select, insert, update on public.turn_purchases to service_role;
grant select on public.turn_purchases to authenticated;

alter table public.turn_purchases enable row level security;

drop policy if exists "Owner can read turn purchases for own project" on public.turn_purchases;
create policy "Owner can read turn purchases for own project"
  on public.turn_purchases for select
  to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = turn_purchases.project_id
        and p.owner_id = auth.uid()
    )
  );

drop policy if exists "Buyer can read own turn purchase" on public.turn_purchases;
create policy "Buyer can read own turn purchase"
  on public.turn_purchases for select
  to authenticated
  using (buyer_user_id = auth.uid());
