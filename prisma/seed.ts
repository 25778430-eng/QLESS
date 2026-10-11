// Demo data matching the mock-up: three approved shops in Johannesburg, one pending, and an admin.
// Run with: npm run db:seed
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function vendor(opts: {
  owner: { phone: string; name: string };
  name: string; slug: string; category: string; cipc: string; address: string; lat: number; lng: number;
  status: "APPROVED" | "PENDING";
  staff: string[]; services: Array<[string, number, number]>;
}) {
  const owner = await db.user.upsert({
    where: { phone: opts.owner.phone },
    create: { ...opts.owner, role: "VENDOR", consentReminders: true, consentAt: new Date() },
    update: {},
  });
  const existing = await db.vendor.findUnique({ where: { slug: opts.slug } });
  if (existing) return existing;
  return db.vendor.create({
    data: {
      ownerId: owner.id, name: opts.name, slug: opts.slug, category: opts.category, cipc: opts.cipc,
      address: opts.address, lat: opts.lat, lng: opts.lng, phone: opts.owner.phone, status: opts.status,
      staff: { create: opts.staff.map((name) => ({ name })) },
      services: { create: opts.services.map(([name, durationMins, rands]) => ({ name, durationMins, priceCents: rands * 100 })) },
    },
  });
}

async function main() {
  await db.user.upsert({
    where: { phone: "+27820000000" },
    create: { phone: "+27820000000", name: "Qless Admin", role: "ADMIN", consentReminders: true, consentAt: new Date() },
    update: { role: "ADMIN" },
  });
  await vendor({
    owner: { phone: "+27712345678", name: "Tshepo Dlamini" },
    name: "Sharp Lines Barbershop", slug: "sharp-lines", category: "Barber", cipc: "2021/483920/07",
    address: "12 Jorissen St, Braamfontein, Johannesburg", lat: -26.1929, lng: 28.0335, status: "APPROVED",
    staff: ["Tshepo", "Bongani"],
    services: [["Skin fade", 30, 120], ["Cut & beard", 45, 160], ["Kids cut", 20, 80], ["Chiskop", 15, 70]],
  });
  await vendor({
    owner: { phone: "+27723456789", name: "Naledi Khumalo" },
    name: "Nailed It Studio", slug: "nailed-it", category: "Nail technician", cipc: "2022/118204/07",
    address: "44 Stiemens St, Braamfontein, Johannesburg", lat: -26.1912, lng: 28.0371, status: "APPROVED",
    staff: ["Naledi"],
    services: [["Gel overlay", 60, 280], ["Acrylic full set", 90, 380], ["Manicure", 40, 180]],
  });
  await vendor({
    owner: { phone: "+27734567890", name: "Sipho Mthembu" },
    name: "Kasi Kutz", slug: "kasi-kutz", category: "Barber", cipc: "2019/700455/07",
    address: "Melle St, Braamfontein, Johannesburg", lat: -26.1955, lng: 28.0362, status: "APPROVED",
    staff: ["Sipho", "Lindo", "Kabelo"],
    services: [["Chiskop", 15, 60], ["Fade", 30, 100]],
  });
  await vendor({
    owner: { phone: "+27745678901", name: "Thandi Nkosi" },
    name: "Cape Braids Co.", slug: "cape-braids", category: "Hair salon", cipc: "2023/552201/07",
    address: "Lansdowne Rd, Khayelitsha, Cape Town", lat: -34.0365, lng: 18.6772, status: "PENDING",
    staff: ["Thandi"],
    services: [["Box braids", 240, 650]],
  });
  console.log("Seeded. Admin phone +27 82 000 0000; Sharp Lines owner +27 71 234 5678.");
}

main().finally(() => db.$disconnect());
