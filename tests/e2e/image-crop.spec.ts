/**
 * E2E §8.3 recorrido 2 — recorte: cada preset de proporción produce un resultado
 * con las dimensiones exactas. El blob de salida se decodifica en el worker y se
 * comprueban `width`/`height` (no la extensión).
 */

import { expect, test } from "@playwright/test";
import { STANDARD_RATIOS } from "../../src/lib/domain/aspect";
import { centeredRectForRatio } from "../../src/lib/domain/crop";
import { convert, fixture, makeRecipe, openHarness } from "./image-harness";

const SOURCE = { width: 640, height: 360 };

test("cada preset de proporción recorta a las dimensiones exactas", async ({ page }) => {
  await openHarness(page);
  for (const [label, ratio] of Object.entries(STANDARD_RATIOS)) {
    const rect = centeredRectForRatio(SOURCE, ratio);
    const res = await convert(
      page,
      makeRecipe({
        format: "png",
        type: "image/png",
        width: SOURCE.width,
        height: SOURCE.height,
        ops: [{ type: "crop", x: rect.x, y: rect.y, width: rect.width, height: rect.height }],
      }),
      fixture("gradient.png"),
    );
    expect(res.detected, label).toBe("png");
    expect(res.width, label).toBe(rect.width);
    expect(res.height, label).toBe(rect.height);
  }
});
