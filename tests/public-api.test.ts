import { describe, expect, it } from "vitest";

import { Format, Type } from "@module-foundry/rlottie-web";

describe("public source enums", () => {
  it("keeps stable numeric values", () => {
    expect(Format.Local).toBe(0);
    expect(Format.URL).toBe(1);
    expect(Type.JSON).toBe(0);
    expect(Type.TGS).toBe(1);
  });
});
