import { describe, expect, it } from "vitest";
import { nextTicketNo, parseOptionLines, priceFrom, quote, serviceOptions } from "./pricing";

const wash = {
  name: "Full wash",
  priceCents: 8000,
  durationMins: 30,
  options: [
    { label: "Small car", priceCents: 8000, durationMins: 30 },
    { label: "SUV", priceCents: 12000, durationMins: 45 },
  ],
};

describe("price options", () => {
  it("parses the owner's lines", () => {
    expect(parseOptionLines("Small car | 80 | 30\nSUV | R120 | 45\n\nBakkie | 110", 40)).toEqual([
      { label: "Small car", priceCents: 8000, durationMins: 30 },
      { label: "SUV", priceCents: 12000, durationMins: 45 },
      { label: "Bakkie", priceCents: 11000, durationMins: 40 },
    ]);
  });

  it("explains a bad line", () => {
    expect(parseOptionLines("SUV | lots", 30)).toMatch(/Check this line/);
  });

  it("ignores junk stored on a service", () => {
    expect(serviceOptions({ options: [{ label: "x" }, null, { label: "ok", priceCents: 100, durationMins: 10 }] })).toHaveLength(1);
    expect(serviceOptions({ options: "nope" })).toEqual([]);
  });

  it("shows 'from' the cheapest option", () => {
    expect(priceFrom(wash)).toEqual({ cents: 8000, from: true });
    expect(priceFrom({ ...wash, options: [] })).toEqual({ cents: 8000, from: false });
  });

  it("prices an option with extras", () => {
    const q = quote(wash, "SUV", [{ name: "Wax", priceCents: 5000, durationMins: 15 }]);
    expect(q).toEqual({ priceCents: 17000, durationMins: 60, optionLabel: "SUV", extrasCents: 5000, extras: "Wax" });
  });

  it("refuses an option that doesn't exist", () => {
    expect(quote(wash, "Truck")).toBeNull();
  });
});

describe("ticket numbers", () => {
  it("counts up per letter", () => {
    expect(nextTicketNo("A", [])).toBe("A001");
    expect(nextTicketNo("A", ["A001", "B004", "A026", null])).toBe("A027");
    expect(nextTicketNo(null, ["001", "A009"])).toBe("002");
  });
});
