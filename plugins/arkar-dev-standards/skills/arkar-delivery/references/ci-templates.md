# CI templates (GitHub Actions)

One file per project: `.github/workflows/ci.yml`. Runs on pushes and pull
requests; uses a throwaway service database inside CI with test
credentials only. Pin actions to major versions (as below) or to commit
SHAs for stricter supply-chain control. Adjust the version numbers to the
project (`.python-version`, `composer.json`, `pubspec.yaml`).

## Contents
1. FastAPI / Django (Python, uv)
2. Laravel (PHP + the starter kit's frontend)
3. Flutter
4. End-to-end journeys (projects with a UI)
5. Secret scan and dependency updates (all projects)

## 1. FastAPI / Django (Python, uv)

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:

permissions:
  contents: read

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      mysql:
        image: mysql:8.4
        env:
          MYSQL_ROOT_PASSWORD: root
          MYSQL_DATABASE: project_test
        ports: ["3306:3306"]
        options: >-
          --health-cmd="mysqladmin ping -proot" --health-interval=5s
          --health-timeout=5s --health-retries=20
    env:
      APP_ENV: test
      # FastAPI template:
      TEST_DATABASE_URL: mysql+pymysql://root:root@127.0.0.1:3306/project_test
      DATABASE_URL: mysql+pymysql://root:root@127.0.0.1:3306/project_test
      JWT_SECRET: ci-only-not-a-real-secret-0123456789
      # Django template:
      DJANGO_SECRET_KEY: ci-only-not-a-real-secret
      DB_NAME: project
      DB_USER: root
      DB_PASSWORD: root
      DB_HOST: 127.0.0.1
      TEST_DB_HOST: 127.0.0.1
      TEST_DB_NAME: project_test
      TEST_DB_PASSWORD: root
    steps:
      - uses: actions/checkout@v7
      - uses: astral-sh/setup-uv@v7
        with:
          enable-cache: true
      - run: uv sync --locked
      - run: uv run ruff format --check .
      - run: uv run ruff check .
      - run: uv run pytest -q --cov=app --cov-report=term-missing   # Django: --cov=apps
      - name: Dependency audit
        run: |
          uv export --format requirements-txt --no-hashes > /tmp/requirements.txt
          uvx --from 'pip-audit>=2.9,<3' pip-audit -r /tmp/requirements.txt
      - name: Code scan
        run: uvx --from 'bandit>=1.8,<2' bandit -q -r app -ll   # Django: apps config
      # Django only:
      # - run: DJANGO_DEBUG=false uv run python manage.py check --deploy --fail-level WARNING
      # - run: uv run python manage.py makemigrations --check --dry-run
```

`makemigrations --check` fails the build when a model change has no
migration. For Alembic, `alembic check` does the same.

## 2. Laravel (PHP + the starter kit's frontend)

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:

permissions:
  contents: read

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: shivammathur/setup-php@v2
        with:
          php-version: '8.4'
          coverage: pcov
      - uses: actions/setup-node@v7
        with:
          node-version: 22
          cache: npm
      - run: composer install --no-interaction --prefer-dist
      - run: npm ci
      - run: cp .env.example .env && php artisan key:generate
      - run: npm run build
      - run: vendor/bin/pint --test
      - run: vendor/bin/phpstan analyse --no-progress
      - run: npm run lint && npm run types        # the kit's frontend checks; adjust to package.json
      - run: php artisan test --coverage          # phpunit.xml points tests at in-memory SQLite
      - run: composer audit
      - run: npm audit --omit=dev --audit-level=high
```

The starter kit's `composer ci:check` can replace the separate Pint /
Larastan / frontend / test steps when the project keeps it. Tests use
`phpunit.xml`'s SQLite override (see `laravel.md`); for MySQL-specific
behaviour, add a `mysql:8.4` service like the Python template and set
`DB_*` for the test step.

## 3. Flutter

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:

permissions:
  contents: read

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: subosito/flutter-action@v2
        with:
          channel: stable
          cache: true
      - run: flutter pub get
      - run: dart run build_runner build -d
      - run: dart format --output=none --set-exit-if-changed lib test
      - run: flutter analyze
      - run: flutter test --coverage
```

Release builds (APK/AAB, IPA) and store uploads stay manual or in a
separate workflow AK triggers — signing keys never live in the repository.

## 4. End-to-end journeys (projects with a UI)

A separate job, so slow browser tests don't hold up every push: on `main`
and before a release, start the app inside CI against the CI test database,
seed invented data, and run the 3–5 journeys (`arkar-testing`).

```yaml
  e2e:
    if: github.ref == 'refs/heads/main'
    needs: test
    runs-on: ubuntu-latest
    # same `services:` and test-only `env:` as the test job
    steps:
      - uses: actions/checkout@v7
      # install and start the app with the test database, then:
      - run: npx playwright install --with-deps chromium
      - run: npx playwright test
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report
```

No `continue-on-error` and no retry-until-pass on any test step: a flaky
test is fixed, not hidden.

## 5. Secret scan and dependency updates (all projects)

Add a secret scan job:

```yaml
  secrets:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: astral-sh/setup-uv@v7
      - name: Secret scan (fails if anything looks like a secret)
        run: |
          uvx --from 'detect-secrets>=1.5,<2' detect-secrets scan --all-files \
            --exclude-files '(\.lock|package-lock\.json)$' > /tmp/secrets.json
          python3 -c "import json, sys; found = json.load(open('/tmp/secrets.json'))['results']; print(list(found)); sys.exit(1 if found else 0)"
```

`.github/dependabot.yml` — grouped weekly patch/minor updates:

```yaml
version: 2
updates:
  - package-ecosystem: "uv"          # or "composer", "npm", "pub"
    directory: "/"
    schedule:
      interval: "weekly"
    groups:
      minor-and-patch:
        update-types: ["minor", "patch"]
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "monthly"
```
