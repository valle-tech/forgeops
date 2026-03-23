import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

function testStepsBlock(v) {
  if (v.language === 'go') {
    return `      - uses: actions/setup-go@v5
        with:
          go-version: '1.22'
      - name: Test and compile
        run: |
          go test ./...
          go build -o bin/server ./cmd/server`;
  }
  if (v.language === 'python') {
    return `      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - name: Install and test
        run: |
          pip install -r requirements.txt ruff
          ruff check . || true
          pytest tests/ -q`;
  }
  return `      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Install, build, test
        run: |
          npm install
          npm run build
          npm test
          npm run test:e2e`;
}

export async function writeGitHubCI(dest, v) {
  const wfDir = path.join(dest, '.github', 'workflows');
  await mkdir(wfDir, { recursive: true });

  const tests = testStepsBlock(v);

  const content = `name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  workflow_dispatch:
    inputs:
      environment:
        description: Deploy target (manual jobs only)
        required: false
        default: dev
        type: choice
        options:
          - dev
          - staging
          - prod

permissions:
  contents: read
  packages: write

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

${tests}

  docker:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to GitHub Container Registry
        if: github.event_name == 'push' && github.ref == 'refs/heads/main'
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: \${{ github.actor }}
          password: \${{ secrets.GITHUB_TOKEN }}

      - name: Image name (lowercase for GHCR)
        run: |
          echo "IMAGE_LC=ghcr.io/$(echo "$GITHUB_REPOSITORY" | tr '[:upper:]' '[:lower:]')" >> $GITHUB_ENV

      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: \${{ github.event_name == 'push' && github.ref == 'refs/heads/main' }}
          tags: \${{ env.IMAGE_LC }}:latest

  # Placeholders — wire secrets + your deploy tool (kubectl, Pulumi, etc.)
  deploy-dev:
    needs: docker
    if: github.event_name == 'workflow_dispatch' && github.event.inputs.environment == 'dev'
    runs-on: ubuntu-latest
    environment: development
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to dev
        run: echo "Replace with deploy to dev (e.g. Pulumi up, kubectl apply)"

  deploy-staging:
    needs: docker
    if: github.event_name == 'workflow_dispatch' && github.event.inputs.environment == 'staging'
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to staging
        run: echo "Replace with deploy to staging"

  deploy-prod:
    needs: docker
    if: github.event_name == 'workflow_dispatch' && github.event.inputs.environment == 'prod'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to production
        run: echo "Replace with deploy to production (manual approval recommended)"
`;
  await writeFile(path.join(wfDir, 'ci.yml'), content, 'utf8');
}

export async function writeGitLabCI(dest, v) {
  const img =
    v.language === 'go'
      ? 'golang:1.22'
      : v.language === 'python'
        ? 'python:3.12'
        : 'node:20';
  const script =
    v.language === 'go'
      ? ['go test ./...', 'go build -o bin/server ./cmd/server']
      : v.language === 'python'
        ? ['pip install -r requirements.txt', 'pytest tests/ -q']
        : ['npm install', 'npm run build', 'npm test', 'npm run test:e2e'];
  const yml = `stages: [test, build, deploy]

variables:
  DOCKER_TLS_CERTDIR: ""

test:
  image: ${img}
  stage: test
  script:
${script.map((s) => `    - ${s}`).join('\n')}

docker-build:
  stage: build
  image: docker:24
  services:
    - docker:24-dind
  script:
    - docker build -t ${v.serviceSlug}:ci .

deploy_dev:
  stage: deploy
  when: manual
  environment:
    name: development
  script:
    - echo "Replace with deploy to dev"

deploy_staging:
  stage: deploy
  when: manual
  environment:
    name: staging
  script:
    - echo "Replace with deploy to staging"

deploy_prod:
  stage: deploy
  when: manual
  environment:
    name: production
  script:
    - echo "Replace with deploy to production"
`;
  await writeFile(path.join(dest, '.gitlab-ci.yml'), yml, 'utf8');
}
