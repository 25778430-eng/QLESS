import { describe, expect, it } from "vitest";
import { hello, t, translateNav } from "./i18n";

describe("languages", () => {
  it("translates and fills in numbers", () => {
    expect(t("zu", "home.ahead", { n: 3 })).toBe("3 phambi kwakho");
    expect(t("af", "shop.join")).toBe("Sluit by die tou aan");
  });

  it("falls back to English", () => {
    expect(t("fr", "shop.join")).toBe("Join the queue");
  });

  it("translates only the customer tabs", () => {
    const nav = translateNav([{ href: "/discover", label: "Home" }, { href: "/vendor", label: "Queue" }], "st");
    expect(nav.map((n) => n.label)).toEqual(["Lehae", "Queue"]);
  });

  it("greets by time of day", () => {
    expect(hello("af", new Date("2026-10-10T06:00:00Z"))).toBe("Goeiemôre");
    expect(hello("en", new Date("2026-10-10T17:00:00Z"))).toBe("Good evening");
  });
});
