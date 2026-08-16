export type AccountStatus = "active" | "suspended";
export type EventStatus = "active" | "closed";
export type FieldType = "text" | "email" | "phone" | "number" | "select";
export type AnchorKind = "qr" | "ticket_id" | "field";
export type TicketStatus = "issued" | "checked_in";
export type CheckInResult = "success" | "already_checked_in" | "invalid";
export type HandoverRecipientType = "organizer" | "finance" | "vendor" | "other";

export interface Account {
  id: string;
  name: string;
  contact_email: string | null;
  status: AccountStatus;
  created_at: string;
}

export interface AccountUser {
  id: string;
  account_id: string;
  user_id: string;
  is_owner: boolean;
  can_checkin: boolean;
  can_manage_participants: boolean;
  created_at: string;
}

export interface Event {
  id: string;
  account_id: string;
  name: string;
  slug: string;
  status: EventStatus;
  ticket_quota: number;
  event_date: string | null;
  created_at: string;
  closed_at: string | null;
  closed_by: string | null;
}

export interface FormField {
  id: string;
  event_id: string;
  key: string;
  label: string;
  field_type: FieldType;
  options: string[] | null;
  required: boolean;
  sort_order: number;
  created_at: string;
}

export interface Template {
  id: string;
  event_id: string;
  name: string;
  image_path: string;
  image_width: number;
  image_height: number;
  price: number;
  created_at: string;
}

export interface TemplateAnchor {
  id: string;
  template_id: string;
  kind: AnchorKind;
  field_key: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  font: string;
  font_size: number;
  align: "left" | "center" | "right";
  color: string;
  visible: boolean;
  created_at: string;
}

export interface Ticket {
  id: string;
  event_id: string;
  template_id: string;
  participant_data: Record<string, string>;
  status: TicketStatus;
  checked_in_at: string | null;
  issued_by: string | null;
  amount_collected: number;
  created_at: string;
}

export interface UserDirectoryEntry {
  user_id: string;
  email: string;
  created_at: string;
}

export interface CheckIn {
  id: string;
  ticket_id: string;
  event_id: string;
  staff_user_id: string | null;
  device_info: string | null;
  result: CheckInResult;
  created_at: string;
}

export interface CashHandover {
  id: string;
  event_id: string;
  staff_user_id: string;
  amount: number;
  recipient_type: HandoverRecipientType;
  recipient_name: string | null;
  note: string | null;
  created_at: string;
}
