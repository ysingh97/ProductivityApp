const DEFAULT_TIMEOUT_MS = 10000;

const trimTrailingSlash = (value) => value.replace(/\/+$/, "");

const getTimeoutMs = () => {
  const parsed = Number(process.env.SMOKE_TIMEOUT_MS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS;
};

const buildApiHealthUrl = () => {
  if (process.env.SMOKE_API_HEALTH_URL) {
    return process.env.SMOKE_API_HEALTH_URL;
  }

  if (process.env.SMOKE_API_BASE_URL) {
    return `${trimTrailingSlash(process.env.SMOKE_API_BASE_URL)}/health`;
  }

  return "";
};

const fetchWithTimeout = async (url, timeoutMs) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

const checkUrl = async ({ name, url, validate }, timeoutMs) => {
  process.stdout.write(`Checking ${name}: ${url}\n`);
  const response = await fetchWithTimeout(url, timeoutMs);

  if (!response.ok) {
    throw new Error(`${name} returned HTTP ${response.status}`);
  }

  if (validate) {
    await validate(response);
  }
};

const main = async () => {
  const timeoutMs = getTimeoutMs();
  const checks = [
    process.env.SMOKE_FRONTEND_URL
      ? {
          name: "frontend",
          url: process.env.SMOKE_FRONTEND_URL
        }
      : null,
    buildApiHealthUrl()
      ? {
          name: "API health",
          url: buildApiHealthUrl(),
          validate: async (response) => {
            const body = await response.json();
            if (body.status !== "ok") {
              throw new Error(`API health returned unexpected body: ${JSON.stringify(body)}`);
            }
          }
        }
      : null
  ].filter(Boolean);

  if (checks.length === 0) {
    throw new Error(
      "Set SMOKE_FRONTEND_URL, SMOKE_API_BASE_URL, or SMOKE_API_HEALTH_URL before running smoke checks."
    );
  }

  for (const check of checks) {
    await checkUrl(check, timeoutMs);
  }

  process.stdout.write("Smoke checks passed.\n");
};

main().catch((error) => {
  process.stderr.write(`Smoke checks failed: ${error.message}\n`);
  process.exit(1);
});
