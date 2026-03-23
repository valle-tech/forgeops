export function computeNestPlaceholders(vars) {
  const { auth, graphql, observe } = vars;
  let nestExtraImports = '';
  let nestModuleImports = '';
  let nestInstrumentImport = '';
  let paymentsAuthImports = '';
  let paymentsAuthExtra = '';

  if (observe !== false) {
    nestInstrumentImport = "import './instrumentation';\n";
  }
  let paymentsNestImports = '';
  let paymentsImportsBlock = '';
  if (auth) {
    nestExtraImports += "import { AuthModule } from './modules/auth/auth.module';\n";
    nestModuleImports += '    AuthModule,\n';
    paymentsNestImports = "import { AuthModule } from '../auth/auth.module';\n";
    paymentsImportsBlock = '  imports: [AuthModule],\n';
    paymentsAuthImports = `import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
`;
    paymentsAuthExtra = `
  @Get('secure')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  secure() {
    return { domain: 'payments', scope: 'admin' };
  }
`;
  }
  if (graphql) {
    nestExtraImports +=
      "import { GraphQLModule } from '@nestjs/graphql';\nimport { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';\nimport { GraphqlExampleModule } from './modules/graphql/graphql.module';\n";
    nestModuleImports += `    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      sortSchema: true,
    }),
    GraphqlExampleModule,
`;
  }

  return {
    nestExtraImports,
    nestModuleImports,
    nestInstrumentImport,
    paymentsAuthImports,
    paymentsAuthExtra,
    paymentsUseGuards: auth ? ', UseGuards' : '',
    paymentsNestImports,
    paymentsImportsBlock,
  };
}

export function computeGoPlaceholders(vars) {
  const { auth, observe, modulePath } = vars;
  let goOptionalImports = '';
  let goAuthRegister = '';
  let goOtelBootstrap = '';
  let goOtelWrap = '';

  if (auth) {
    goOptionalImports += `\t"${modulePath}/internal/auth"\n`;
    goAuthRegister = '\tauth.Register(mux, cfg)\n';
  }
  if (observe !== false) {
    goOptionalImports += `\t"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"\n\t"${modulePath}/internal/otel"\n`;
    goOtelBootstrap = '\totel.SetupTracing(cfg.ServiceName)\n';
    goOtelWrap = '\ttoHTTP = otelhttp.NewHandler(toHTTP, cfg.ServiceName)\n';
  }

  return { goOptionalImports, goAuthRegister, goOtelBootstrap, goOtelWrap };
}

export function computePythonPlaceholders(vars) {
  const { auth, observe } = vars;
  return {
    pyOtelSetup:
      observe !== false
        ? `from app.otel import setup_otel

setup_otel()

`
        : '',
    pyAuthImports: auth ? 'from app.modules.auth_router import router as auth_router\n' : '',
    pyAuthRouter: auth ? '    app.include_router(auth_router)\n' : '',
  };
}

export function buildReplacements(vars, baseReplacements) {
  const n = computeNestPlaceholders(vars);
  const g = computeGoPlaceholders(vars);
  const p = computePythonPlaceholders(vars);
  return {
    ...baseReplacements,
    '{{NEST_EXTRA_IMPORTS}}': n.nestExtraImports,
    '{{NEST_MODULE_IMPORTS}}': n.nestModuleImports,
    '{{NEST_INSTRUMENT_IMPORT}}': n.nestInstrumentImport,
    '{{PAYMENTS_AUTH_IMPORTS}}': n.paymentsAuthImports,
    '{{PAYMENTS_AUTH_EXTRA}}': n.paymentsAuthExtra,
    '{{PAYMENTS_USE_GUARDS}}': n.paymentsUseGuards,
    '{{PAYMENTS_NEST_IMPORTS}}': n.paymentsNestImports,
    '{{PAYMENTS_IMPORTS_BLOCK}}': n.paymentsImportsBlock,
    '{{GO_OPTIONAL_IMPORTS}}': g.goOptionalImports,
    '{{GO_AUTH_REGISTER}}': g.goAuthRegister,
    '{{GO_OTEL_BOOTSTRAP}}': g.goOtelBootstrap,
    '{{GO_OTEL_WRAP}}': g.goOtelWrap,
    '{{PY_OTEL_SETUP}}': p.pyOtelSetup,
    '{{PY_AUTH_IMPORTS}}': p.pyAuthImports,
    '{{PY_AUTH_ROUTER}}': p.pyAuthRouter,
  };
}
