import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

function ciFiles(v) {
  const files = [];
  if (v.ci === 'github') files.push('.github/workflows/ci.yml');
  if (v.ci === 'gitlab') files.push('.gitlab-ci.yml');
  return files;
}

function fileListSection(title, files) {
  return `## ${title}\n\n${files.map((file) => `- \`${file}\``).join('\n')}\n`;
}

function languageGuide(v) {
  if (v.language === 'go') {
    return {
      stackLabel: 'Go clean service',
      reviewFiles: [
        'README.md',
        '.forgeops.json',
        '.env',
        'docker-compose.yml',
        'cmd/server/main.go',
        'internal/config/config.go',
        'internal/modules/payments/handlers.go',
        'internal/modules/payments/handlers_test.go',
        'internal/modules/health/handlers.go',
        'internal/httpx/middleware.go',
        'internal/httpx/errors.go',
        'internal/metrics/metrics.go',
        ...ciFiles(v),
      ],
      structureFiles: [
        'cmd/server/main.go',
        'internal/modules/',
        'internal/config/',
        'internal/httpx/',
        'internal/logging/',
        'internal/metrics/',
      ],
      businessFiles: [
        'internal/modules/payments/handlers.go',
        'internal/modules/health/handlers.go',
      ],
      testingFiles: [
        'internal/modules/payments/handlers_test.go',
        'internal/modules/health/handlers_test.go',
      ],
      qualityFiles: [
        'go.mod',
        'Dockerfile',
        '.env',
        'README.md',
      ],
      devCommands: [
        '`go test ./...`',
        '`go run ./cmd/server`',
      ],
    };
  }

  if (v.language === 'python') {
    return {
      stackLabel: 'FastAPI clean service',
      reviewFiles: [
        'README.md',
        '.forgeops.json',
        '.env',
        'docker-compose.yml',
        'app/main.py',
        'app/config.py',
        'app/modules/payments_router.py',
        'app/modules/health_router.py',
        'app/logutil.py',
        'app/metrics.py',
        'tests/test_unit.py',
        'tests/test_integration.py',
        ...ciFiles(v),
      ],
      structureFiles: [
        'app/main.py',
        'app/modules/',
        'app/config.py',
        'app/metrics.py',
        'tests/',
      ],
      businessFiles: [
        'app/modules/payments_router.py',
        'app/modules/health_router.py',
      ],
      testingFiles: [
        'tests/test_unit.py',
        'tests/test_integration.py',
        'tests/conftest.py',
      ],
      qualityFiles: [
        'requirements.txt',
        'Dockerfile',
        '.env',
        'README.md',
      ],
      devCommands: [
        '`pytest tests/`',
        `\`uvicorn app.main:app --reload --port ${v.port}\``,
      ],
    };
  }

  return {
    stackLabel: 'NestJS clean service',
    reviewFiles: [
      'README.md',
      '.forgeops.json',
      '.env',
      'docker-compose.yml',
      'src/main.ts',
      'src/app.module.ts',
      'src/config/configuration.ts',
      'src/config/env.validation.ts',
      'src/modules/payments/payments.controller.ts',
      'src/modules/payments/payments.controller.spec.ts',
      'src/modules/health/health.controller.ts',
      'src/common/filters/all-exceptions.filter.ts',
      'src/lib/logger.ts',
      'test/app.e2e-spec.ts',
      ...ciFiles(v),
    ],
    structureFiles: [
      'src/main.ts',
      'src/app.module.ts',
      'src/modules/',
      'src/config/',
      'src/common/',
      'src/lib/',
      'test/',
    ],
    businessFiles: [
      'src/modules/payments/payments.controller.ts',
      'src/modules/payments/root.controller.ts',
      'src/modules/health/health.controller.ts',
    ],
    testingFiles: [
      'src/modules/payments/payments.controller.spec.ts',
      'test/app.e2e-spec.ts',
      'test/setup-env.ts',
    ],
    qualityFiles: [
      'package.json',
      'eslint.config.mjs',
      'jest.config.cjs',
      'Dockerfile',
      '.env',
      'README.md',
    ],
    devCommands: [
      '`npm test`',
      '`npm run test:e2e`',
      '`npm run lint`',
      '`npm run start:dev`',
    ],
  };
}

function rootIntro(v, guide) {
  return `This project was scaffolded for **${guide.stackLabel}** and the preferred agent is **${v.aiAgent}**.

The goal is to make work safe for technical and non-technical collaborators. Before changing code, read the shared playbooks in this order:

- \`AGENTS.review.md\`
- \`AGENTS.structure.md\`
- \`AGENTS.business.md\`
- \`AGENTS.quality.md\`
- \`AGENTS.testing.md\`
- \`AGENTS.ci.md\`
- \`AGENTS.nextjs.md\` (example for future frontend work)

Rules:

- Keep explanations plain. Assume the reader may not know the framework.
- Mention exactly which files changed and why.
- Do not change business behavior without updating tests and the related documentation.
- Prefer small, reversible changes over broad rewrites.
`;
}

function reviewDoc(v, guide) {
  return `# Review guide for ${v.serviceName}

Use this file when someone asks for a review, a bug fix, or a feature estimate.

${fileListSection('Files to open first', guide.reviewFiles)}
## What to check

- Is the requested behavior already described in \`README.md\` or \`.forgeops.json\`?
- Does the change touch configuration, API behavior, or infrastructure?
- Are there tests close to the changed code?
- Will the change affect Docker, CI, or local setup for a non-technical teammate?

## Review output format

- Explain the user request in one short sentence.
- List the files that matter most.
- Call out risks in plain language.
- End with the next safe step.
`;
}

function structureDoc(v, guide) {
  return `# Code structure guide for ${v.serviceName}

This project follows a clean-service layout. Use the file map below to decide where work belongs.

${fileListSection('Main structure files and folders', guide.structureFiles)}
## Placement rules

- Entry point and bootstrapping stay near the top-level server file.
- Business endpoints live inside the feature module area.
- Configuration belongs in the config files, not mixed into handlers.
- Shared logging, metrics, middleware, and error handling stay in shared infrastructure folders.
- Tests should sit next to the feature they protect or in the dedicated test folder already present in the template.

## For non-technical reviewers

- Ask "where should this change live?" before asking "how do we code it?"
- If a change affects more than one folder, request a short explanation before merging.
`;
}

function businessDoc(v, guide) {
  return `# Business logic guide for ${v.serviceName}

These files are the first place to inspect when the requested change affects real behavior.

${fileListSection('Business files', guide.businessFiles)}
## Working rules

- Keep product rules, pricing rules, validation rules, and workflow decisions in the feature area.
- Do not hide business logic inside logging, config, or CI files.
- If a rule changes, update the tests and the README language that describes the endpoint or workflow.
- When requirements are unclear, write down the assumption in the pull request or summary.
`;
}

function qualityDoc(v, guide) {
  return `# Quality guide for ${v.serviceName}

These files control service quality, maintainability, and developer safety.

${fileListSection('Quality-related files', guide.qualityFiles)}
## Quality checklist

- Configuration names should stay readable and consistent.
- Error messages should help a non-technical teammate understand what failed.
- New dependencies need a clear reason.
- Docker and local run instructions must still work after the change.
- Documentation should match the real behavior.
`;
}

function testingDoc(v, guide) {
  return `# Testing guide for ${v.serviceName}

Use the nearest existing tests before inventing a new pattern.

${fileListSection('Testing files', guide.testingFiles)}
## Minimum expectation

- Every business change gets at least one test update or one new test.
- Bug fixes should include a test that fails before the fix and passes after it.
- If no automated test is possible, document the manual verification steps clearly.

## Useful commands

${guide.devCommands.map((cmd) => `- ${cmd}`).join('\n')}
`;
}

function ciDoc(v) {
  const files = ciFiles(v);
  const fileSection =
    files.length > 0
      ? fileListSection('CI files', files)
      : '## CI files\n\n- No CI file was selected during scaffold.\n';
  return `# CI guide for ${v.serviceName}

${fileSection}
## What CI should prove

- The project installs cleanly.
- Tests run successfully.
- The Docker image still builds.
- Deployment-related files did not drift accidentally.

## When editing CI

- Explain the reason in plain language.
- Prefer predictable steps over clever shell scripts.
- Keep local developer commands aligned with CI commands.
`;
}

function nextJsDoc() {
  return `# Next.js example guide

This is an example guide for teams that later add a Next.js app to the service ecosystem.

## Files to review first

- \`app/layout.tsx\`
- \`app/page.tsx\`
- \`app/api/\`
- \`components/\`
- \`lib/\`
- \`middleware.ts\`
- \`tests/\`
- \`e2e/\`
- \`.github/workflows/ci.yml\`

## Structure rules

- Keep UI in \`components/\`.
- Keep server actions, API calls, and shared data access in \`lib/\` or \`app/api/\`.
- Avoid placing business rules directly inside page components.
- Put auth, redirects, and request guards in \`middleware.ts\` only when they truly belong there.

## Quality rules

- Every page change should be checked on mobile and desktop.
- Accessibility issues are bugs, not polish.
- Loading, empty, and error states should be explicit.

## Testing and CI

- Add unit tests for utilities and components with meaningful state.
- Add end-to-end checks for the most important user flows.
- CI should run lint, type checks, tests, and production build.
`;
}

function codexRules(v, guide) {
  return `# Codex rules for ${v.serviceName}

${rootIntro(v, guide)}

When working in Codex:

- Start with \`AGENTS.review.md\` to find the right files.
- Keep summaries short and concrete.
- If a user is non-technical, explain the impact in product language first and code language second.
- Before finishing, confirm tests or manual verification steps.
`;
}

function claudeRules(v, guide) {
  return `# Claude rules for ${v.serviceName}

${rootIntro(v, guide)}

When working in Claude:

- Think in small tasks and state assumptions clearly.
- Prefer editing the smallest set of files that solves the request.
- If requirements are unclear, preserve current behavior and document the assumption.
- Always mention how the change was tested.
`;
}

function cursorRuleFile(title, description, body) {
  return `---
description: ${description}
globs: []
alwaysApply: true
---

# ${title}

${body}
`;
}

export async function writeAgentGuides(dest, v) {
  const guide = languageGuide(v);

  await writeFile(path.join(dest, 'AGENTS.review.md'), reviewDoc(v, guide), 'utf8');
  await writeFile(path.join(dest, 'AGENTS.structure.md'), structureDoc(v, guide), 'utf8');
  await writeFile(path.join(dest, 'AGENTS.business.md'), businessDoc(v, guide), 'utf8');
  await writeFile(path.join(dest, 'AGENTS.quality.md'), qualityDoc(v, guide), 'utf8');
  await writeFile(path.join(dest, 'AGENTS.testing.md'), testingDoc(v, guide), 'utf8');
  await writeFile(path.join(dest, 'AGENTS.ci.md'), ciDoc(v), 'utf8');
  await writeFile(path.join(dest, 'AGENTS.nextjs.md'), nextJsDoc(), 'utf8');

  if (v.aiAgent === 'codex') {
    await mkdir(path.join(dest, '.codex'), { recursive: true });
    await writeFile(path.join(dest, '.codex', 'AGENTS.md'), codexRules(v, guide), 'utf8');
    await writeFile(
      path.join(dest, 'AGENTS.md'),
      `# Project agent entrypoint\n\nThe main Codex rules live in \`.codex/AGENTS.md\`.\n\nAlso read:\n\n- \`AGENTS.review.md\`\n- \`AGENTS.structure.md\`\n- \`AGENTS.business.md\`\n- \`AGENTS.quality.md\`\n- \`AGENTS.testing.md\`\n- \`AGENTS.ci.md\`\n- \`AGENTS.nextjs.md\`\n`,
      'utf8',
    );
    return;
  }

  if (v.aiAgent === 'claude') {
    await mkdir(path.join(dest, '.claude'), { recursive: true });
    await writeFile(path.join(dest, '.claude', 'CLAUDE.md'), claudeRules(v, guide), 'utf8');
    await writeFile(
      path.join(dest, 'CLAUDE.md'),
      `# Project agent entrypoint\n\nThe main Claude rules live in \`.claude/CLAUDE.md\`.\n\nAlso read:\n\n- \`AGENTS.review.md\`\n- \`AGENTS.structure.md\`\n- \`AGENTS.business.md\`\n- \`AGENTS.quality.md\`\n- \`AGENTS.testing.md\`\n- \`AGENTS.ci.md\`\n- \`AGENTS.nextjs.md\`\n`,
      'utf8',
    );
    return;
  }

  if (v.aiAgent === 'cursor') {
    const rulesDir = path.join(dest, '.cursor', 'rules');
    await mkdir(rulesDir, { recursive: true });
    await writeFile(
      path.join(rulesDir, '01-project-overview.mdc'),
      cursorRuleFile(
        'Forgeops project overview',
        'High-level operating context for this generated service',
        `${rootIntro(v, guide)}\nRead the shared AGENTS markdown files before editing.`,
      ),
      'utf8',
    );
    await writeFile(
      path.join(rulesDir, '02-delivery-checklist.mdc'),
      cursorRuleFile(
        'Delivery checklist',
        'Review, testing, and communication checklist for code changes',
        `Before editing, inspect these files first:\n\n${guide.reviewFiles
          .map((file) => `- \`${file}\``)
          .join('\n')}\n\nBefore finishing:\n\n- Update tests when behavior changes.\n- Keep CI and Docker working.\n- Explain the change in plain language.\n- Mention manual verification when automated tests are not enough.`,
      ),
      'utf8',
    );
  }
}
