export const getGoogleCalendarNoDateWarningText = () =>
  "Optional. Without a target date, this item will not sync to Google Calendar.";

export const getGoogleCalendarDateRemovedToastText = (itemLabel) =>
  `${itemLabel} target date removed. Its Google Calendar event will also be removed.`;

export const wasTargetDateRemoved = ({
  previousTargetCompletionDate,
  nextTargetCompletionDate
}) => Boolean(previousTargetCompletionDate) && !nextTargetCompletionDate;

export const getGoogleCalendarSyncSummaryReasonLabel = (reason) => {
  switch (reason) {
    case "disconnected":
      return "Google Calendar not connected";
    case "calendarNotSelected":
      return "No destination calendar selected";
    case "syncPaused":
      return "Automatic sync paused";
    default:
      return "";
  }
};

export const getGoogleCalendarItemSyncState = ({ item, status, loading = false }) => {
  if (loading) {
    return {
      label: "Checking...",
      detail: "Loading Google Calendar sync status."
    };
  }

  if (!status?.connected) {
    return {
      label: "Not connected",
      detail: "Connect Google Calendar to sync dated items."
    };
  }

  if (!status.selectedCalendarId) {
    return {
      label: "Not syncing",
      detail: "Choose a destination calendar in Google Calendar settings."
    };
  }

  if (!status.syncEnabled) {
    return {
      label: "Not syncing",
      detail: "Automatic sync is paused in Google Calendar settings."
    };
  }

  if (item?.isComplete) {
    return {
      label: "Not syncing",
      detail: "Completed items are removed from Google Calendar."
    };
  }

  if (!item?.targetCompletionDate) {
    return {
      label: "Not syncing",
      detail: "Items without a target date do not sync to Google Calendar."
    };
  }

  return {
    label: "Sync active",
    detail: status.selectedCalendarSummary
      ? `Dated, incomplete items sync to ${status.selectedCalendarSummary}.`
      : "Dated, incomplete items sync to the selected Google Calendar."
  };
};
