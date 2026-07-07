import dayjs from "dayjs";
import {
  getTaskEstimateHoursError,
  getTaskTargetCompletionDateMinDateTime,
  getTaskTargetCompletionDateError,
  getTimeEntryDurationHours,
  getTimeEntryRangeError,
  parseTaskEstimateHours
} from "./taskValidation";

describe("taskValidation", () => {
  test("rejects target completion dates earlier than now", () => {
    const now = dayjs("2026-06-24T12:00:00Z");
    const targetCompletionDate = dayjs("2026-06-24T11:59:00Z");

    expect(
      getTaskTargetCompletionDateError({
        targetCompletionDate,
        now,
        parentDeadline: null
      })
    ).toBe("Target completion date cannot be earlier than the current time.");
  });

  test("rejects target completion dates after the parent deadline", () => {
    const now = dayjs("2026-06-24T12:00:00Z");
    const targetCompletionDate = dayjs("2026-06-26T12:00:00Z");
    const parentDeadline = dayjs("2026-06-25T12:00:00Z");

    expect(
      getTaskTargetCompletionDateError({
        targetCompletionDate,
        now,
        parentDeadline
      })
    ).toBe("Subtasks cannot have a target completion date later than the parent goal.");
  });

  test("accepts valid standalone and parent-bounded target dates", () => {
    const now = dayjs("2026-06-24T12:00:00Z");

    expect(
      getTaskTargetCompletionDateError({
        targetCompletionDate: dayjs("2026-06-24T12:15:00Z"),
        now,
        parentDeadline: null
      })
    ).toBeNull();

    expect(
      getTaskTargetCompletionDateError({
        targetCompletionDate: dayjs("2026-06-25T12:00:00Z"),
        now,
        parentDeadline: dayjs("2026-06-25T12:00:00Z")
      })
    ).toBeNull();
  });

  test("allows keeping an existing overdue target date during edit, but rejects a newly changed past date", () => {
    const now = dayjs("2026-06-24T12:00:00Z");
    const originalTargetCompletionDate = dayjs("2026-06-23T10:00:00Z");

    expect(
      getTaskTargetCompletionDateError({
        targetCompletionDate: originalTargetCompletionDate,
        now,
        parentDeadline: null,
        originalTargetCompletionDate,
        allowUnchangedPastDate: true
      })
    ).toBeNull();

    expect(
      getTaskTargetCompletionDateError({
        targetCompletionDate: dayjs("2026-06-23T11:00:00Z"),
        now,
        parentDeadline: null,
        originalTargetCompletionDate,
        allowUnchangedPastDate: true
      })
    ).toBe("Target completion date cannot be earlier than the current time.");
  });

  test("uses the existing overdue task date as the picker minimum during edit", () => {
    const now = dayjs("2026-06-24T12:00:00Z");
    const originalTargetCompletionDate = dayjs("2026-06-23T10:00:00Z");

    expect(
      getTaskTargetCompletionDateMinDateTime({
        now,
        originalTargetCompletionDate,
        allowUnchangedPastDate: true
      }).toISOString()
    ).toBe(originalTargetCompletionDate.toISOString());

    expect(
      getTaskTargetCompletionDateMinDateTime({
        now,
        originalTargetCompletionDate: dayjs("2026-06-25T10:00:00Z"),
        allowUnchangedPastDate: true
      }).toISOString()
    ).toBe(now.toISOString());
  });

  test("rejects invalid or negative estimate inputs", () => {
    expect(getTaskEstimateHoursError("")).toBeNull();
    expect(getTaskEstimateHoursError("2.5")).toBeNull();
    expect(getTaskEstimateHoursError("-1")).toBe("Estimated hours must be 0 or greater.");
    expect(getTaskEstimateHoursError("not-a-number")).toBe("Estimated hours must be 0 or greater.");
  });

  test("parses estimate inputs into numbers or NaN", () => {
    expect(parseTaskEstimateHours("2.5")).toBe(2.5);
    expect(parseTaskEstimateHours("0")).toBe(0);
    expect(Number.isNaN(parseTaskEstimateHours("not-a-number"))).toBe(true);
  });

  test("returns null preview duration for missing or invalid time-entry ranges", () => {
    const startedAt = dayjs("2026-06-24T10:00:00Z");
    const endedAt = dayjs("2026-06-24T09:00:00Z");

    expect(getTimeEntryDurationHours({ startedAt: null, endedAt })).toBeNull();
    expect(getTimeEntryDurationHours({ startedAt, endedAt })).toBeNull();
  });

  test("calculates preview duration for valid time-entry ranges", () => {
    const startedAt = dayjs("2026-06-24T10:00:00Z");
    const endedAt = dayjs("2026-06-24T11:30:00Z");

    expect(getTimeEntryDurationHours({ startedAt, endedAt })).toBe(1.5);
  });

  test("validates time-entry range requirements and future bounds", () => {
    const now = dayjs("2026-06-24T12:00:00Z");
    const startedAt = dayjs("2026-06-24T10:00:00Z");
    const endedAt = dayjs("2026-06-24T11:00:00Z");

    expect(getTimeEntryRangeError({ startedAt: null, endedAt, now })).toBe(
      "Select both a start and end time."
    );
    expect(
      getTimeEntryRangeError({
        startedAt: dayjs("invalid"),
        endedAt,
        now
      })
    ).toBe("Choose valid start and end times.");
    expect(
      getTimeEntryRangeError({
        startedAt,
        endedAt: dayjs("2026-06-24T09:00:00Z"),
        now
      })
    ).toBe("End time must be after start time.");
    expect(
      getTimeEntryRangeError({
        startedAt,
        endedAt: dayjs("2026-06-24T12:01:00Z"),
        now
      })
    ).toBe("End time cannot be in the future.");
    expect(getTimeEntryRangeError({ startedAt, endedAt, now })).toBeNull();
  });
});
