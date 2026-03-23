import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as random from "@pulumi/random";

const base = "{{SERVICE_SLUG}}";
const tags = { Project: "{{SERVICE_NAME}}", ManagedBy: "forgeops-pulumi" };

const region = aws.getRegionOutput().name;

const vpc = aws.ec2.getVpcOutput({ default: true });
const subnets = aws.ec2.getSubnetsOutput({
  filters: [{ name: "vpc-id", values: [vpc.id] }],
});

const bucket = new aws.s3.Bucket(`${base}-assets`, {
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

const dbSubnets = new aws.rds.SubnetGroup(`${base}-db-subnets`, {
  subnetIds: subnets.ids,
  tags,
});

const dbSg = new aws.ec2.SecurityGroup(`${base}-db-sg`, {
  vpcId: vpc.id,
  description: "Forgeops RDS access (restrict to ECS tasks in production)",
  ingress: [
    {
      protocol: "tcp",
      fromPort: 5432,
      toPort: 5432,
      cidrBlocks: [vpc.cidrBlock],
    },
  ],
  egress: [{ protocol: "-1", fromPort: 0, toPort: 0, cidrBlocks: ["0.0.0.0/0"] }],
  tags,
});

const dbPassword = new random.RandomPassword(`${base}-db-pwd`, {
  length: 32,
  special: true,
}).result;

const db = new aws.rds.Instance(`${base}-postgres`, {
  engine: "postgres",
  engineVersion: "16",
  instanceClass: "db.t4g.micro",
  allocatedStorage: 20,
  dbSubnetGroupName: dbSubnets.name,
  vpcSecurityGroupIds: [dbSg.id],
  username: "app",
  password: dbPassword,
  skipFinalSnapshot: true,
  publiclyAccessible: true,
  tags,
});

const ddb = new aws.dynamodb.Table(`${base}-events`, {
  name: `${base}-events`,
  billingMode: "PAY_PER_REQUEST",
  hashKey: "pk",
  attributes: [{ name: "pk", type: "S" }],
  tags,
});

export const awsRegion = region;
export const vpcId = vpc.id;
export const s3BucketName = bucket.id;
export const ecrRepositoryUrl = ecr.repositoryUrl;
export const ecsClusterArn = cluster.arn;
export const rdsEndpoint = db.endpoint;
export const dynamoTableName = ddb.name;
