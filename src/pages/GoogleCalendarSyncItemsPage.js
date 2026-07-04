import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Paper,
  Stack,
  Typography
} from "@mui/material";
import { fetchGoals } from "../features/goals/goalService";
import { fetchTasks } from "../features/tasks/taskService";
import {
  buildGoogleCalendarSyncItemGroups,
  getGoogleCalendarItemReasonConfig
} from "../features/integrations/googleCalendarSyncItems";

const formatDateTime = (value) => {
  if (!value) return "No target date";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "No target date";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(parsed);
};

const GoogleCalendarSyncItemsPage = () => {
  const { reasonSlug } = useParams();
  const reason = getGoogleCalendarItemReasonConfig(reasonSlug);
  const [goals, setGoals] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!reason) {
      setLoading(false);
      return undefined;
    }

    let isActive = true;

    const loadItems = async () => {
      setLoading(true);
      setError("");
      try {
        const [goalData, taskData] = await Promise.all([fetchGoals(), fetchTasks()]);
        if (isActive) {
          setGoals(goalData);
          setTasks(taskData);
        }
      } catch (err) {
        console.error(err);
        if (isActive) {
          setError(
            err.response?.data?.message ||
              err.response?.data?.error ||
              "Unable to load Google Calendar sync item details."
          );
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    loadItems();
    return () => {
      isActive = false;
    };
  }, [reason]);

  const categoryGroups = useMemo(
    () =>
      buildGoogleCalendarSyncItemGroups({
        goals,
        tasks,
        reasonSlug
      }),
    [goals, reasonSlug, tasks]
  );

  const totalItems = categoryGroups.reduce((sum, group) => sum + group.itemCount, 0);

  return (
    <Container maxWidth="lg" sx={{ py: 4, textAlign: "left" }}>
      <Stack spacing={3}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          sx={{ justifyContent: "space-between", alignItems: { sm: "center" } }}
        >
          <Box>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              {reason?.title || "Google Calendar sync items"}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {reason?.description ||
                "Review the goals and tasks currently excluded from Google Calendar sync."}
            </Typography>
          </Box>
          <Button component={Link} to="/settings/google-calendar" variant="outlined">
            Back to Google Calendar settings
          </Button>
        </Stack>

        {!reason ? (
          <Alert severity="error">
            Unknown Google Calendar item filter. Return to settings and choose one of the
            available views.
          </Alert>
        ) : loading ? (
          <Paper
            variant="outlined"
            sx={{ p: 4, borderRadius: 4, display: "flex", justifyContent: "center" }}
          >
            <Stack spacing={1.5} sx={{ alignItems: "center" }}>
              <CircularProgress />
              <Typography variant="body2" color="text.secondary">
                Loading sync item details
              </Typography>
            </Stack>
          </Paper>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : (
          <>
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 4 }}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
                sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}
              >
                <Box>
                  <Typography variant="subtitle1" fontWeight={700}>
                    {totalItems} item{totalItems === 1 ? "" : "s"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Grouped by category first, then by goal tree or standalone task context.
                  </Typography>
                </Box>
                <Chip label={reason.countLabel} color="primary" variant="outlined" />
              </Stack>
            </Paper>

            {categoryGroups.length === 0 ? (
              <Paper variant="outlined" sx={{ p: 3, borderRadius: 4 }}>
                <Typography variant="body1">{reason.emptyState}</Typography>
              </Paper>
            ) : (
              <Stack spacing={3}>
                {categoryGroups.map((categoryGroup) => (
                  <Paper
                    key={categoryGroup.categoryLabel}
                    variant="outlined"
                    sx={{ p: 3, borderRadius: 4 }}
                  >
                    <Stack spacing={2.5}>
                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1}
                        sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}
                      >
                        <Box>
                          <Typography variant="h6" fontWeight={700}>
                            {categoryGroup.categoryLabel}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {categoryGroup.itemCount} matching item
                            {categoryGroup.itemCount === 1 ? "" : "s"}
                          </Typography>
                        </Box>
                      </Stack>

                      <Stack spacing={2}>
                        {categoryGroup.treeGroups.map((treeGroup) => (
                          <Paper
                            key={`${categoryGroup.categoryLabel}-${treeGroup.treeKey}`}
                            variant="outlined"
                            sx={{ p: 2, borderRadius: 3 }}
                          >
                            <Stack spacing={1.5}>
                              <Stack
                                direction={{ xs: "column", sm: "row" }}
                                spacing={1}
                                sx={{
                                  alignItems: { sm: "center" },
                                  justifyContent: "space-between"
                                }}
                              >
                                <Box>
                                  <Typography variant="subtitle1" fontWeight={700}>
                                    {treeGroup.treeTitle}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    {treeGroup.treeKind === "goalTree"
                                      ? "Goal tree"
                                      : "Standalone task group"}
                                  </Typography>
                                </Box>
                                <Chip
                                  label={`${treeGroup.itemCount} item${
                                    treeGroup.itemCount === 1 ? "" : "s"
                                  }`}
                                  size="small"
                                  variant="outlined"
                                />
                              </Stack>

                              <Stack spacing={1.1}>
                                {treeGroup.items.map((item) => (
                                  <Paper
                                    key={`${treeGroup.treeKey}-${item.itemType}-${item._id}`}
                                    component={Link}
                                    to={item.targetPath}
                                    variant="outlined"
                                    sx={{
                                      p: 1.5,
                                      pl: `${1.5 + item.hierarchyDepth * 1.1}rem`,
                                      borderRadius: 2.5,
                                      textDecoration: "none",
                                      color: "inherit",
                                      transition: "0.2s",
                                      "&:hover": {
                                        borderColor: "primary.main",
                                        backgroundColor: "action.hover"
                                      }
                                    }}
                                  >
                                    <Stack spacing={0.75}>
                                      <Stack
                                        direction={{ xs: "column", sm: "row" }}
                                        spacing={1}
                                        sx={{
                                          alignItems: { sm: "center" },
                                          justifyContent: "space-between"
                                        }}
                                      >
                                        <Box sx={{ minWidth: 0 }}>
                                          <Typography
                                            variant="body1"
                                            fontWeight={700}
                                            sx={{ overflowWrap: "anywhere" }}
                                          >
                                            {item.title}
                                          </Typography>
                                          <Typography
                                            variant="body2"
                                            color="text.secondary"
                                            sx={{ overflowWrap: "anywhere" }}
                                          >
                                            {item.hierarchyPathLabel}
                                          </Typography>
                                        </Box>
                                        <Stack
                                          direction="row"
                                          spacing={0.75}
                                          sx={{ flexWrap: "wrap" }}
                                        >
                                          <Chip
                                            label={item.itemType === "goal" ? "Goal" : "Task"}
                                            size="small"
                                            color={
                                              item.itemType === "goal" ? "primary" : "secondary"
                                            }
                                            variant="outlined"
                                          />
                                          <Chip
                                            label={
                                              reason.slug === "completed"
                                                ? "Complete"
                                                : "No target date"
                                            }
                                            size="small"
                                            color={
                                              reason.slug === "completed" ? "success" : "warning"
                                            }
                                            variant="outlined"
                                          />
                                        </Stack>
                                      </Stack>
                                      <Typography variant="caption" color="text.secondary">
                                        {reason.slug === "completed"
                                          ? `Target date at completion: ${formatDateTime(
                                              item.targetCompletionDate
                                            )}`
                                          : "Add a target date if this item should sync to Google Calendar."}
                                      </Typography>
                                    </Stack>
                                  </Paper>
                                ))}
                              </Stack>
                            </Stack>
                          </Paper>
                        ))}
                      </Stack>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            )}
          </>
        )}
      </Stack>
    </Container>
  );
};

export default GoogleCalendarSyncItemsPage;
