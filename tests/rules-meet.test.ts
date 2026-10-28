import { describe, expect, it } from "vitest";
import {
  CODE_ALPHABET,
  codeFromBytes,
  connectionRate,
  dayOf,
  joinProblem,
  meetExpiry,
  normalizeMeetCode,
  pair,
  signalParty,
} from "../src/rules/meet";

const now = new Date("2026-10-28T14:00:00.000Z");
const ex = { initiator_id: "ana", joiner_id: null, expires_at: meetExpiry(now) };
const party = signalParty("ana", ["ben"]);

describe("codes", () => {
  it("makes 6 unambiguous characters", () => {
    const code = codeFromBytes(new Uint8Array([0, 1, 2, 30, 31, 255]));
    expect(code).toHaveLength(6);
    for (const c of code) expect(CODE_ALPHABET).toContain(c);
    expect(CODE_ALPHABET).not.toMatch(/[0O1IL]/);
  });

  it("reads codes typed with spaces, dashes or lower case", () => {
    expect(normalizeMeetCode(" k7q-x4m ")).toBe("K7QX4M");
    expect(normalizeMeetCode("K7QX4")).toBeNull();
    expect(normalizeMeetCode("K7QX0M")).toBeNull();
  });

  it("lasts 10 minutes", () => {
    expect(meetExpiry(now)).toBe("2026-10-28T14:10:00.000Z");
  });
});

describe("joinProblem", () => {
  it("lets the other person from the signal join", () => {
    expect(joinProblem(ex, "ben", party, "ana", false, now)).toBeNull();
  });

  it("refuses the initiator scanning their own code", () => {
    expect(joinProblem(ex, "ana", party, "ana", false, now)).toBe("self");
  });

  it("refuses after 10 minutes", () => {
    expect(joinProblem(ex, "ben", party, "ana", false, new Date("2026-10-28T14:10:00.000Z"))).toBe("expired");
  });

  it("refuses a third person, and anyone once it's taken", () => {
    expect(joinProblem(ex, "cleo", party, "ana", false, now)).toBe("not_party");
    expect(joinProblem({ ...ex, joiner_id: "ben" }, "cleo", signalParty("ana", ["ben", "cleo"]), "ana", false, now)).toBe("taken");
    expect(joinProblem({ ...ex, joiner_id: "ben" }, "ben", party, "ana", false, now)).toBeNull();
  });

  it("refuses two responders meeting each other: only the owner saw their names", () => {
    const bothAccepted = signalParty("ana", ["ben", "cleo"]);
    expect(joinProblem({ ...ex, initiator_id: "ben" }, "cleo", bothAccepted, "ana", false, now)).toBe("not_party");
    expect(joinProblem({ ...ex, initiator_id: "ben" }, "ana", bothAccepted, "ana", false, now)).toBeNull();
  });

  it("refuses after a block", () => {
    expect(joinProblem(ex, "ben", party, "ana", true, now)).toBe("blocked");
  });
});

describe("pairs and numbers", () => {
  it("orders a pair the same way whoever starts", () => {
    expect(pair("ben", "ana")).toEqual(["ana", "ben"]);
    expect(pair("ana", "ben")).toEqual(["ana", "ben"]);
    expect(dayOf(now)).toBe("2026-10-28");
  });

  it("gives the connection rate as collective numbers", () => {
    expect(connectionRate(9, 7)).toEqual({ met: 7, of: 9, percent: 78 });
    expect(connectionRate(0, 0)).toEqual({ met: 0, of: 0, percent: null });
    expect(connectionRate(2, 5)).toEqual({ met: 2, of: 2, percent: 100 });
  });
});
