// Kinds of queue business on Qless. The type sets the wording customers see (chair, bay, room, counter)
// and which tools the shop gets. Pure, no database access.

export const BUSINESS_TYPES = ["SALON", "CAR_WASH", "CLINIC", "REPAIR", "PRIVATE", "GOVERNMENT"] as const;
export type BusinessType = (typeof BUSINESS_TYPES)[number];

export type TypeInfo = {
  label: string;
  short: string;
  /** What a customer is served at: "chair", "bay", "room", "counter", "desk". */
  station: string;
  /** What the people serving are called. */
  staffWord: string;
  /** Categories a shop of this type picks from at sign-up. */
  categories: string[];
  hint: string;
  /** Ask for a number plate and send "car ready" alerts. */
  plates: boolean;
  /** Track a repair job through stages, with a quote the customer approves. */
  jobs: boolean;
  /** Free queue: no deposit and no booking fee, ever. */
  free: boolean;
};

export const TYPES: Record<BusinessType, TypeInfo> = {
  SALON: {
    label: "Hair and beauty",
    short: "Hair & beauty",
    station: "chair",
    staffWord: "Staff",
    categories: ["Barber", "Hair salon", "Nail technician", "Braids", "Beauty and spa"],
    hint: "Barbers, salons, nail techs, braiders",
    plates: false,
    jobs: false,
    free: false,
  },
  CAR_WASH: {
    label: "Car wash",
    short: "Car wash",
    station: "bay",
    staffWord: "Washers",
    categories: ["Car wash", "Valet and detailing"],
    hint: "Prices by car size, number plates and \"car ready\" alerts",
    plates: true,
    jobs: false,
    free: false,
  },
  CLINIC: {
    label: "Clinic or practice",
    short: "Clinics",
    station: "room",
    staffWord: "Practitioners",
    categories: ["Dentist", "Doctor", "Physio", "Optometrist", "Vet", "Other clinic"],
    hint: "Dentists, doctors, physios, vets",
    plates: false,
    jobs: false,
    free: false,
  },
  REPAIR: {
    label: "Repair shop",
    short: "Repairs",
    station: "counter",
    staffWord: "Technicians",
    categories: ["Phone repair", "Laptop repair", "Mechanic", "Tailor", "Shoe repair", "Other repair"],
    hint: "Job cards, quotes the customer approves, \"ready to collect\" alerts",
    plates: false,
    jobs: true,
    free: false,
  },
  PRIVATE: {
    label: "Private clients",
    short: "Private",
    station: "desk",
    staffWord: "Consultants",
    categories: ["Consultant", "Tutor", "Lawyer", "Accountant", "Other"],
    hint: "Consultants, tutors, one-on-one services",
    plates: false,
    jobs: false,
    free: false,
  },
  GOVERNMENT: {
    label: "Government or municipal",
    short: "Government",
    station: "counter",
    staffWord: "Counters",
    categories: ["Home Affairs", "SASSA", "Licensing", "Municipal office", "Clinic (public)", "Other office"],
    hint: "Free tickets like A027, a \"bring with you\" list, no deposits or fees",
    plates: false,
    jobs: false,
    free: true,
  },
};

export function isBusinessType(v: string): v is BusinessType {
  return (BUSINESS_TYPES as readonly string[]).includes(v);
}

export function typeInfo(t: string | null | undefined): TypeInfo {
  return TYPES[isBusinessType(t ?? "") ? (t as BusinessType) : "SALON"];
}

/** The type a sign-up category belongs to. Older categories ("Other") fall back to PRIVATE. */
export function typeOfCategory(category: string): BusinessType | null {
  for (const t of BUSINESS_TYPES) if (TYPES[t].categories.includes(category)) return t;
  return null;
}

/** Types the super admin hasn't switched off. */
export function enabledTypes(disabled: string[]): BusinessType[] {
  return BUSINESS_TYPES.filter((t) => !disabled.includes(t));
}

/** "Chair 2", "Bay 2", "Counter 2". */
export function stationName(t: string, n: number): string {
  const s = typeInfo(t).station;
  return `${s[0]!.toUpperCase()}${s.slice(1)} ${n}`;
}

/** Normalises a number plate: "ca 123-456" → "CA 123 456". */
export function normalisePlate(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim().slice(0, 12);
}

export const JOB_STAGES = ["RECEIVED", "CHECKING", "QUOTE", "WORKING", "READY"] as const;
export type JobStage = (typeof JOB_STAGES)[number];

export const JOB_LABEL: Record<JobStage, string> = {
  RECEIVED: "Received",
  CHECKING: "Checking",
  QUOTE: "Quote sent",
  WORKING: "Being fixed",
  READY: "Ready to collect",
};

/** The stage after this one. A quote waits for the customer before work starts. */
export function nextStage(stage: string | null, quoteApproved: boolean | null): JobStage | null {
  const i = JOB_STAGES.indexOf((stage ?? "RECEIVED") as JobStage);
  if (i < 0 || i === JOB_STAGES.length - 1) return null;
  if (stage === "QUOTE" && quoteApproved !== true) return null;
  return JOB_STAGES[i + 1]!;
}
