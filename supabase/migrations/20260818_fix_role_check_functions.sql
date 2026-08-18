-- Fixes can_checkin() / can_manage_participants(): they still referenced
-- account_users.can_checkin / can_manage_participants, boolean columns that
-- were dropped by the role migration in favor of account_users.role
-- ('manager' | 'issuer' | 'checkin'). Rewritten to match the role model in
-- src/lib/event-context.ts:deriveFromRole.

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
$function$;

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
$function$;
