# Deployment Plan

This project currently has CI only. Deploy jobs should be added after the frontend and backend hosting providers are chosen.

## Branch Model

- Feature branches open pull requests into `main`.
- Pull requests must pass the `CI` workflow before merge.
- Merges to `main` are eligible for staging deployment.
- Production deployment should be manual until the staging flow is proven stable.

## GitHub Environments

Create these environments in GitHub repository settings:

- `staging`
- `production`

Recommended protection:

- `staging`: no required reviewers.
- `production`: require manual approval before deployment.

## Current CI Gates

The `CI` workflow runs:

- Backend tests from `app-server` with `npm test`.
- Frontend production build from the repository root with `npm run build`.
- Frontend artifact upload for the generated `build` directory.

## Required Decisions Before CD

Choose hosting providers for:

- Frontend static build.
- Backend Node/Express API.
- Background worker process for Google Calendar sync, if it should run separately from the API.

After providers are chosen, add provider-specific deploy jobs rather than generic placeholders.

## Expected Secrets

Common environment secrets:

- `REACT_APP_API_URL`
- `REACT_APP_GOOGLE_CLIENT_ID`
- `MONGO_URI`
- `GOOGLE_CLIENT_ID`
- `ALLOWED_ORIGINS`
- `STAGING_MONGO_URI`, used only by the manual staging seed workflow.

Provider-specific secrets will depend on the selected hosts, for example deploy tokens, project ids, service ids, or API keys.

## Target Flow

1. Pull request runs CI only.
2. Merge to `main` runs CI, then deploys to `staging`.
3. Staging smoke checks verify the frontend and API are reachable with `npm run smoke:deploy`.
4. Production deploy is triggered manually from GitHub Actions.
5. Production deploy requires the `production` environment approval gate.

## Smoke Checks

Use `npm run smoke:deploy` after a deployment. You can also run the `Smoke Check` GitHub Actions workflow manually and provide the deployed URLs as inputs.

Supported environment variables:

- `SMOKE_FRONTEND_URL`: frontend URL to verify.
- `SMOKE_API_BASE_URL`: API base URL ending in `/api`; the script checks `/health`.
- `SMOKE_API_HEALTH_URL`: explicit health endpoint URL, if the default is not correct.
- `SMOKE_TIMEOUT_MS`: optional request timeout. Defaults to `10000`.

## Staging Data

Do not seed production. Staging can use controlled seed scripts or a dedicated test account after the staging database is isolated from production.

Use the `Seed Staging Data` GitHub Actions workflow to manage staging visualization data:

- Choose `list-users` to inspect available staging accounts.
- Choose `seed-visualization-data` and provide an account email to seed historical visualization data.
- Type `SEED_STAGING` in the confirmation input before mutating staging data.
- Configure `STAGING_MONGO_URI` as a secret on the `staging` GitHub environment.
