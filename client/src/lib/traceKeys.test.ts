import { describe, expect, it } from "vitest";
import { memberIdFromUsageKey } from "@/lib/traceKeys";

describe("memberIdFromUsageKey", () => {
  it("parses signature type keys without treating sig-type as a line number", () => {
    expect(
      memberIdFromUsageKey("flow-a::member-1::sig-type::AddressFieldKind"),
    ).toBe("member-1");
  });

  it("parses body usage keys with line numbers", () => {
    expect(memberIdFromUsageKey("flow-a::member-1::12::field")).toBe("member-1");
  });

  it("rejects malformed keys", () => {
    expect(memberIdFromUsageKey("flow-a::def::member-1")).toBeNull();
    expect(memberIdFromUsageKey("flow-a::member-1::not-a-line::x")).toBeNull();
  });
});
