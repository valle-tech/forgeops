# AGENTS.md — Flutter

## Goal
Write scalable, simple Flutter code that is easy to read, test, refactor, and extend.

## Core Rules
- Prefer clarity over cleverness.
- Do not use ternary expressions. Use explicit `if` statements.
- Keep files small and focused. Split code before a file becomes hard to scan.
- Avoid duplication of code, logic, methods, widgets, and state handling.
- Do not create generic `utils` files. Use domain-specific helpers, services, extensions, or value objects.
- Separate UI, state, business logic, data access, and models.
- Keep business rules out of widgets.
- Keep API, database, storage, and platform logic out of UI and state classes.
- Prefer immutable data and explicit dependencies.
- Do not introduce abstractions before they remove real duplication or clarify intent.
- Use meaningful names that describe behavior and domain purpose.
- Keep functions short and single-purpose.
- Avoid large widgets. Extract private widgets or feature widgets when needed.
- Avoid global mutable state.
- Handle loading, empty, error, and success states explicitly.
- Make invalid states hard or impossible to represent.

## Project Structure
Use feature-first structure:

```text
lib/
  app/
    app.dart
    router.dart
    theme/
  core/
    errors/
    network/
    storage/
  features/
    feature_name/
      data/
        models/
        repositories/
        sources/
      domain/
        entities/
        repositories/
        use_cases/
      presentation/
        pages/
        widgets/
        controllers/
```

## Flutter Practices
- Widgets should only compose UI and delegate behavior.
- Controllers, not widgets, coordinate state changes.
- Repositories hide data sources from the domain and presentation layers.
- Use cases contain business actions when logic is more than a simple repository call.
- Keep model serialization in `data/models`.
- Keep domain entities free of framework and API concerns.
- Prefer composition over inheritance.
- Use `const` constructors whenever possible.
- Keep build methods readable and shallow.
- Do not perform async work directly inside `build`.
- Dispose controllers, streams, and subscriptions correctly.
- Use localization, theming, and routing consistently through app-level configuration.

## Testing Expectations
- Test business logic, repositories, controllers, and edge cases.
- Widget tests should cover important user flows and states.
- Mock external dependencies at boundaries only.
- Add tests for bug fixes to prevent regressions.

## Before Finishing
- Remove dead code.
- Remove duplicated logic.
- Ensure names match intent.
- Ensure each file has one clear responsibility.
- Ensure errors and empty states are handled.
- Ensure formatting, linting, and tests pass.
