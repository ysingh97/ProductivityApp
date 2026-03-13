import React, { useEffect, useState } from "react";
import { Alert, Box, CircularProgress, Container, Paper, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useParams } from "react-router-dom";
import GoalForm from "./goalForm";
import { createGoal, fetchGoalById, updateGoal } from "./goalService";

const CreateGoalPage = () => {
    const [goals, setGoals] = useState([]);
    const [error, setError] = useState(null);
    const { goalId } = useParams();
    const [goal, setGoal] = useState(null);
    const [loading, setLoading] = useState(false);
    const isEditing = Boolean(goalId);

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
    
        try {
          if (isEditing && goal) {
            const updatedGoal = await updateGoal(goal._id, goalData);
            setGoals((prevGoals) =>
              prevGoals.map((g) => (g._id === updatedGoal._id ? updatedGoal : g))
            );
          } else {
            const newGoal = await createGoal(goalData);
            setGoals((prevGoals) => [...prevGoals, newGoal]);
          }
        } catch (err) {
          setError(err.message);
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
              </Stack>
            </Paper>

            <Stack spacing={2}>
              {error && <Alert severity="error">{error}</Alert>}
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
                <GoalForm goal={goal} isEditing={isEditing} onSubmit={handleGoalSubmit} />
              )}
            </Stack>
          </Box>
        </Container>
    );
};

export default CreateGoalPage;
