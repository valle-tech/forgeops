import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { PKG_ROOT, copyTree, replacements } from './shared.js';

const FRAGMENTS = path.join(PKG_ROOT, 'fragments');

export async function mergePackageJson(dest, { dependencies = {}, devDependencies = {} } = {}) {
  const p = path.join(dest, 'package.json');
  const raw = await readFile(p, 'utf8');
  const j = JSON.parse(raw);
  j.dependencies = { ...j.dependencies, ...dependencies };
  j.devDependencies = { ...j.devDependencies, ...devDependencies };
  await writeFile(p, `${JSON.stringify(j, null, 2)}\n`, 'utf8');
}

export async function mergeRequirementsTxt(dest, extraLines) {
  const p = path.join(dest, 'requirements.txt');
  let body = '';
  try {
    body = await readFile(p, 'utf8');
  } catch {
    body = '';
  }
  const set = new Set(
    body
      .split('\n')
      .map((l) => l.split(/[>=<]/)[0]?.trim())
      .filter(Boolean),
  );
  const toAdd = extraLines.filter((line) => {
    const name = line.split(/[>=<]/)[0]?.trim();
    return name && !set.has(name);
  });
  if (!toAdd.length) return;
  const out = body.replace(/\s*$/, '') + (body.trim() ? '\n' : '') + toAdd.join('\n') + '\n';
  await writeFile(p, out, 'utf8');
}

export async function appendGoModRequire(dest, lines) {
  const p = path.join(dest, 'go.mod');
  let body = await readFile(p, 'utf8');
  if (!body.includes('require (')) {
    body += '\nrequire (\n)\n';
  }
  const reqs = lines.filter((l) => {
    const mod = l.split(' ')[0];
    return mod && !body.includes(mod + ' ');
  });
  if (!reqs.length) return;
  const insert = reqs.map((l) => `\t${l}\n`).join('');
  body = body.replace(/require\s*\(/, `require (\n${insert}`);
  await writeFile(p, body, 'utf8');
}

async function copyFragment(name, dest, vars) {
  const src = path.join(FRAGMENTS, name);
  const rep = replacements(vars);
  await copyTree(src, dest, rep);
}

export async function applyLanguageFragments(dest, vars) {
  const { language, auth, graphql, observe } = vars;

  if (language === 'node') {
    if (observe !== false) {
      await copyFragment('nestjs-observe', dest, vars);
      await mergePackageJson(dest, {
        dependencies: {
          '@opentelemetry/api': '^1.9.0',
          '@opentelemetry/sdk-node': '^0.57.0',
          '@opentelemetry/auto-instrumentations-node': '^0.52.0',
          '@opentelemetry/exporter-trace-otlp-http': '^0.57.0',
        },
      });
    }
    if (auth) {
      await copyFragment('nestjs-auth', dest, vars);
      await mergePackageJson(dest, {
        dependencies: {
          '@nestjs/jwt': '^11.0.0',
          '@nestjs/passport': '^11.0.0',
          passport: '^0.7.0',
          'passport-jwt': '^4.0.1',
        },
        devDependencies: {
          '@types/passport-jwt': '^4.0.1',
        },
      });
    }
    if (graphql) {
      await copyFragment('nestjs-graphql', dest, vars);
      await mergePackageJson(dest, {
        dependencies: {
          '@nestjs/graphql': '^12.2.0',
          '@nestjs/apollo': '^12.2.0',
          '@apollo/server': '^4.11.0',
          graphql: '^16.9.0',
        },
      });
    }
  }

  if (language === 'go') {
    if (observe !== false) {
      await copyFragment('go-observe', dest, vars);
      await appendGoModRequire(dest, [
        'go.opentelemetry.io/otel v1.32.0',
        'go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp v1.32.0',
        'go.opentelemetry.io/otel/sdk v1.32.0',
        'go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp v0.58.0',
      ]);
    }
    if (auth) {
      await copyFragment('go-auth', dest, vars);
      await appendGoModRequire(dest, ['github.com/golang-jwt/jwt/v5 v5.2.1']);
    }
  }

  if (language === 'python') {
    if (observe !== false) {
      await copyFragment('python-observe', dest, vars);
      await mergeRequirementsTxt(dest, [
        'opentelemetry-api>=1.28.0',
        'opentelemetry-sdk>=1.28.0',
        'opentelemetry-exporter-otlp>=1.28.0',
        'opentelemetry-instrumentation-fastapi>=0.49b0',
      ]);
    }
    if (auth) {
      await copyFragment('python-auth', dest, vars);
      await mergeRequirementsTxt(dest, ['python-jose[cryptography]>=3.3.0', 'passlib[bcrypt]>=1.7.4']);
    }
  }
}
