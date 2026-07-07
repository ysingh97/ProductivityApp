import dayjs from "dayjs";
import {
  getGoalEstimateHoursError,
  getGoalTargetCompletionDateMinDateTime,
  getGoalTargetCompletionDateError,
  parseGoalEstimateHours
} from "./goalValidation";

describe("goalValidation", () => {
  test("rejects target completion dates earlier than now", () => {
    const now = dayjs("2026-06-25T12:00:00Z");
    const targetCompletionDate = dayjs("2026-06-25T11:59:00Z");

    expect(
      getGoalTargetCompletionDateError({
        targetCompletionDate,
        now,
        parentDeadline: null
      })
    ).toBe("Target completion date cannot be earlier than the current time.");
  });

  test("rejects target completion dates after the parent deadline", () => {
    const now = dayjs("2026-06-25T12:00:00Z");
    const targetCompletionDate = dayjs("2026-06-27T12:00:00Z");
    const parentDeadline = dayjs("2026-06-26T12:00:00Z");

    expect(
      getGoalTargetCompletionDateError({
        targetCompletionDate,
        now,
        parentDeadline
      })
    ).toBe("Sub-goals cannot have a target completion date later than the parent goal.");
  });

  test("accepts valid standalone and parent-bounded target dates", () => {
    const now = dayjs("2026-06-25T12:00:00Z");

    expect(
      getGoalTargetCompletionDateError({
        targetCompletionDate: dayjs("2026-06-25T12:15:00Z"),
        now,
        parentDeadline: null
      })
    ).toBeNull();

    expect(
      getGoalTargetCompletionDateError({
        targetCompletionDate: dayjs("2026-06-26T12:00:00Z"),
        now,
        parentDeadline: dayjs("2026-06-26T12:00:00Z")
      })
    ).toBeNull();
  });

  test("allows keeping an existing overdue target date during edit, but rejects a newly changed past date", () => {
    const now = dayjs("2026-06-25T12:00:00Z");
    const originalTargetCompletionDate = dayjs("2026-06-24T09:00:00Z");

    expect(
      getGoalTargetCompletionDateError({
        targetCompletionDate: originalTargetCompletionDate,
        now,
        parentDeadline: null,
        originalTargetCompletionDate,
        allowUnchangedPastDate: true
      })
    ).toBeNull();

    expect(
      getGoalTargetCompletionDateError({
        targetCompletionDate: dayjs("2026-06-24T10:00:00Z"),
        now,
        parentDeadline: null,
        originalTargetCompletionDate,
        allowUnchangedPastDate: true
      })
    ).toBe("Target completion date cannot be earlier than the current time.");
  });

  test("uses the existing overdue date as the picker minimum during edit", () => {
    const now = dayjs("2026-06-25T12:00:00Z");
    const originalTargetCompletionDate = dayjs("2026-06-24T09:00:00Z");

    expect(
      getGoalTargetCompletionDateMinDateTime({
        now,
        originalTargetCompletionDate,
        allowUnchangedPastDate: true
      }).toISOString()
    ).toBe(originalTargetCompletionDate.toISOString());

    expect(
      getGoalTargetCompletionDateMinDateTime({
        now,
        originalTargetCompletionDate: dayjs("2026-06-26T09:00:00Z"),
        allowUnchangedPastDate: true
      }).toISOString()
    ).toBe(now.toISOString());
  });

  test("rejects invalid or negative estimate inputs", () => {
    expect(getGoalEstimateHoursError("0")).toBeNull();
    expect(getGoalEstimateHoursError("2.5")).toBeNull();
    expect(getGoalEstimateHoursError("-1")).toBe("Estimated hours must be 0 or greater.");
    expect(getGoalEstimateHoursError("not-a-number")).toBe("Estimated hours must be 0 or greater.");
  });

  test("parses estimate inputs into numbers or NaN", () => {
    expect(parseGoalEstimateHours("2.5")).toBe(2.5);
    expect(parseGoalEstimateHours("0")).toBe(0);
    expect(Number.isNaN(parseGoalEstimateHours("not-a-number"))).toBe(true);
  });
});
