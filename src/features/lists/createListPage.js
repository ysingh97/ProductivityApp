import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Alert, Box, Button, Container, Paper, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ViewListOutlinedIcon from "@mui/icons-material/ViewListOutlined";
import ListForm from "./listForm";
import { createList } from "./listService";

const CreateListPage = () => {
  const [error, setError] = useState(null);
  const [createdList, setCreatedList] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleListSubmit = async (listData) => {
    setError(null);
    setCreatedList(null);
    setSubmitting(true);

    try {
      const response = await createList(listData);
      const savedList = response.data;
      setCreatedList(savedList);
      return savedList;
    } catch (err) {
      const message = err.response?.data?.message || err.message || "Failed to create list.";
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
              `linear-gradient(180deg, ${alpha(theme.palette.secondary.main, 0.12)}, ${alpha(
                theme.palette.background.paper,
                0.98
              )})`
          }}
        >
          <Stack spacing={2}>
            <Box>
              <Typography variant="overline" color="text.secondary" letterSpacing={1}>
                List workspace
              </Typography>
              <Typography variant="h4" fontWeight={700} sx={{ mt: 0.5 }}>
                Create list
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Create a collection first, then add or move tasks into it from task forms and list views.
            </Typography>
            <Button
              component={Link}
              to="/lists"
              variant="outlined"
              startIcon={<ViewListOutlinedIcon />}
            >
              View all lists
            </Button>
          </Stack>
        </Paper>

        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}
          {createdList && (
            <Alert
              severity="success"
              action={
                <Button
                  component={Link}
                  to={`/lists/${createdList._id}`}
                  color="inherit"
                  size="small"
                  endIcon={<ArrowForwardIcon />}
                >
                  Open
                </Button>
              }
            >
              Created "{createdList.title}".
            </Alert>
          )}
          <ListForm onSubmit={handleListSubmit} submitting={submitting} />
        </Stack>
      </Box>
    </Container>
  );
};

export default CreateListPage;
