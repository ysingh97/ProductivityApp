import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import RequireAuth from "./RequireAuth";
import { useAuth } from "../context/AuthContext";

jest.mock("../context/AuthContext", () => ({
  useAuth: jest.fn()
}));

const SignInProbe = () => {
  const location = useLocation();
  const fromPath = location.state?.from?.pathname || "none";

  return <div>Sign in from:{fromPath}</div>;
};

const renderRoutes = (initialPath = "/board") =>
  render(
    <MemoryRouter
      initialEntries={[initialPath]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route path="/" element={<SignInProbe />} />
        <Route element={<RequireAuth />}>
          <Route path="/board" element={<div>Board page</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );

describe("RequireAuth", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("redirects unauthenticated users to sign-in and preserves the original location", () => {
    useAuth.mockReturnValue({ isAuthed: false });

    renderRoutes("/board");

    expect(screen.getByText("Sign in from:/board")).toBeInTheDocument();
    expect(screen.queryByText("Board page")).not.toBeInTheDocument();
  });

  test("renders the protected route when the user is authenticated", () => {
    useAuth.mockReturnValue({ isAuthed: true });

    renderRoutes("/board");

    expect(screen.getByText("Board page")).toBeInTheDocument();
    expect(screen.queryByText(/sign in from/i)).not.toBeInTheDocument();
  });
});
