import { describe, expect, it } from "vitest";
import { enabledTypes, nextStage, normalisePlate, stationName, typeInfo, typeOfCategory } from "./business-types";

describe("business types", () => {
  it("finds the type of a category", () => {
    expect(typeOfCategory("Barber")).toBe("SALON");
    expect(typeOfCategory("Car wash")).toBe("CAR_WASH");
    expect(typeOfCategory("Home Affairs")).toBe("GOVERNMENT");
    expect(typeOfCategory("Nope")).toBeNull();
  });

  it("uses the right word for where people are served", () => {
    expect(stationName("CAR_WASH", 2)).toBe("Bay 2");
    expect(stationName("SALON", 1)).toBe("Chair 1");
    expect(typeInfo("rubbish").station).toBe("chair");
  });

  it("leaves out switched-off types", () => {
    expect(enabledTypes(["GOVERNMENT"])).not.toContain("GOVERNMENT");
    expect(enabledTypes([])).toHaveLength(6);
  });

  it("tidies number plates", () => {
    expect(normalisePlate(" ca 123-456 ")).toBe("CA 123 456");
  });

  it("waits for the customer's yes before fixing", () => {
    expect(nextStage(null, null)).toBe("CHECKING");
    expect(nextStage("QUOTE", null)).toBeNull();
    expect(nextStage("QUOTE", true)).toBe("WORKING");
    expect(nextStage("READY", true)).toBeNull();
  });
});
