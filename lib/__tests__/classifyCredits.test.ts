import { classifyCredits } from "../classifyCredits";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("classifyCredits", () => {
  beforeEach(() => {
    // Mock console.warn to track if warnings are logged
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Freshman range (0–29.9)", () => {
    it("should return 'Freshman' for 0 credits", () => {
      expect(classifyCredits(0)).toBe("Freshman");
    });

    it("should return 'Freshman' for 15 credits", () => {
      expect(classifyCredits(15)).toBe("Freshman");
    });

    it("should return 'Freshman' for 29.9 credits", () => {
      expect(classifyCredits(29.9)).toBe("Freshman");
    });
  });

  describe("Sophomore range (30–59.9)", () => {
    it("should return 'Sophomore' for 30 credits", () => {
      expect(classifyCredits(30)).toBe("Sophomore");
    });

    it("should return 'Sophomore' for 45 credits", () => {
      expect(classifyCredits(45)).toBe("Sophomore");
    });

    it("should return 'Sophomore' for 59.9 credits", () => {
      expect(classifyCredits(59.9)).toBe("Sophomore");
    });
  });

  describe("Junior range (60–89.9)", () => {
    it("should return 'Junior' for 60 credits", () => {
      expect(classifyCredits(60)).toBe("Junior");
    });

    it("should return 'Junior' for 75 credits", () => {
      expect(classifyCredits(75)).toBe("Junior");
    });

    it("should return 'Junior' for 89.9 credits", () => {
      expect(classifyCredits(89.9)).toBe("Junior");
    });
  });

  describe("Senior range (90+)", () => {
    it("should return 'Senior' for 90 credits", () => {
      expect(classifyCredits(90)).toBe("Senior");
    });

    it("should return 'Senior' for 120 credits", () => {
      expect(classifyCredits(120)).toBe("Senior");
    });

    it("should return 'Senior' for 150 credits", () => {
      expect(classifyCredits(150)).toBe("Senior");
    });
  });

  describe("Boundary edge cases", () => {
    it("should classify 29.99 as Freshman", () => {
      expect(classifyCredits(29.99)).toBe("Freshman");
    });

    it("should classify 30.0 as Sophomore", () => {
      expect(classifyCredits(30.0)).toBe("Sophomore");
    });

    it("should classify 59.99 as Sophomore", () => {
      expect(classifyCredits(59.99)).toBe("Sophomore");
    });

    it("should classify 60.0 as Junior", () => {
      expect(classifyCredits(60.0)).toBe("Junior");
    });

    it("should classify 89.99 as Junior", () => {
      expect(classifyCredits(89.99)).toBe("Junior");
    });

    it("should classify 90.0 as Senior", () => {
      expect(classifyCredits(90.0)).toBe("Senior");
    });
  });

  describe("Invalid values default to Freshman", () => {
    it("should return 'Freshman' for undefined and log a warning", () => {
      expect(classifyCredits(undefined)).toBe("Freshman");
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining("Invalid totalCreditsEarned (null/undefined)")
      );
    });

    it("should return 'Freshman' for null and log a warning", () => {
      expect(classifyCredits(null)).toBe("Freshman");
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining("Invalid totalCreditsEarned (null/undefined)")
      );
    });

    it("should return 'Freshman' for NaN and log a warning", () => {
      expect(classifyCredits(NaN)).toBe("Freshman");
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining("Invalid totalCreditsEarned (NaN)")
      );
    });

    it("should return 'Freshman' for -1 and log a warning", () => {
      expect(classifyCredits(-1)).toBe("Freshman");
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining("Invalid totalCreditsEarned (negative)")
      );
    });

    it("should return 'Freshman' for -100 and log a warning", () => {
      expect(classifyCredits(-100)).toBe("Freshman");
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining("Invalid totalCreditsEarned (negative)")
      );
    });
  });

  describe("Decimal precision", () => {
    it("should handle decimal values correctly", () => {
      expect(classifyCredits(29.5)).toBe("Freshman");
      expect(classifyCredits(30.5)).toBe("Sophomore");
      expect(classifyCredits(59.5)).toBe("Sophomore");
      expect(classifyCredits(60.5)).toBe("Junior");
      expect(classifyCredits(89.5)).toBe("Junior");
      expect(classifyCredits(90.5)).toBe("Senior");
    });

    it("should handle very precise decimal values", () => {
      expect(classifyCredits(29.999999)).toBe("Freshman");
      expect(classifyCredits(30.000001)).toBe("Sophomore");
    });
  });
});
