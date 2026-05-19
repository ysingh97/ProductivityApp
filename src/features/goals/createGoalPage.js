import React, { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Paper,
  Stack,
  Typography
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import GoalForm from "./goalForm";
import { createGoal, fetchGoalById, updateGoal } from "./goalService";

const CreateGoalPage = () => {
    const [error, setError] = useState(null);
    const [savedGoal, setSavedGoal] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const location = useLocation();
    const { goalId } = useParams();
    const [goal, setGoal] = useState(null);
    const [loading, setLoading] = useState(false);
    const isEditing = Boolean(goalId);
    const parentGoal = !isEditing ? location.state?.parentGoal || null : null;
    const sourceLink = isEditing && goal?._id
      ? { to: `/goals/${goal._id}`, label: "Back to goal" }
      : parentGoal?._id
        ? { to: `/goals/${parentGoal._id}`, label: "Back to parent goal" }
        : null;

    useEffect(() => {
        if (!isEditing) {
            setGoal(null);
            return;
        }

        setLoading(true);
        const loadGoal = async () => {
            try {
                const goalData = await fetchGoalById(goalId);
                setGoal(goalData);
            } catch (err) {
                setError('Failed to load goal');
                console.error(err.message);
            } finally {
                setLoading(false);
            }
        };
        loadGoal();
    }, [goalId, isEditing]);

    const handleGoalSubmit = async (goalData) => {
      setError(null);
      setSavedGoal(null);
      setSubmitting(true);

      try {
        const nextGoal = isEditing && goal
          ? await updateGoal(goal._id, goalData)
          : await createGoal(goalData);

        if (isEditing) {
          setGoal(nextGoal);
        }
        setSavedGoal(nextGoal);
        return nextGoal;
      } catch (err) {
        const message = err.response?.data?.message || err.message || "Failed to save goal.";
        setError(message);
        throw new Error(message);
      } finally {
        setSubmitting(false);
      }
    };


    return (
        <Container maxWidth="lg" sx={{ py: 4, textAlign: "left" }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", lg: "320px minmax(0, 1fr)" },
              gap: 3,
              alignItems: "start"
            }}
          >
            <Paper
              variant="outlined"
              sx={{
                p: 3,
                borderRadius: 4,
                position: { lg: "sticky" },
                top: { lg: 96 },
                background: (theme) =>
                  `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.1)}, ${alpha(
                    theme.palette.background.paper,
                    0.98
                  )})`
              }}
            >
              <Stack spacing={2}>
                <Box>
                  <Typography variant="overline" color="text.secondary" letterSpacing={1}>
                    Goal workspace
                  </Typography>
                  <Typography variant="h4" fontWeight={700} sx={{ mt: 0.5 }}>
                    {isEditing ? "Update goal" : "Create goal"}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Set the core details here, then expand the hierarchy and tracking from the goal view.
                </Typography>
                {sourceLink && (
                  <Button
                    component={Link}
                    to={sourceLink.to}
                    variant="outlined"
                    startIcon={<ArrowBackIcon />}
                  >
                    {sourceLink.label}
                  </Button>
                )}
              </Stack>
            </Paper>

            <Stack spacing={2}>
              {error && <Alert severity="error">{error}</Alert>}
              {savedGoal && (
                <Alert
                  severity="success"
                  action={
                    <Button
                      component={Link}
                      to={`/goals/${savedGoal._id}`}
                      color="inherit"
                      size="small"
                      endIcon={<ArrowForwardIcon />}
                    >
                      Open
                    </Button>
                  }
                >
                  {isEditing ? "Updated" : "Created"} "{savedGoal.title}".
                </Alert>
              )}
              {loading ? (
                <Paper
                  variant="outlined"
                  sx={{
                    p: 4,
                    borderRadius: 4,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  <Stack spacing={1.5} sx={{ alignItems: "center" }}>
                    <CircularProgress />
                    <Typography variant="body2" color="text.secondary">
                      Loading goal details
                    </Typography>
                  </Stack>
                </Paper>
              ) : (
                <GoalForm
                  goal={goal}
                  isEditing={isEditing}
                  onSubmit={handleGoalSubmit}
                  submitting={submitting}
                />
              )}
            </Stack>
          </Box>
        </Container>
    );
};

export default CreateGoalPage;
