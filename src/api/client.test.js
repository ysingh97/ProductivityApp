var requestInterceptor;
var responseErrorInterceptor;

jest.mock("axios", () => ({
  __esModule: true,
  default: {
    create: jest.fn(() => ({
      interceptors: {
        request: {
          use: jest.fn((handler) => {
            requestInterceptor = handler;
          })
        },
        response: {
          use: jest.fn((_successHandler, errorHandler) => {
            responseErrorInterceptor = errorHandler;
          })
        }
      }
    }))
  }
}));

import apiClient from "./client";

describe("apiClient interceptors", () => {
  const originalLocation = window.location;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.assign.mockClear();
  });

  beforeAll(() => {
    delete window.location;
    window.location = {
      ...originalLocation,
      pathname: "/",
      assign: jest.fn()
    };
  });

  afterAll(() => {
    window.location = originalLocation;
  });

  test("registers request and response interceptors on the shared client", () => {
    expect(apiClient).toBeDefined();
    expect(typeof requestInterceptor).toBe("function");
    expect(typeof responseErrorInterceptor).toBe("function");
  });

  test("adds the bearer token to outgoing requests when auth is present", () => {
    localStorage.setItem("authToken", "test:basic");

    const config = requestInterceptor({ headers: {} });

    expect(config.headers.Authorization).toBe("Bearer test:basic");
  });

  test("leaves outgoing requests untouched when no auth token exists", () => {
    const config = { headers: {} };

    expect(requestInterceptor(config)).toBe(config);
    expect(config.headers.Authorization).toBeUndefined();
  });

  test("clears auth state and redirects to sign-in on 401 responses away from root", async () => {
    localStorage.setItem("authToken", "expired-token");
    localStorage.setItem("authUser", JSON.stringify({ email: "user@example.com" }));
    window.location.pathname = "/board";

    await expect(
      responseErrorInterceptor({ response: { status: 401 } })
    ).rejects.toEqual({ response: { status: 401 } });

    expect(localStorage.getItem("authToken")).toBeNull();
    expect(localStorage.getItem("authUser")).toBeNull();
    expect(sessionStorage.getItem("authExpired")).toBe("1");
    expect(window.location.assign).toHaveBeenCalledWith("/");
  });

  test("clears auth state without redirecting when already on sign-in", async () => {
    localStorage.setItem("authToken", "expired-token");
    localStorage.setItem("authUser", JSON.stringify({ email: "user@example.com" }));
    window.location.pathname = "/";

    await expect(
      responseErrorInterceptor({ response: { status: 401 } })
    ).rejects.toEqual({ response: { status: 401 } });

    expect(localStorage.getItem("authToken")).toBeNull();
    expect(localStorage.getItem("authUser")).toBeNull();
    expect(sessionStorage.getItem("authExpired")).toBe("1");
    expect(window.location.assign).not.toHaveBeenCalled();
  });

  test("does not clear auth state for non-401 failures", async () => {
    localStorage.setItem("authToken", "active-token");
    localStorage.setItem("authUser", JSON.stringify({ email: "user@example.com" }));
    window.location.pathname = "/board";

    await expect(
      responseErrorInterceptor({ response: { status: 500 } })
    ).rejects.toEqual({ response: { status: 500 } });

    expect(localStorage.getItem("authToken")).toBe("active-token");
    expect(localStorage.getItem("authUser")).toBe(JSON.stringify({ email: "user@example.com" }));
    expect(sessionStorage.getItem("authExpired")).toBeNull();
    expect(window.location.assign).not.toHaveBeenCalled();
  });
});
