import React, { useMemo, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import {
  AppBar,
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import FlagOutlinedIcon from "@mui/icons-material/FlagOutlined";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";

const drawerWidth = 280;

const AppShell = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();

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

  const handleToggle = (nextOpen) => () => {
    setOpen(nextOpen);
  };

  const isActiveRoute = (path) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);

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
        <Toolbar sx={{ gap: 1 }}>
          <IconButton
            edge="start"
            onClick={handleToggle(true)}
            aria-label="Open navigation menu"
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="subtitle1" fontWeight={700}>
            Productivity Hub
          </Typography>
        </Toolbar>
      </AppBar>

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

          <Divider sx={{ my: 1 }} />
          <Typography variant="caption" color="text.secondary">
            More insights are coming soon.
          </Typography>
        </Box>
      </Drawer>

      <Box component="main" sx={{ pb: 4 }}>
        <Outlet />
      </Box>
    </Box>
  );
};

export default AppShell;
