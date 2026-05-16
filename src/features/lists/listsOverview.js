import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
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
import AddIcon from "@mui/icons-material/Add";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ViewListOutlinedIcon from "@mui/icons-material/ViewListOutlined";
import { fetchLists } from "./listService";

const formatCreatedDate = (value) => {
  if (!value) {
    return "Date unavailable";
  }

  const createdDate = new Date(value);
  if (Number.isNaN(createdDate.getTime())) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(createdDate);
};

const getTaskCount = (list) => {
  if (!Array.isArray(list.tasks)) {
    return 0;
  }
  return list.tasks.length;
};

const ListsOverview = () => {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadLists = async () => {
      setLoading(true);
      setError(null);
      try {
        const listResponse = await fetchLists();
        setLists(listResponse);
      } catch (err) {
        setError("Failed to load lists.");
        console.error(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadLists();
  }, []);

  const sortedLists = useMemo(
    () =>
      [...lists].sort((first, second) => {
        const firstCreated = new Date(first.createdAt || 0).getTime();
        const secondCreated = new Date(second.createdAt || 0).getTime();
        return secondCreated - firstCreated;
      }),
    [lists]
  );

  const totalTasks = useMemo(
    () => sortedLists.reduce((sum, list) => sum + getTaskCount(list), 0),
    [sortedLists]
  );

  return (
    <Container maxWidth="lg" sx={{ py: 4, textAlign: "left" }}>
      <Stack spacing={3}>
        <Paper
          variant="outlined"
          sx={{
            p: { xs: 2.5, md: 4 },
            borderRadius: 4,
            overflow: "hidden",
            position: "relative",
            background: (theme) =>
              `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.12)}, ${alpha(
                theme.palette.background.paper,
                0.98
              )} 48%, ${alpha(theme.palette.secondary.main, 0.1)})`
          }}
        >
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) auto" },
              gap: 2,
              alignItems: "center"
            }}
          >
            <Stack spacing={1}>
              <Typography variant="overline" color="text.secondary" letterSpacing={1}>
                List workspace
              </Typography>
              <Typography variant="h3">Lists</Typography>
              <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 680 }}>
                Review task collections, open an existing list, or create a new focused list.
              </Typography>
            </Stack>

            <Button
              component={Link}
              to="/lists/new"
              variant="contained"
              size="large"
              startIcon={<AddIcon />}
            >
              New list
            </Button>
          </Box>
        </Paper>

        {error && <Alert severity="error">{error}</Alert>}

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "260px minmax(0, 1fr)" },
            gap: 3,
            alignItems: "start"
          }}
        >
          <Paper
            variant="outlined"
            sx={{
              p: 3,
              borderRadius: 4,
              position: { md: "sticky" },
              top: { md: 96 }
            }}
          >
            <Stack spacing={2}>
              <Box>
                <Typography variant="overline" color="text.secondary" letterSpacing={1}>
                  Snapshot
                </Typography>
                <Typography variant="h5" sx={{ mt: 0.5 }}>
                  {sortedLists.length} lists
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Tasks in lists
                </Typography>
                <Typography variant="h4">{totalTasks}</Typography>
              </Box>
            </Stack>
          </Paper>

          <Stack spacing={2}>
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
                    Loading lists
                  </Typography>
                </Stack>
              </Paper>
            ) : sortedLists.length === 0 ? (
              <Paper
                variant="outlined"
                sx={{
                  p: { xs: 3, md: 4 },
                  borderRadius: 4,
                  textAlign: "center"
                }}
              >
                <Stack spacing={2} sx={{ alignItems: "center" }}>
                  <ViewListOutlinedIcon color="primary" fontSize="large" />
                  <Box>
                    <Typography variant="h5">No lists yet</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                      Create a list when you want a reusable collection of related tasks.
                    </Typography>
                  </Box>
                  <Button component={Link} to="/lists/new" variant="contained" startIcon={<AddIcon />}>
                    Create your first list
                  </Button>
                </Stack>
              </Paper>
            ) : (
              sortedLists.map((list) => (
                <Paper
                  key={list._id}
                  variant="outlined"
                  sx={{
                    p: { xs: 2.5, md: 3 },
                    borderRadius: 4,
                    transition: "transform 160ms ease, border-color 160ms ease",
                    "&:hover": {
                      transform: "translateY(-2px)",
                      borderColor: "primary.main"
                    }
                  }}
                >
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: { xs: "1fr", sm: "minmax(0, 1fr) auto" },
                      gap: 2,
                      alignItems: "center"
                    }}
                  >
                    <Stack spacing={1}>
                      <Typography variant="h5">{list.title}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {list.description || "No description yet."}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {getTaskCount(list)} tasks - Created {formatCreatedDate(list.createdAt)}
                      </Typography>
                    </Stack>

                    <Button
                      component={Link}
                      to={`/lists/${list._id}`}
                      variant="outlined"
                      endIcon={<ArrowForwardIcon />}
                    >
                      Open list
                    </Button>
                  </Box>
                </Paper>
              ))
            )}
          </Stack>
        </Box>
      </Stack>
    </Container>
  );
};

export default ListsOverview;
