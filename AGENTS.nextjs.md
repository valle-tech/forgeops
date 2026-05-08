# AGENTS.md — Next.js

## Goal
Write scalable, simple Next.js code that is easy to read, test, refactor, and extend.

## Core Rules
- Prefer clarity over cleverness.
- Do not use ternary expressions. Use explicit `if` statements.
- Keep files small and focused. Split code before a file becomes hard to scan.
- Avoid duplication of code, logic, methods, components, hooks, and data fetching.
- Do not create generic `utils` files. Use domain-specific helpers, services, hooks, schemas, or mappers.
- Separate UI, business logic, data access, validation, and types.
- Keep business rules out of React components.
- Keep API, database, auth, and external service logic out of UI components.
- Prefer server components by default.
- Use client components only when interactivity, browser APIs, or client-side state are required.
- Prefer immutable data and explicit dependencies.
- Do not introduce abstractions before they remove real duplication or clarify intent.
- Use meaningful names that describe behavior and domain purpose.
- Keep functions short and single-purpose.
- Avoid global mutable state.
- Handle loading, empty, error, and success states explicitly.
- Make invalid states hard or impossible to represent.

## Project Structure
Use feature-first structure:

```text
src/
  app/
    layout.tsx
    page.tsx
    api/
  core/
    config/
    errors/
    http/
  features/
    feature-name/
      components/
      actions/
      services/
      repositories/
      schemas/
      types/
      hooks/
```

## Next.js Practices
- Components should compose UI and delegate behavior.
- Server actions should validate input, call domain logic, and return predictable results.
- Services contain business logic.
- Repositories isolate database and external API access.
- Schemas validate input at boundaries.
- Types should live near the feature they belong to.
- Shared components must be reusable by at least two real use cases.
- Avoid prop drilling through many layers. Extract composition or focused context when needed.
- Do not fetch the same data in multiple places. Centralize access through feature repositories or services.
- Keep route handlers thin.
- Keep client state minimal and local when possible.
- Use suspense, loading states, and error boundaries intentionally.
- Never expose secrets or server-only code to the client.
- Keep accessibility, metadata, and SEO in mind for public pages.

## Testing Expectations
- Test business logic, services, repositories, validation, and edge cases.
- Component tests should cover important user flows and states.
- Mock external dependencies at boundaries only.
- Add tests for bug fixes to prevent regressions.

## Before Finishing
- Remove dead code.
- Remove duplicated logic.
- Ensure names match intent.
- Ensure each file has one clear responsibility.
- Ensure errors and empty states are handled.
- Ensure formatting, linting, type checking, and tests pass.
