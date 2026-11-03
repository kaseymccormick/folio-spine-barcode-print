import { describe, expect, it } from "vitest";
import { isEduUsername } from "./folioUsername";

describe("isEduUsername", () => {
  it.each(["jdoe@boisestate.edu", "JDOE@BOISESTATE.EDU", "  jdoe@boisestate.edu  "])("accepts %j", (u) => {
    expect(isEduUsername(u)).toBe(true);
  });

  it.each(["", "jdoe", "jdoe@gmail.com", "jdoe@boisestate.edu.evil.com", "jdoe@boisestateedu", "jdoe@boisestate.edu "+"x"])(
    "rejects %j",
    (u) => {
      expect(isEduUsername(u)).toBe(false);
    }
  );
});
