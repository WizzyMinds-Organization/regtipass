-- Schema snapshot pulled from live Supabase project (public schema).
-- Generated via information_schema / pg_catalog introspection — not a byte-perfect pg_dump,
-- but captures tables, columns, constraints, indexes, and RLS policies for review.
-- Regenerate with: DB_URL=... node dump-schema.mjs

-- ============================================================
-- Table: public.account_users
-- ============================================================

create table public.account_users (
  id uuid not null default gen_random_uuid(),
  account_id uuid not null,
  user_id uuid not null,
  is_owner boolean not null default false,
  created_at timestamp with time zone not null default now(),
  role text,
  name text not null,
  primary key (id)
);

alter table public.account_users add foreign key (account_id) references accounts(id) on delete cascade;
-- check: (role = ANY (ARRAY['manager'::text, 'issuer'::text, 'checkin'::text]))

CREATE UNIQUE INDEX account_users_account_id_user_id_key ON public.account_users USING btree (account_id, user_id);
CREATE INDEX account_users_user_id_idx ON public.account_users USING btree (user_id);

-- RLS ENABLED
alter table public.account_users enable row level security;

create policy "account_users_delete" on public.account_users
  as permissive for delete
  to public
  using ((is_super_admin() OR is_account_owner(account_id)));

create policy "account_users_insert" on public.account_users
  as permissive for insert
  to public
  with check ((is_super_admin() OR is_account_owner(account_id)));

create policy "account_users_select" on public.account_users
  as permissive for select
  to public
  using ((is_super_admin() OR is_account_member(account_id)));

create policy "account_users_update" on public.account_users
  as permissive for update
  to public
  using ((is_super_admin() OR is_account_owner(account_id)))
  with check ((is_super_admin() OR is_account_owner(account_id)));

-- ============================================================
-- Table: public.accounts
-- ============================================================

create table public.accounts (
  id uuid not null default gen_random_uuid(),
  name text not null,
  contact_email text,
  status text not null default 'active'::text,
  created_at timestamp with time zone not null default now(),
  primary key (id)
);

-- check: (status = ANY (ARRAY['active'::text, 'suspended'::text]))

-- RLS ENABLED
alter table public.accounts enable row level security;

create policy "accounts_delete" on public.accounts
  as permissive for delete
  to public
  using (is_super_admin());

create policy "accounts_insert" on public.accounts
  as permissive for insert
  to public
  with check (is_super_admin());

create policy "accounts_select" on public.accounts
  as permissive for select
  to public
  using ((is_super_admin() OR is_account_member(id)));

create policy "accounts_update" on public.accounts
  as permissive for update
  to public
  using (is_super_admin())
  with check (is_super_admin());

-- ============================================================
-- Table: public.cash_handovers
-- ============================================================

create table public.cash_handovers (
  id uuid not null default gen_random_uuid(),
  event_id uuid not null,
  staff_user_id uuid not null,
  amount numeric not null,
  recipient_type text not null,
  recipient_name text,
  note text,
  created_at timestamp with time zone not null default now(),
  primary key (id)
);

alter table public.cash_handovers add foreign key (event_id) references events(id) on delete cascade;
-- check: (amount > (0)::numeric)
-- check: (recipient_type = ANY (ARRAY['organizer'::text, 'finance'::text, 'vendor'::text, 'other'::text]))

CREATE INDEX cash_handovers_event_id_idx ON public.cash_handovers USING btree (event_id);
CREATE INDEX cash_handovers_staff_user_id_idx ON public.cash_handovers USING btree (staff_user_id);

-- RLS ENABLED
alter table public.cash_handovers enable row level security;

create policy "cash_handovers_delete" on public.cash_handovers
  as permissive for delete
  to public
  using ((is_super_admin() OR is_account_owner(event_account_id(event_id))));

create policy "cash_handovers_insert" on public.cash_handovers
  as permissive for insert
  to public
  with check (((EXISTS ( SELECT 1
   FROM events e
  WHERE ((e.id = cash_handovers.event_id) AND (e.status = 'active'::text)))) AND (is_super_admin() OR is_account_owner(event_account_id(event_id)) OR (can_manage_participants(event_account_id(event_id)) AND (staff_user_id = auth.uid())))));

create policy "cash_handovers_select" on public.cash_handovers
  as permissive for select
  to public
  using ((is_super_admin() OR is_account_owner(event_account_id(event_id)) OR (staff_user_id = auth.uid())));

-- ============================================================
-- Table: public.check_ins
-- ============================================================

create table public.check_ins (
  id uuid not null default gen_random_uuid(),
  ticket_id text not null,
  event_id uuid not null,
  staff_user_id uuid,
  device_info text,
  result text not null,
  created_at timestamp with time zone not null default now(),
  primary key (id)
);

alter table public.check_ins add foreign key (event_id) references events(id) on delete cascade;
alter table public.check_ins add foreign key (ticket_id) references tickets(id) on delete cascade;
-- check: (result = ANY (ARRAY['success'::text, 'already_checked_in'::text, 'invalid'::text]))

CREATE INDEX check_ins_event_id_idx ON public.check_ins USING btree (event_id);
CREATE INDEX check_ins_ticket_id_idx ON public.check_ins USING btree (ticket_id);

-- RLS ENABLED
alter table public.check_ins enable row level security;

create policy "check_ins_select" on public.check_ins
  as permissive for select
  to public
  using ((is_super_admin() OR is_account_member(event_account_id(event_id))));

-- ============================================================
-- Table: public.events
-- ============================================================

create table public.events (
  id uuid not null default gen_random_uuid(),
  account_id uuid not null,
  name text not null,
  slug text not null,
  status text not null default 'active'::text,
  ticket_quota integer not null default 0,
  event_date date,
  created_at timestamp with time zone not null default now(),
  closed_at timestamp with time zone,
  closed_by uuid,
  primary key (id)
);

alter table public.events add foreign key (account_id) references accounts(id) on delete cascade;
-- check: (status = ANY (ARRAY['active'::text, 'closed'::text]))
-- check: (ticket_quota >= 0)

CREATE INDEX events_account_id_idx ON public.events USING btree (account_id);
CREATE UNIQUE INDEX events_slug_key ON public.events USING btree (slug);

-- RLS ENABLED
alter table public.events enable row level security;

create policy "events_delete" on public.events
  as permissive for delete
  to public
  using (is_super_admin());

create policy "events_insert" on public.events
  as permissive for insert
  to public
  with check (is_super_admin());

create policy "events_select" on public.events
  as permissive for select
  to public
  using ((is_super_admin() OR is_account_member(account_id)));

create policy "events_update" on public.events
  as permissive for update
  to public
  using ((is_super_admin() OR (is_account_owner(account_id) AND (status = 'active'::text))))
  with check ((is_super_admin() OR (is_account_owner(account_id) AND (status = 'active'::text))));

-- ============================================================
-- Table: public.form_fields
-- ============================================================

create table public.form_fields (
  id uuid not null default gen_random_uuid(),
  event_id uuid not null,
  key text not null,
  label text not null,
  field_type text not null,
  options jsonb,
  required boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamp with time zone not null default now(),
  show_on_ticket boolean not null default false,
  primary key (id)
);

alter table public.form_fields add foreign key (event_id) references events(id) on delete cascade;
-- check: (field_type = ANY (ARRAY['text'::text, 'email'::text, 'phone'::text, 'number'::text, 'select'::text]))

CREATE INDEX form_fields_event_id_idx ON public.form_fields USING btree (event_id);
CREATE UNIQUE INDEX form_fields_event_id_key_key ON public.form_fields USING btree (event_id, key);

-- RLS ENABLED
alter table public.form_fields enable row level security;

create policy "form_fields_delete" on public.form_fields
  as permissive for delete
  to public
  using ((is_super_admin() OR (is_account_owner(event_account_id(event_id)) AND (EXISTS ( SELECT 1
   FROM events e
  WHERE ((e.id = form_fields.event_id) AND (e.status = 'active'::text)))))));

create policy "form_fields_insert" on public.form_fields
  as permissive for insert
  to public
  with check ((is_super_admin() OR (is_account_owner(event_account_id(event_id)) AND (EXISTS ( SELECT 1
   FROM events e
  WHERE ((e.id = form_fields.event_id) AND (e.status = 'active'::text)))))));

create policy "form_fields_select" on public.form_fields
  as permissive for select
  to public
  using ((is_super_admin() OR is_account_member(event_account_id(event_id))));

create policy "form_fields_update" on public.form_fields
  as permissive for update
  to public
  using ((is_super_admin() OR (is_account_owner(event_account_id(event_id)) AND (EXISTS ( SELECT 1
   FROM events e
  WHERE ((e.id = form_fields.event_id) AND (e.status = 'active'::text)))))))
  with check ((is_super_admin() OR (is_account_owner(event_account_id(event_id)) AND (EXISTS ( SELECT 1
   FROM events e
  WHERE ((e.id = form_fields.event_id) AND (e.status = 'active'::text)))))));

-- ============================================================
-- Table: public.super_admins
-- ============================================================

create table public.super_admins (
  user_id uuid not null,
  created_at timestamp with time zone not null default now(),
  primary key (user_id)
);

-- RLS ENABLED
alter table public.super_admins enable row level security;

create policy "super_admins_select" on public.super_admins
  as permissive for select
  to public
  using (is_super_admin());

-- ============================================================
-- Table: public.template_anchors
-- ============================================================

create table public.template_anchors (
  id uuid not null default gen_random_uuid(),
  template_id uuid not null,
  kind text not null,
  field_key text,
  x numeric not null,
  y numeric not null,
  width numeric not null,
  height numeric not null,
  font text not null default 'Inter'::text,
  font_size numeric not null default 16,
  align text not null default 'left'::text,
  color text not null default '#000000'::text,
  visible boolean not null default true,
  created_at timestamp with time zone not null default now(),
  primary key (id)
);

alter table public.template_anchors add foreign key (template_id) references templates(id) on delete cascade;
-- check: (align = ANY (ARRAY['left'::text, 'center'::text, 'right'::text]))
-- check: (kind = ANY (ARRAY['qr'::text, 'ticket_id'::text, 'field'::text]))

CREATE INDEX template_anchors_template_id_idx ON public.template_anchors USING btree (template_id);

-- RLS ENABLED
alter table public.template_anchors enable row level security;

create policy "template_anchors_select" on public.template_anchors
  as permissive for select
  to public
  using ((is_super_admin() OR (EXISTS ( SELECT 1
   FROM templates t
  WHERE ((t.id = template_anchors.template_id) AND is_account_member(event_account_id(t.event_id)))))));

create policy "template_anchors_write" on public.template_anchors
  as permissive for all
  to public
  using ((is_super_admin() OR (EXISTS ( SELECT 1
   FROM (templates t
     JOIN events e ON ((e.id = t.event_id)))
  WHERE ((t.id = template_anchors.template_id) AND (e.status = 'active'::text) AND is_account_owner(e.account_id))))))
  with check ((is_super_admin() OR (EXISTS ( SELECT 1
   FROM (templates t
     JOIN events e ON ((e.id = t.event_id)))
  WHERE ((t.id = template_anchors.template_id) AND (e.status = 'active'::text) AND is_account_owner(e.account_id))))));

-- ============================================================
-- Table: public.templates
-- ============================================================

create table public.templates (
  id uuid not null default gen_random_uuid(),
  event_id uuid not null,
  name text not null,
  image_path text not null,
  image_width integer not null,
  image_height integer not null,
  created_at timestamp with time zone not null default now(),
  price numeric not null default 0,
  primary key (id)
);

alter table public.templates add foreign key (event_id) references events(id) on delete cascade;
-- check: (price >= (0)::numeric)

CREATE INDEX templates_event_id_idx ON public.templates USING btree (event_id);

-- RLS ENABLED
alter table public.templates enable row level security;

create policy "templates_delete" on public.templates
  as permissive for delete
  to public
  using ((is_super_admin() OR (is_account_owner(event_account_id(event_id)) AND (EXISTS ( SELECT 1
   FROM events e
  WHERE ((e.id = templates.event_id) AND (e.status = 'active'::text)))))));

create policy "templates_insert" on public.templates
  as permissive for insert
  to public
  with check ((is_super_admin() OR (is_account_owner(event_account_id(event_id)) AND (EXISTS ( SELECT 1
   FROM events e
  WHERE ((e.id = templates.event_id) AND (e.status = 'active'::text)))))));

create policy "templates_select" on public.templates
  as permissive for select
  to public
  using ((is_super_admin() OR is_account_member(event_account_id(event_id))));

create policy "templates_update" on public.templates
  as permissive for update
  to public
  using ((is_super_admin() OR (is_account_owner(event_account_id(event_id)) AND (EXISTS ( SELECT 1
   FROM events e
  WHERE ((e.id = templates.event_id) AND (e.status = 'active'::text)))))))
  with check ((is_super_admin() OR (is_account_owner(event_account_id(event_id)) AND (EXISTS ( SELECT 1
   FROM events e
  WHERE ((e.id = templates.event_id) AND (e.status = 'active'::text)))))));

-- ============================================================
-- Table: public.tickets
-- ============================================================

create table public.tickets (
  id text not null,
  event_id uuid not null,
  template_id uuid not null,
  participant_data jsonb not null default '{}'::jsonb,
  status text not null default 'issued'::text,
  checked_in_at timestamp with time zone,
  issued_by uuid,
  created_at timestamp with time zone not null default now(),
  amount_collected numeric not null default 0,
  primary key (id)
);

alter table public.tickets add foreign key (event_id) references events(id) on delete cascade;
alter table public.tickets add foreign key (template_id) references templates(id);
-- check: (amount_collected >= (0)::numeric)
-- check: (id ~ '^[2-9A-HJ-NP-Za-km-z]{4,6}-[2-9A-HJ-NP-Za-km-z]{4,6}$'::text)
-- check: (status = ANY (ARRAY['issued'::text, 'checked_in'::text]))

CREATE INDEX tickets_event_id_idx ON public.tickets USING btree (event_id);
CREATE INDEX tickets_event_id_status_idx ON public.tickets USING btree (event_id, status);

-- RLS ENABLED
alter table public.tickets enable row level security;

create policy "tickets_delete" on public.tickets
  as permissive for delete
  to public
  using ((is_super_admin() OR (can_manage_participants(event_account_id(event_id)) AND (EXISTS ( SELECT 1
   FROM events e
  WHERE ((e.id = tickets.event_id) AND (e.status = 'active'::text)))))));

create policy "tickets_insert" on public.tickets
  as permissive for insert
  to public
  with check ((is_super_admin() OR (can_manage_participants(event_account_id(event_id)) AND (EXISTS ( SELECT 1
   FROM events e
  WHERE ((e.id = tickets.event_id) AND (e.status = 'active'::text)))))));

create policy "tickets_select" on public.tickets
  as permissive for select
  to public
  using ((is_super_admin() OR is_account_member(event_account_id(event_id))));

create policy "tickets_update" on public.tickets
  as permissive for update
  to public
  using ((is_super_admin() OR (can_manage_participants(event_account_id(event_id)) AND (EXISTS ( SELECT 1
   FROM events e
  WHERE ((e.id = tickets.event_id) AND (e.status = 'active'::text)))))))
  with check ((is_super_admin() OR (can_manage_participants(event_account_id(event_id)) AND (EXISTS ( SELECT 1
   FROM events e
  WHERE ((e.id = tickets.event_id) AND (e.status = 'active'::text)))))));

-- ============================================================
-- Table: public.user_directory
-- ============================================================

create table public.user_directory (
  user_id uuid not null,
  email text not null,
  created_at timestamp with time zone not null default now(),
  primary key (user_id)
);

CREATE UNIQUE INDEX user_directory_email_idx ON public.user_directory USING btree (lower(email));

-- RLS ENABLED
alter table public.user_directory enable row level security;

create policy "user_directory_select" on public.user_directory
  as permissive for select
  to public
  using (is_super_admin());

-- ============================================================
-- Table: public.user_last_event
-- ============================================================

create table public.user_last_event (
  user_id uuid not null,
  event_id uuid,
  updated_at timestamp with time zone not null default now(),
  primary key (user_id)
);

alter table public.user_last_event add foreign key (event_id) references events(id) on delete set null;

-- RLS ENABLED
alter table public.user_last_event enable row level security;
-- ⚠ RLS is enabled but NO POLICIES exist — table is fully inaccessible via the anon/authenticated roles.

-- ============================================================
-- Functions / RPCs
-- ============================================================

CREATE OR REPLACE FUNCTION public.can_checkin(acc_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from public.account_users
    where account_id = acc_id and user_id = auth.uid()
      and (is_owner or role in ('manager', 'issuer', 'checkin'))
  );
$function$
;

CREATE OR REPLACE FUNCTION public.can_manage_participants(acc_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from public.account_users
    where account_id = acc_id and user_id = auth.uid()
      and (is_owner or role in ('manager', 'issuer'))
  );
$function$
;

CREATE OR REPLACE FUNCTION public.check_in_ticket(p_ticket_id text, p_device_info text DEFAULT NULL::text)
 RETURNS TABLE(result text, ticket_id text, status text, checked_in_at timestamp with time zone, participant_data jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_event_id uuid;
  v_account_id uuid;
  v_row public.tickets%rowtype;
  v_result text;
begin
  select t.* into v_row from public.tickets t where t.id = p_ticket_id;

  if not found then
    return query select 'invalid'::text, p_ticket_id, null::text, null::timestamptz, null::jsonb;
    return;
  end if;

  v_event_id := v_row.event_id;
  v_account_id := public.event_account_id(v_event_id);

  if not (public.is_super_admin() or public.can_checkin(v_account_id)) then
    raise exception 'Not authorized to check in tickets for this event';
  end if;

  if not exists (select 1 from public.events e where e.id = v_event_id and e.status = 'active') then
    raise exception 'Event is closed';
  end if;

  update public.tickets t
    set status = 'checked_in', checked_in_at = now()
    where t.id = p_ticket_id and t.status = 'issued'
    returning t.* into v_row;

  if found then
    v_result := 'success';
  else
    select t.* into v_row from public.tickets t where t.id = p_ticket_id;
    v_result := 'already_checked_in';
  end if;

  insert into public.check_ins (ticket_id, event_id, staff_user_id, device_info, result)
    values (p_ticket_id, v_event_id, auth.uid(), p_device_info, v_result);

  return query select v_result, v_row.id, v_row.status, v_row.checked_in_at, v_row.participant_data;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.enforce_ticket_quota()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  quota integer;
  issued_count integer;
begin
  select ticket_quota into quota from public.events where id = new.event_id;
  select count(*) into issued_count from public.tickets where event_id = new.event_id;
  if issued_count >= quota then
    raise exception 'Ticket quota reached for this event (quota: %)', quota
      using errcode = 'check_violation';
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.event_account_id(evt_id uuid)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select account_id from public.events where id = evt_id;
$function$
;

CREATE OR REPLACE FUNCTION public.event_ticket_stats(p_event_id uuid)
 RETURNS TABLE(issued bigint, checked_in bigint, total_collected numeric)
 LANGUAGE sql
 STABLE
AS $function$
  select
    count(*) as issued,
    count(*) filter (where status = 'checked_in') as checked_in,
    coalesce(sum(amount_collected), 0) as total_collected
  from public.tickets
  where event_id = p_event_id;
$function$
;

CREATE OR REPLACE FUNCTION public.is_account_member(acc_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from public.account_users
    where account_id = acc_id and user_id = auth.uid()
  );
$function$
;

CREATE OR REPLACE FUNCTION public.is_account_owner(acc_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from public.account_users
    where account_id = acc_id and user_id = auth.uid() and is_owner
  );
$function$
;

CREATE OR REPLACE FUNCTION public.is_super_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (select 1 from public.super_admins where user_id = auth.uid());
$function$
;

CREATE OR REPLACE FUNCTION public.sync_user_directory()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.user_directory (user_id, email)
  values (new.id, lower(new.email))
  on conflict (user_id) do update set email = excluded.email;
  return new;
end;
$function$
;

