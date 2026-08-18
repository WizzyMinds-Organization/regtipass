-- Read-only aggregate RPC so the event dashboard doesn't have to fetch every
-- ticket row (previously capped at 200, making "Issued/Checked in/Collected"
-- wrong for any event past that) just to sum three numbers.
-- Not SECURITY DEFINER: runs as the calling role, so the existing
-- tickets_select RLS policy (is_super_admin OR is_account_member) still
-- applies — a non-member gets zeroed-out rows, not real data.

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
$function$;
