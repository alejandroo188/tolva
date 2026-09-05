import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("proyecto", () => {
  it("declara el nombre y la licencia MIT", () => {
    const pkg = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8")) as {
      name: string;
      license: string;
    };
    expect(pkg.name).toBe("tolva");
    expect(pkg.license).toBe("MIT");
  });
});
