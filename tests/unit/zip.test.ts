import { describe, expect, it } from "vitest";
import { unzipSync, strFromU8 } from "fflate";
import { buildZip } from "../../src/lib/image/zip";

describe("buildZip", () => {
  it("produce un ZIP con firma PK y las entradas esperadas", () => {
    const zip = buildZip([
      { name: "foto.webp", data: new TextEncoder().encode("contenido-1") },
      { name: "otra.avif", data: new TextEncoder().encode("contenido-2") },
    ]);
    const bytes = new Uint8Array(zip);
    // Firma ZIP: "PK\x03\x04".
    expect([bytes[0], bytes[1], bytes[2], bytes[3]]).toEqual([0x50, 0x4b, 0x03, 0x04]);

    const unzipped = unzipSync(zip);
    expect(Object.keys(unzipped).sort()).toEqual(["foto.webp", "otra.avif"]);
    expect(strFromU8(unzipped["foto.webp"])).toBe("contenido-1");
    expect(strFromU8(unzipped["otra.avif"])).toBe("contenido-2");
  });

  it("admite un ZIP vacío (sin entradas)", () => {
    const zip = buildZip([]);
    expect(zip.length).toBeGreaterThan(0);
    expect(Object.keys(unzipSync(zip))).toEqual([]);
  });
});
