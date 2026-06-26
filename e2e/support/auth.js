const TEST_AUTH_TOKEN = "test:basic";
const TEST_AUTH_USER = {
  id: "user-1",
  googleId: "test-basic",
  email: "viz-basic@example.test",
  name: "Viz Basic",
  picture: ""
};

const seedTestAuth = async (page, options = {}) => {
  const token = options.token || TEST_AUTH_TOKEN;
  const user = options.user || TEST_AUTH_USER;
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
  seedTestAuth
};
