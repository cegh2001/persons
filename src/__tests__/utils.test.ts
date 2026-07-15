import { describe, it, expect } from "vitest";
import { cn, getLocationColor } from "@/lib/utils";

describe("cn (classname utility)", () => {
  it("merges tailwind classes correctly", () => {
    const result = cn("px-4", "py-2");
    expect(result).toContain("px-4");
    expect(result).toContain("py-2");
  });

  it("handles conditional classes", () => {
    const result = cn("base", false && "hidden", "visible");
    expect(result).toContain("base");
    expect(result).toContain("visible");
    expect(result).not.toContain("hidden");
  });

  it("resolves tailwind conflicts via twMerge", () => {
    const result = cn("px-4", "px-6");
    expect(result).toContain("px-6");
    expect(result).not.toContain("px-4");
  });
});

describe("getLocationColor", () => {
  it("returns a color class string for known locations", () => {
    const color = getLocationColor("Casco Central");
    expect(color).toBeTruthy();
    expect(typeof color).toBe("string");
    expect(color).toContain("bg-");
  });

  it("returns a default color for unknown locations", () => {
    const color = getLocationColor("Marte");
    expect(color).toContain("bg-slate-50");
  });
});
