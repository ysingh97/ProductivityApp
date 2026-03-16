import React, { useMemo, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  AppBar,
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Toolbar,
  Typography
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import FlagOutlinedIcon from "@mui/icons-material/FlagOutlined";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import Brightness4OutlinedIcon from "@mui/icons-material/Brightness4Outlined";
import Brightness7OutlinedIcon from "@mui/icons-material/Brightness7Outlined";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { useAuth } from "../context/AuthContext";

const drawerWidth = 280;

const AppShell = ({ colorMode, onToggleColorMode }) => {
  const [open, setOpen] = useState(false);
  const [accountAnchorEl, setAccountAnchorEl] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const navItems = useMemo(
    () => [
      {
        label: "In-depth goals view",
        to: "/goals/overview",
        description: "Deep goal timelines and milestones",
        icon: <FlagOutlinedIcon />
      },
      {
        label: "Calendar",
        to: "/calendar",
        description: "Week and month deadline view",
        icon: <CalendarMonthOutlinedIcon />
      },
      {
        label: "Data visualizations",
        to: "/visualizations",
        description: "Time spent and progress charts",
        icon: <InsightsOutlinedIcon />
      }
    ],
    []
  );

  const quickActions = useMemo(
    () => [
      { label: "New Task", to: "/task/new", variant: "contained" },
      { label: "New Goal", to: "/goal/new", variant: "contained" },
      { label: "New List", to: "/createListPage", variant: "outlined" }
    ],
    []
  );

  const handleToggle = (nextOpen) => () => {
    setOpen(nextOpen);
  };

  const handleOpenAccountMenu = (event) => {
    setAccountAnchorEl(event.currentTarget);
  };

  const handleCloseAccountMenu = () => {
    setAccountAnchorEl(null);
  };

  const handleSignOut = () => {
    handleCloseAccountMenu();
    logout();
    navigate("/", { replace: true });
  };

  const isActiveRoute = (path) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);
  const isAccountMenuOpen = Boolean(accountAnchorEl);

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "background.default" }}>
      <AppBar
        position="sticky"
        color="default"
        elevation={0}
        sx={{
          borderBottom: "1px solid",
          borderColor: "divider",
          backgroundColor: "background.paper"
        }}
      >
        <Toolbar
          sx={{
            gap: 1.25,
            minHeight: 74,
            display: "flex",
            alignItems: "center"
          }}
        >
          <IconButton
            edge="start"
            onClick={handleToggle(true)}
            aria-label="Open navigation menu"
          >
            <MenuIcon />
          </IconButton>
          <Typography
            variant="subtitle1"
            fontWeight={700}
            component={Link}
            to="/board"
            sx={{
              fontFamily: '"Fraunces", serif',
              letterSpacing: 0.4,
              textDecoration: "none",
              color: "inherit"
            }}
          >
            Productivity Hub
          </Typography>
          <Box sx={{ flexGrow: 1 }} />

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: 1,
              minWidth: 0,
              flexShrink: 1
            }}
          >
            <Stack
              direction="row"
              spacing={1}
              sx={{
                alignItems: "center",
                minWidth: 0,
                overflowX: "auto",
                scrollbarWidth: "none",
                "&::-webkit-scrollbar": { display: "none" }
              }}
            >
              {quickActions.map((action) => (
                <Button
                  key={action.to}
                  component={Link}
                  to={action.to}
                  variant={action.variant}
                  size="small"
                  sx={{ flexShrink: 0 }}
                >
                  {action.label}
                </Button>
              ))}
            </Stack>

            {user?.email && (
              <Button
                color="inherit"
                size="small"
                onClick={handleOpenAccountMenu}
                endIcon={<KeyboardArrowDownIcon />}
                sx={{
                  maxWidth: 220,
                  px: 1.25,
                  borderRadius: 999,
                  border: "1px solid",
                  borderColor: "divider",
                  flexShrink: 0
                }}
              >
                <Typography
                  component="span"
                  variant="body2"
                  sx={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap"
                  }}
                >
                  {user.email}
                </Typography>
              </Button>
            )}

            <IconButton
              edge="end"
              onClick={onToggleColorMode}
              aria-label={`Switch to ${colorMode === "light" ? "dark" : "light"} mode`}
              sx={{ flexShrink: 0 }}
            >
              {colorMode === "light" ? (
                <Brightness4OutlinedIcon />
              ) : (
                <Brightness7OutlinedIcon />
              )}
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <Menu
        anchorEl={accountAnchorEl}
        open={isAccountMenuOpen}
        onClose={handleCloseAccountMenu}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{
          sx: {
            mt: 1,
            minWidth: 220,
            borderRadius: 3
          }
        }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="caption" color="text.secondary">
            Signed in as
          </Typography>
          <Typography variant="body2" fontWeight={600} noWrap>
            {user?.email}
          </Typography>
        </Box>
        <Divider />
        <MenuItem
          component={Link}
          to="/settings/google-calendar"
          onClick={handleCloseAccountMenu}
        >
          Google Calendar
        </MenuItem>
        <MenuItem onClick={handleSignOut}>Sign out</MenuItem>
      </Menu>

      <Drawer anchor="left" open={open} onClose={handleToggle(false)}>
        <Box
          role="presentation"
          sx={{
            width: { xs: 260, sm: drawerWidth },
            p: 2,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            textAlign: "left"
          }}
        >
          <Typography variant="overline" color="text.secondary" letterSpacing={1}>
            Explore
          </Typography>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
            Goals and insights
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Jump into deeper views for goals and time spent.
          </Typography>
          <Divider sx={{ mb: 1 }} />

          <List sx={{ flex: 1 }}>
            {navItems.map((item) => (
              <ListItemButton
                key={item.to}
                component={Link}
                to={item.to}
                onClick={handleToggle(false)}
                selected={isActiveRoute(item.to)}
                sx={{ borderRadius: 2, mb: 0.5 }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
                <ListItemText
                  primary={item.label}
                  secondary={item.description}
                  primaryTypographyProps={{ fontWeight: 600 }}
                  secondaryTypographyProps={{ variant: "caption" }}
                />
              </ListItemButton>
            ))}
          </List>

          <Divider sx={{ my: 1, mt: "auto" }} />
          <List>
            <ListItemButton
              component={Link}
              to="/board"
              onClick={handleToggle(false)}
              selected={isActiveRoute("/board")}
              sx={{ borderRadius: 2 }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <HomeOutlinedIcon />
              </ListItemIcon>
              <ListItemText
                primary="Dashboard"
                secondary="Back to your taskboard"
                primaryTypographyProps={{ fontWeight: 600 }}
                secondaryTypographyProps={{ variant: "caption" }}
              />
            </ListItemButton>
          </List>
        </Box>
      </Drawer>

      <Box component="main" sx={{ pb: 4 }}>
        <Outlet />
      </Box>
    </Box>
  );
};

export default AppShell;
