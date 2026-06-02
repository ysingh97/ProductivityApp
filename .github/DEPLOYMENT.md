# Deployment Plan

This project uses GitHub Actions for CI and Render deploy hooks for staging CD.

## Branch Model

- Feature branches open pull requests into `main`.
- Pull requests must pass the `CI` workflow before merge.
- Merges to `main` are eligible for staging deployment.
- Production deployment should be manual until the staging flow is proven stable.

## GitHub Environments

Configure these environments in GitHub repository settings:

- `staging`
- `production`

Recommended protection:

- `staging`: no required reviewers.
- `production`: require manual approval before deployment.

The `staging` environment requires these secrets:

- `STAGING_MONGO_URI`: staging-only MongoDB connection string used by the manual seed workflow.
- `RENDER_STAGING_FRONTEND_DEPLOY_HOOK`: Render deploy hook for the staging static site.
- `RENDER_STAGING_BACKEND_DEPLOY_HOOK`: Render deploy hook for the staging API service.
- `RENDER_STAGING_WORKER_DEPLOY_HOOK`: Render deploy hook for the staging Google Calendar worker.

The `staging` environment requires these variables:

- `STAGING_FRONTEND_URL`: `https://productivityhubstaging.onrender.com`
- `STAGING_API_BASE_URL`: `https://productivity-api-staging.onrender.com/api`

## Current CI Gates

The `CI` workflow runs:

- Backend tests from `app-server` with `npm test`.
- Backend source artifact upload for deploy-ready server files.
- Frontend production build from the repository root with `npm run build`.
- Frontend artifact upload for the generated `build` directory.

Run the local equivalent before pushing with:

```bash
npm run ci:local
```

Artifacts retained by CI:

- `backend-source`: backend application source, package files, scripts, services, and workers. It intentionally excludes `node_modules`, local `.env` files, tests, and test-data.
- `frontend-build`: compiled frontend static assets from the root `build` directory.

## Staging CD

The `Deploy Staging` workflow:

1. Runs automatically after the `CI` workflow succeeds on `main`.
2. Can also be triggered manually with `workflow_dispatch`.
3. Triggers Render deploy hooks for the staging API, Google Calendar worker, and static frontend.
4. Waits briefly for Render deployments to start.
5. Retries frontend and API health smoke checks while Render finishes deploying.

Render deploy hooks enqueue deployments asynchronously. This workflow verifies that staging is
healthy after deploy requests, but it does not poll Render's internal deployment status. Add
Render API polling later if the workflow needs to prove that each service deployed a specific
commit before reporting success.

## Render Configuration

Staging Render services must use the `main` branch with automatic deployments disabled. GitHub
Actions triggers deployments only after CI passes.

The staging API and worker must share the same staging-only `MONGO_URI` and
`GOOGLE_CALENDAR_TOKEN_SECRET`. The static frontend must use:

- `REACT_APP_API_URL=https://productivity-api-staging.onrender.com/api`
- `REACT_APP_GOOGLE_CLIENT_ID=<Google OAuth client ID>`

## Target Flow

1. Pull request runs CI only.
2. Merge to `main` runs CI, then deploys to `staging`.
3. The `Deploy Staging` workflow triggers Render staging deploy hooks and retries smoke checks.
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
