const TEST_AUTH_USERS = {
  empty: {
    id: "user-empty",
    googleId: "test-empty",
    email: "viz-empty@example.test",
    name: "Viz Empty",
    picture: ""
  },
  basic: {
    id: "user-1",
    googleId: "test-basic",
    email: "viz-basic@example.test",
    name: "Viz Basic",
    picture: ""
  },
  power: {
    id: "user-power",
    googleId: "test-power",
    email: "viz-power@example.test",
    name: "Viz Power",
    picture: ""
  },
  edge: {
    id: "user-edge",
    googleId: "test-edge",
    email: "viz-edge@example.test",
    name: "Viz Edge",
    picture: ""
  }
};

const TEST_AUTH_TOKEN = "test:basic";
const TEST_AUTH_USER = TEST_AUTH_USERS.basic;

const sanitizeTestSessionKey = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const formatSessionName = (sessionKey) =>
  sessionKey
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "Session";

const createTestAuthSession = (sessionKey) => {
  const normalizedKey = sanitizeTestSessionKey(sessionKey);
  const safeKey = normalizedKey || "session";
  const googleId = `test-session-${safeKey}`;

  return {
    token: `test:session:${safeKey}`,
    user: {
      id: googleId,
      googleId,
      email: `viz-${safeKey}@example.test`,
      name: `Viz ${formatSessionName(safeKey)}`,
      picture: ""
    }
  };
};

const getTestAuthToken = (persona = "basic") => `test:${persona}`;
const getTestAuthUser = (persona = "basic") => TEST_AUTH_USERS[persona] || TEST_AUTH_USER;

const seedTestAuth = async (page, options = {}) => {
  const session = options.session ? createTestAuthSession(options.session) : null;
  const persona = options.persona || null;
  const token =
    options.token ||
    session?.token ||
    (persona ? getTestAuthToken(persona) : TEST_AUTH_TOKEN);
  const user =
    options.user ||
    session?.user ||
    (persona ? getTestAuthUser(persona) : TEST_AUTH_USER);
  const shouldSetColorMode = Object.prototype.hasOwnProperty.call(options, "colorMode");
  const colorMode = shouldSetColorMode ? options.colorMode : null;

  await page.addInitScript(
    ({ nextToken, nextUser, nextColorMode, nextShouldSetColorMode }) => {
      window.localStorage.setItem("authToken", nextToken);
      window.localStorage.setItem("authUser", JSON.stringify(nextUser));

      if (nextShouldSetColorMode) {
        if (nextColorMode) {
          window.localStorage.setItem("colorMode", nextColorMode);
        } else {
          window.localStorage.removeItem("colorMode");
        }
      }
    },
    {
      nextToken: token,
      nextUser: user,
      nextColorMode: colorMode,
      nextShouldSetColorMode: shouldSetColorMode
    }
  );
};

module.exports = {
  TEST_AUTH_TOKEN,
  TEST_AUTH_USER,
  TEST_AUTH_USERS,
  createTestAuthSession,
  getTestAuthToken,
  getTestAuthUser,
  sanitizeTestSessionKey,
  seedTestAuth
};
