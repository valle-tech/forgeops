import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as random from "@pulumi/random";

const cfg = new pulumi.Config();
const stack = pulumi.getStack();
const base = `{{SERVICE_SLUG}}-${stack}`;
const containerPort = {{PORT}};
const databaseType = "{{DB_TYPE}}";
const desiredCount = cfg.getNumber("desiredCount") ?? 0;
const imageTag = cfg.get("imageTag") ?? "bootstrap";
const tags = { Project: "{{SERVICE_NAME}}", ManagedBy: "forgeops-pulumi" };

const region = aws.getRegionOutput().name;
const callerIdentity = aws.getCallerIdentityOutput({});

const vpc = aws.ec2.getVpcOutput({ default: true });
const subnets = aws.ec2.getSubnetsOutput({
  filters: [{ name: "vpc-id", values: [vpc.id] }],
});

const bucketSuffix = new random.RandomId(`${base}-bucket-suffix`, {
  byteLength: 4,
});

const bucket = new aws.s3.Bucket(`${base}-assets`, {
  bucket: pulumi.interpolate`${base}-assets-${bucketSuffix.hex}`,
  tags,
  serverSideEncryptionConfiguration: {
    rule: { applyServerSideEncryptionByDefault: { sseAlgorithm: "AES256" } },
  },
});

const ecr = new aws.ecr.Repository(`${base}-app`, {
  imageTagMutability: "MUTABLE",
  tags,
});

const cluster = new aws.ecs.Cluster(`${base}-cluster`, {
  tags,
  settings: [{ name: "containerInsights", value: "enabled" }],
});

const appSg = new aws.ec2.SecurityGroup(`${base}-app-sg`, {
  vpcId: vpc.id,
  description: "Forgeops ECS service access",
  ingress: [],
  egress: [{ protocol: "-1", fromPort: 0, toPort: 0, cidrBlocks: ["0.0.0.0/0"] }],
  tags,
});

const albSg = new aws.ec2.SecurityGroup(`${base}-alb-sg`, {
  vpcId: vpc.id,
  description: "Forgeops ALB access",
  ingress: [{ protocol: "tcp", fromPort: 80, toPort: 80, cidrBlocks: ["0.0.0.0/0"] }],
  egress: [{ protocol: "-1", fromPort: 0, toPort: 0, cidrBlocks: ["0.0.0.0/0"] }],
  tags,
});

const appIngressFromAlb = new aws.vpc.SecurityGroupIngressRule(`${base}-alb-to-app`, {
  securityGroupId: appSg.id,
  fromPort: containerPort,
  toPort: containerPort,
  ipProtocol: "tcp",
  referencedSecurityGroupId: albSg.id,
});

const dbSubnets =
  databaseType === "postgres" || databaseType === "postgresql"
    ? new aws.rds.SubnetGroup(`${base}-db-subnets`, {
        subnetIds: subnets.ids,
        tags,
      })
    : null;

const dbSg =
  databaseType === "postgres" || databaseType === "postgresql"
    ? new aws.ec2.SecurityGroup(`${base}-db-sg`, {
        vpcId: vpc.id,
        description: "Forgeops RDS access",
        ingress: [],
        egress: [{ protocol: "-1", fromPort: 0, toPort: 0, cidrBlocks: ["0.0.0.0/0"] }],
        tags,
      })
    : null;

const dbPassword = new random.RandomPassword(`${base}-db-pwd`, {
  length: 32,
  special: true,
}).result;

const dbName = "{{SERVICE_SLUG}}".replace(/-/g, "_");

const dbIngressFromApp =
  dbSg
    ? new aws.vpc.SecurityGroupIngressRule(`${base}-app-to-db`, {
        securityGroupId: dbSg.id,
        fromPort: 5432,
        toPort: 5432,
        ipProtocol: "tcp",
        referencedSecurityGroupId: appSg.id,
      })
    : null;

const db =
  dbSubnets && dbSg
    ? new aws.rds.Instance(`${base}-postgres`, {
        engine: "postgres",
        engineVersion: "16",
        instanceClass: "db.t4g.micro",
        allocatedStorage: 20,
        dbSubnetGroupName: dbSubnets.name,
        vpcSecurityGroupIds: [dbSg.id],
        username: "app",
        password: dbPassword,
        dbName,
        skipFinalSnapshot: true,
        publiclyAccessible: true,
        tags,
      })
    : null;

const ddb = new aws.dynamodb.Table(`${base}-events`, {
  name: `${base}-events`,
  billingMode: "PAY_PER_REQUEST",
  hashKey: "pk",
  attributes: [{ name: "pk", type: "S" }],
  tags,
});

const logGroup = new aws.cloudwatch.LogGroup(`${base}-logs`, {
  retentionInDays: 7,
  tags,
});

const executionRole = new aws.iam.Role(`${base}-task-exec-role`, {
  assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
    Service: "ecs-tasks.amazonaws.com",
  }),
  tags,
});

new aws.iam.RolePolicyAttachment(`${base}-task-exec-policy`, {
  role: executionRole.name,
  policyArn: aws.iam.ManagedPolicies.AmazonECSTaskExecutionRolePolicy,
});

const taskRole = new aws.iam.Role(`${base}-task-role`, {
  assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
    Service: "ecs-tasks.amazonaws.com",
  }),
  tags,
});

const appUrl = new aws.lb.LoadBalancer(`${base}-alb`, {
  loadBalancerType: "application",
  internal: false,
  securityGroups: [albSg.id],
  subnets: subnets.ids,
  tags,
});

const targetGroup = new aws.lb.TargetGroup(`${base}-tg`, {
  port: containerPort,
  protocol: "HTTP",
  targetType: "ip",
  vpcId: vpc.id,
  healthCheck: {
    path: "/health",
    matcher: "200-399",
    healthyThreshold: 2,
    unhealthyThreshold: 5,
  },
  tags,
});

const listener = new aws.lb.Listener(`${base}-listener`, {
  loadBalancerArn: appUrl.arn,
  port: 80,
  protocol: "HTTP",
  defaultActions: [{ type: "forward", targetGroupArn: targetGroup.arn }],
  tags,
});

const databaseUrl =
  db
    ? pulumi.interpolate`postgres://app:${dbPassword}@${db.address}:${db.port}/${dbName}?sslmode=require`
    : "";

const taskDefinition = new aws.ecs.TaskDefinition(`${base}-task`, {
  family: `${base}-task`,
  cpu: "256",
  memory: "512",
  networkMode: "awsvpc",
  requiresCompatibilities: ["FARGATE"],
  executionRoleArn: executionRole.arn,
  taskRoleArn: taskRole.arn,
  containerDefinitions: pulumi
    .all([ecr.repositoryUrl, logGroup.name, databaseUrl, region])
    .apply(([repoUrl, logGroupName, resolvedDatabaseUrl, resolvedRegion]) =>
      JSON.stringify([
        {
          name: "{{SERVICE_SLUG}}",
          image: `${repoUrl}:${imageTag}`,
          essential: true,
          portMappings: [{ containerPort, hostPort: containerPort, protocol: "tcp" }],
          environment: [
            { name: "PORT", value: String(containerPort) },
            { name: "SERVICE_NAME", value: "{{SERVICE_NAME}}" },
            { name: "LOG_FORMAT", value: "json" },
            { name: "OTEL_SERVICE_NAME", value: "{{SERVICE_SLUG}}" },
            ...(resolvedDatabaseUrl ? [{ name: "DATABASE_URL", value: resolvedDatabaseUrl }] : []),
          ],
          logConfiguration: {
            logDriver: "awslogs",
            options: {
              "awslogs-group": logGroupName,
              "awslogs-region": resolvedRegion,
              "awslogs-stream-prefix": "{{SERVICE_SLUG}}",
            },
          },
        },
      ]),
    ),
  tags,
}, { replaceOnChanges: ["containerDefinitions"] });

const service = new aws.ecs.Service(`${base}-svc`, {
  cluster: cluster.arn,
  desiredCount,
  launchType: "FARGATE",
  taskDefinition: taskDefinition.arn,
  waitForSteadyState: false,
  networkConfiguration: {
    assignPublicIp: true,
    securityGroups: [appSg.id],
    subnets: subnets.ids,
  },
  loadBalancers: [
    {
      targetGroupArn: targetGroup.arn,
      containerName: "{{SERVICE_SLUG}}",
      containerPort,
    },
  ],
  deploymentMinimumHealthyPercent: 50,
  deploymentMaximumPercent: 200,
  tags,
}, { dependsOn: [listener, appIngressFromAlb, dbIngressFromApp].filter(Boolean) });

export const awsRegion = region;
export const awsAccountId = callerIdentity.accountId;
export const vpcId = vpc.id;
export const s3BucketName = bucket.id;
export const ecrRepositoryUrl = ecr.repositoryUrl;
export const ecsClusterArn = cluster.arn;
export const ecsClusterName = cluster.name;
export const ecsServiceName = service.name;
export const serviceUrl = pulumi.interpolate`http://${appUrl.dnsName}`;
export const servicePort = containerPort;
export const rdsEndpoint = db?.endpoint ?? "";
export const dynamoTableName = ddb.name;
