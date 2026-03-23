import { writeFile } from 'node:fs/promises';
import path from 'node:path';

import { readProjectConfig } from '../manifest.js';
import { exampleDbUrl } from './shared.js';

function toYaml(obj, indent) {
  const pad = '  '.repeat(indent);
  let out = '';
  if (Array.isArray(obj)) {
    for (const item of obj) {
      out += `${pad}- ${String(item)}\n`;
    }
    return out;
  }
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) continue;
    if (typeof v === 'object' && !Array.isArray(v)) {
      out += `${pad}${k}:\n${toYaml(v, indent + 1)}`;
    } else if (Array.isArray(v)) {
      out += `${pad}${k}:\n`;
      for (const item of v) {
        out += `${pad}  - ${String(item)}\n`;
      }
    } else {
      const esc = String(v).replace(/'/g, "''");
      out += `${pad}${k}: ${/[:#\n]/.test(esc) ? `'${esc}'` : esc}\n`;
    }
  }
  return out;
}

export function manifestToComposeVars(m) {
  const slug = (m.serviceSlug || m.slug || 'app').replace(/_/g, '-');
  return {
    serviceName: m.serviceName || m.name || 'service',
    serviceSlug: slug,
    port: Number(m.httpPort ?? m.port ?? 3000),
    database: String(m.database || 'none').toLowerCase(),
    messaging: String(m.messaging || 'none').toLowerCase(),
    redis: Boolean(m.redis),
  };
}

export async function writeDockerCompose(dest, v) {
  const services = {
    [v.serviceSlug]: {
      build: '.',
      env_file: ['.env'],
      ports: [`${v.port}:${v.port}`],
      environment: {
        PORT: String(v.port),
        SERVICE_NAME: v.serviceName,
        LOG_FORMAT: 'json',
      },
    },
  };

  if (v.redis) {
    services.redis = { image: 'redis:7-alpine', ports: ['6379:6379'] };
    services[v.serviceSlug].environment.REDIS_URL = 'redis://redis:6379/0';
    services[v.serviceSlug].depends_on = [...(services[v.serviceSlug].depends_on || []), 'redis'];
  }

  if (v.database === 'postgres' || v.database === 'postgresql') {
    services.postgres = {
      image: 'postgres:16-alpine',
      environment: {
        POSTGRES_USER: 'postgres',
        POSTGRES_PASSWORD: 'postgres',
        POSTGRES_DB: v.serviceSlug.replace(/-/g, '_'),
      },
      ports: ['5432:5432'],
    };
    services[v.serviceSlug].depends_on = [...(services[v.serviceSlug].depends_on || []), 'postgres'];
    services[v.serviceSlug].environment.DATABASE_URL = exampleDbUrl('postgres', v.serviceSlug);
  }

  if (v.database === 'mongo' || v.database === 'mongodb') {
    services.mongodb = { image: 'mongo:7', ports: ['27017:27017'] };
    services[v.serviceSlug].depends_on = [...(services[v.serviceSlug].depends_on || []), 'mongodb'];
    services[v.serviceSlug].environment.DATABASE_URL = exampleDbUrl('mongo', v.serviceSlug);
  }

  if (v.messaging === 'kafka') {
    services.zookeeper = { image: 'confluentinc/cp-zookeeper:7.6.1', environment: { ZOOKEEPER_CLIENT_PORT: 2181 } };
    services.kafka = {
      image: 'confluentinc/cp-kafka:7.6.1',
      depends_on: ['zookeeper'],
      ports: ['9092:9092'],
      environment: {
        KAFKA_BROKER_ID: 1,
        KAFKA_ZOOKEEPER_CONNECT: 'zookeeper:2181',
        KAFKA_ADVERTISED_LISTENERS: 'PLAINTEXT://localhost:9092',
        KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1,
      },
    };
    services[v.serviceSlug].environment.KAFKA_BROKERS = 'kafka:9092';
    services[v.serviceSlug].depends_on = [...(services[v.serviceSlug].depends_on || []), 'kafka'];
  }

  if (v.messaging === 'rabbitmq') {
    services.rabbitmq = { image: 'rabbitmq:3-management-alpine', ports: ['5672:5672', '15672:15672'] };
    services[v.serviceSlug].environment.RABBITMQ_URL = 'amqp://guest:guest@rabbitmq:5672/';
    services[v.serviceSlug].depends_on = [...(services[v.serviceSlug].depends_on || []), 'rabbitmq'];
  }

  const doc = { services };
  const yml = toYaml(doc, 0);
  await writeFile(path.join(dest, 'docker-compose.yml'), yml, 'utf8');
}

export async function regenerateDockerCompose(dir) {
  const cfg = await readProjectConfig(dir);
  await writeDockerCompose(dir, manifestToComposeVars(cfg));
}
