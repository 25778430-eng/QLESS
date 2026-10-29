import "server-only";
import { normalisePhone } from "./format";
import { str } from "./http";
import type { WalkInRequest } from "./bookings";

/** Service pickers send "serviceId::option label" so one list covers options like car sizes. */
export function splitServiceChoice(value: string): { serviceId: string; optionLabel: string | null } {
  const [serviceId, ...rest] = value.split("::");
  return { serviceId: serviceId ?? "", optionLabel: rest.length ? rest.join("::") : null };
}

/** Reads the shared walk-in form. Returns an error message for a bad phone number. */
export function walkInFromForm(form: FormData, staffId: string | null): WalkInRequest | string {
  const raw = str(form, "phone");
  const phone = raw ? normalisePhone(raw) : null;
  if (raw && !phone) return "That cellphone number doesn't look right. Leave it blank to skip the SMS.";
  return {
    name: str(form, "name"),
    ...splitServiceChoice(str(form, "service")),
    staffId,
    phone,
    plate: str(form, "plate"),
    item: str(form, "item"),
  };
}
