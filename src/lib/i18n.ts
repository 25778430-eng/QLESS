// Words customers see most, in five South African languages. English is the fallback for anything missing.
// The isiZulu, isiXhosa, Afrikaans and Sesotho lines need checking by native speakers before launch.

export const LANGS = { en: "English", zu: "isiZulu", xh: "isiXhosa", af: "Afrikaans", st: "Sesotho" } as const;
export type Lang = keyof typeof LANGS;
export const LANG_COOKIE = "lang";

const en = {
  "nav.home": "Home",
  "nav.map": "Map",
  "nav.scan": "Scan",
  "nav.bookings": "Bookings",
  "nav.account": "Account",
  "hello.morning": "Good morning",
  "hello.afternoon": "Good afternoon",
  "hello.evening": "Good evening",
  "home.tagline": "Book your spot. Arrive when it's your turn.",
  "home.find": "Find a place",
  "home.search": "Search a business or service",
  "home.go": "Search",
  "home.near": "Shortest waits near you",
  "home.places": "Places",
  "home.all": "All",
  "home.seeMap": "See map",
  "home.waiting": "waiting",
  "home.full": "Full",
  "home.closed": "Closed",
  "home.none": "Nothing found",
  "home.yourTicket": "Your ticket",
  "home.ahead": "{n} ahead of you",
  "home.turnAbout": "Your turn about",
  "home.view": "View",
  "shop.join": "Join the queue",
  "shop.getTicket": "Get a ticket",
  "shop.later": "Book a later day",
  "shop.signIn": "Sign in to join the queue",
  "booking.ahead": "people ahead of you",
  "booking.code": "Show this code when you arrive",
  "booking.cancel": "Cancel booking",
  "booking.moveBack": "Move my spot back",
  "account.language": "Language",
} as const;
export type Key = keyof typeof en;

const zu: Partial<Record<Key, string>> = {
  "nav.home": "Ekhaya",
  "nav.map": "Imephu",
  "nav.scan": "Skena",
  "nav.bookings": "Ukubhuka",
  "nav.account": "I-akhawunti",
  "hello.morning": "Sawubona",
  "hello.afternoon": "Sawubona",
  "hello.evening": "Sawubona",
  "home.tagline": "Bhuka indawo yakho. Fika uma sekuyithuba lakho.",
  "home.find": "Thola indawo",
  "home.search": "Sesha ibhizinisi noma isevisi",
  "home.go": "Sesha",
  "home.near": "Ukulinda okufushane eduze kwakho",
  "home.places": "Izindawo",
  "home.all": "Konke",
  "home.seeMap": "Bona imephu",
  "home.waiting": "abalindile",
  "home.full": "Kugcwele",
  "home.closed": "Kuvaliwe",
  "home.none": "Akukho okutholakele",
  "home.yourTicket": "Ithikithi lakho",
  "home.ahead": "{n} phambi kwakho",
  "home.turnAbout": "Ithuba lakho cishe",
  "home.view": "Buka",
  "shop.join": "Joyina ulayini",
  "shop.getTicket": "Thola ithikithi",
  "shop.later": "Bhuka olunye usuku",
  "shop.signIn": "Ngena ukuze ujoyine ulayini",
  "booking.ahead": "abantu phambi kwakho",
  "booking.code": "Bonisa le khodi uma ufika",
  "booking.cancel": "Khansela ukubhuka",
  "booking.moveBack": "Buyisela indawo yami emuva",
  "account.language": "Ulimi",
};

const xh: Partial<Record<Key, string>> = {
  "nav.home": "Ekhaya",
  "nav.map": "Imaphu",
  "nav.scan": "Skena",
  "nav.bookings": "Ukubhukisha",
  "nav.account": "I-akhawunti",
  "hello.morning": "Molo",
  "hello.afternoon": "Molo",
  "hello.evening": "Molo",
  "home.tagline": "Bhukisha indawo yakho. Fika xa lithuba lakho.",
  "home.find": "Fumana indawo",
  "home.search": "Khangela ishishini okanye inkonzo",
  "home.go": "Khangela",
  "home.near": "Ukulinda okufutshane kufuphi nawe",
  "home.places": "Iindawo",
  "home.all": "Zonke",
  "home.seeMap": "Jonga imaphu",
  "home.waiting": "abalindileyo",
  "home.full": "Kugcwele",
  "home.closed": "Kuvaliwe",
  "home.none": "Akukho nto ifunyenweyo",
  "home.yourTicket": "Itikiti lakho",
  "home.ahead": "{n} phambi kwakho",
  "home.turnAbout": "Ithuba lakho malunga",
  "home.view": "Jonga",
  "shop.join": "Joyina umgca",
  "shop.getTicket": "Fumana itikiti",
  "shop.later": "Bhukisha omnye umhla",
  "shop.signIn": "Ngena ukuze ujoyine umgca",
  "booking.ahead": "abantu phambi kwakho",
  "booking.code": "Bonisa le khowudi xa ufika",
  "booking.cancel": "Rhoxisa ukubhukisha",
  "booking.moveBack": "Buyisela indawo yam emva",
  "account.language": "Ulwimi",
};

const af: Partial<Record<Key, string>> = {
  "nav.home": "Tuis",
  "nav.map": "Kaart",
  "nav.scan": "Skandeer",
  "nav.bookings": "Besprekings",
  "nav.account": "Rekening",
  "hello.morning": "Goeiemôre",
  "hello.afternoon": "Goeiemiddag",
  "hello.evening": "Goeienaand",
  "home.tagline": "Bespreek jou plek. Kom wanneer dit jou beurt is.",
  "home.find": "Vind 'n plek",
  "home.search": "Soek 'n besigheid of diens",
  "home.go": "Soek",
  "home.near": "Kortste wagtye naby jou",
  "home.places": "Plekke",
  "home.all": "Alles",
  "home.seeMap": "Sien kaart",
  "home.waiting": "wag",
  "home.full": "Vol",
  "home.closed": "Gesluit",
  "home.none": "Niks gevind nie",
  "home.yourTicket": "Jou kaartjie",
  "home.ahead": "{n} voor jou",
  "home.turnAbout": "Jou beurt omtrent",
  "home.view": "Sien",
  "shop.join": "Sluit by die tou aan",
  "shop.getTicket": "Kry 'n kaartjie",
  "shop.later": "Bespreek 'n later dag",
  "shop.signIn": "Teken in om by die tou aan te sluit",
  "booking.ahead": "mense voor jou",
  "booking.code": "Wys hierdie kode wanneer jy aankom",
  "booking.cancel": "Kanselleer bespreking",
  "booking.moveBack": "Skuif my plek terug",
  "account.language": "Taal",
};

const st: Partial<Record<Key, string>> = {
  "nav.home": "Lehae",
  "nav.map": "Mmapa",
  "nav.scan": "Skena",
  "nav.bookings": "Dibuka",
  "nav.account": "Akhaonto",
  "hello.morning": "Dumela",
  "hello.afternoon": "Dumela",
  "hello.evening": "Dumela",
  "home.tagline": "Buka sebaka sa hao. Fihla ha e le nako ya hao.",
  "home.find": "Fumana sebaka",
  "home.search": "Batla kgwebo kapa tshebeletso",
  "home.go": "Batla",
  "home.near": "Ho ema ho kgutshwane haufi le wena",
  "home.places": "Dibaka",
  "home.all": "Tsohle",
  "home.seeMap": "Bona mmapa",
  "home.waiting": "ba emetse",
  "home.full": "Ho tletse",
  "home.closed": "Ho kwetswe",
  "home.none": "Ha ho letho le fumanweng",
  "home.yourTicket": "Tekete ya hao",
  "home.ahead": "{n} ka pele ho hao",
  "home.turnAbout": "Nako ya hao e ka ba",
  "home.view": "Sheba",
  "shop.join": "Kena moleng",
  "shop.getTicket": "Fumana tekete",
  "shop.later": "Buka letsatsi le leng",
  "shop.signIn": "Kena ho kena moleng",
  "booking.ahead": "batho ka pele ho hao",
  "booking.code": "Bontsha khoutu ena ha o fihla",
  "booking.cancel": "Hlakola buka",
  "booking.moveBack": "Kgutlisetsa sebaka sa ka morao",
  "account.language": "Puo",
};

const DICTS: Record<Lang, Partial<Record<Key, string>>> = { en, zu, xh, af, st };

export function isLang(v: string | null | undefined): v is Lang {
  return !!v && v in LANGS;
}

/** A translated line, with {name} placeholders filled in. Falls back to English. */
export function t(lang: string, key: Key, vars: Record<string, string | number> = {}): string {
  const text = DICTS[isLang(lang) ? lang : "en"][key] ?? en[key];
  return text.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""));
}

const NAV_KEYS: Record<string, Key> = { "/discover": "nav.home", "/map": "nav.map", "/scan": "nav.scan", "/bookings": "nav.bookings", "/account": "nav.account" };

/** Translates the customer tab bar labels. Shop and staff tabs stay as they are. */
export function translateNav<T extends { href: string; label: string }>(items: T[], lang: string): T[] {
  return items.map((i) => (NAV_KEYS[i.href] ? { ...i, label: t(lang, NAV_KEYS[i.href]!) } : i));
}

/** Good morning / afternoon / evening in South Africa, in the user's language. */
export function hello(lang: string, now = new Date()): string {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Johannesburg", hour: "2-digit", hour12: false }).format(now));
  return t(lang, hour < 12 ? "hello.morning" : hour < 17 ? "hello.afternoon" : "hello.evening");
}
