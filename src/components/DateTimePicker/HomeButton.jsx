import React from "react";
import Button from "@mui/material/Button";
import HomeIcon from "@mui/icons-material/Home";
import { Link } from "react-router-dom";

const HomeButton = () => {
  return (
    <Button
      variant="contained"
      color="primary"
      startIcon={<HomeIcon />}
      component={Link}
      to="/"
      sx={{
        borderRadius: "12px",
        paddingX: 3,
        paddingY: 1.2,
        textTransform: "none",
        fontSize: "1rem"
      }}
    >
      Home
    </Button>
  );
};

export default HomeButton;
