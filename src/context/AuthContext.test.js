import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "./AuthContext";

const buildJwt = (payload) => {
  const encodedPayload = btoa(JSON.stringify(payload))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

  return `header.${encodedPayload}.signature`;
};

const AuthProbe = () => {
  const { token, user, saveAuth, logout, isAuthed } = useAuth();

  return (
    <div>
      <div>token:{token || "none"}</div>
      <div>user:{user?.name || "none"}</div>
      <div>authed:{String(isAuthed)}</div>
      <button onClick={() => saveAuth("test:basic", { name: "Saved User" })}>Save auth</button>
      <button onClick={logout}>Logout</button>
    </div>
  );
};

const renderAuthProvider = () =>
  render(
    <AuthProvider>
      <AuthProbe />
    </AuthProvider>
  );

describe("AuthProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  test("hydrates a valid stored session on first render", () => {
    localStorage.setItem("authToken", "test:basic");
    localStorage.setItem("authUser", JSON.stringify({ name: "Stored User" }));

    renderAuthProvider();

    expect(screen.getByText("token:test:basic")).toBeInTheDocument();
    expect(screen.getByText("user:Stored User")).toBeInTheDocument();
    expect(screen.getByText("authed:true")).toBeInTheDocument();
  });

  test("clears expired stored sessions and marks the auth-expired flag", async () => {
    const expiredToken = buildJwt({
      exp: Math.floor(Date.now() / 1000) - 60
    });

    localStorage.setItem("authToken", expiredToken);
    localStorage.setItem("authUser", JSON.stringify({ name: "Expired User" }));

    renderAuthProvider();

    expect(screen.getByText("token:none")).toBeInTheDocument();
    expect(screen.getByText("user:none")).toBeInTheDocument();
    expect(screen.getByText("authed:false")).toBeInTheDocument();

    await waitFor(() => expect(localStorage.getItem("authToken")).toBeNull());
    expect(localStorage.getItem("authUser")).toBeNull();
    expect(sessionStorage.getItem("authExpired")).toBe("1");
  });

  test("saveAuth and logout keep storage in sync with provider state", async () => {
    renderAuthProvider();

    fireEvent.click(screen.getByRole("button", { name: /save auth/i }));

    await waitFor(() => expect(screen.getByText("token:test:basic")).toBeInTheDocument());
    expect(screen.getByText("user:Saved User")).toBeInTheDocument();
    expect(localStorage.getItem("authToken")).toBe("test:basic");
    expect(localStorage.getItem("authUser")).toBe(JSON.stringify({ name: "Saved User" }));

    fireEvent.click(screen.getByRole("button", { name: /logout/i }));

    await waitFor(() => expect(screen.getByText("token:none")).toBeInTheDocument());
    expect(screen.getByText("user:none")).toBeInTheDocument();
    expect(localStorage.getItem("authToken")).toBeNull();
    expect(localStorage.getItem("authUser")).toBeNull();
  });
});
