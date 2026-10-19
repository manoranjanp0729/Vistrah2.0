# Homepage API activation (revision 013)

This is an **opt-in** deployment override. It does not add the homepage routes to older branches or deploy anything by itself.

The working homepage implementation already exists in commit `2c1d80f` (files: `backend/app/homepage_routes.py`, `backend/app/homepage_models.py`, `backend/migrations/versions/013_homepage_configuration.py`). The live API image predates it, while the database is at revision `012`.

## Correct the test connection string

The backend pins **psycopg 3**, not psycopg2. Use:

```text
postgresql+psycopg://vistrah_test:<password>@vistrah-homepage-db-test:5432/vistrah_test
```

Do not install psycopg2 or change the existing requirements to fix the earlier test error. The restored disposable PostgreSQL test database remains at `012` until `alembic upgrade 013` is run on **that test DB**.

## Activation after a database backup and release decision

1. Use a checkout containing the homepage files and migration `013`. Do not accidentally package uncommitted V-Ads work.
2. Run `python -m alembic upgrade 013` once with `DATABASE_URL` pointing at the intended database. **Never use `upgrade head` here**: later migrations exist.
3. Run the API with `compose.homepage.yaml` as an additional Compose file, or use the equivalent command override, and ensure the running `api` image is the compatible homepage build. For example:

   ```powershell
   docker compose -p vistrah20 -f compose.yaml -f compose.homepage.yaml up -d --no-deps api
   ```

   This command is **not** a one-click complete deployment: it assumes the right image and database revision are already in place. Depending on how the API image was built, Compose could otherwise reuse an old image.
4. Check `GET /api/homepage` through the website proxy (or `GET /homepage` directly on the API). An unpublished homepage correctly returns `{"version":null,"layout":{"schema_version":1,"sections":[]}}`.

Do not point test commands at the live database. The test network and test container use `vistrah-homepage-test-net` and `vistrah-homepage-db-test` and should be cleaned up when no longer needed.
