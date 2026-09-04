# Master Rules

## Code Quality

- Write clean, readable, maintainable code
- Follow DRY (Don't Repeat Yourself) principle
- Follow KISS (Keep It Simple, Stupid) principle
- Follow YAGNI (You Aren't Gonna Need It) principle
- Maximum function length: 50 lines
- Maximum file length: 500 lines
- Maximum cyclomatic complexity: 10

## Naming Conventions

- Variables: camelCase
- Functions: camelCase
- Classes: PascalCase
- Constants: UPPER_SNAKE_CASE
- Files: kebab-case
- Database tables: snake_case (plural)
- Database columns: snake_case

## Git Workflow

- Branch naming: feature/, bugfix/, hotfix/, release/
- Commit messages: conventional commits format
- No direct commits to main/develop
- PR required for all changes
- Minimum 1 review required

## Documentation

- All functions must have JSDoc/docstring comments
- All APIs must have OpenAPI/Swagger documentation
- README required for each module
- Changelog must be updated for every release

## Security

- Never commit secrets or API keys
- Use environment variables for configuration
- Implement input validation on all endpoints
- Use parameterized queries (no SQL injection)
- Implement rate limiting on public APIs
- Use HTTPS in production
- Hash passwords with bcrypt (minimum 12 rounds)
- Implement CSRF protection

## Performance

- Database queries must use indexes
- Implement pagination for list endpoints
- Use caching for frequently accessed data
- Optimize images and assets
- Implement lazy loading where appropriate

## Testing

- Minimum 80% code coverage
- Unit tests for all business logic
- Integration tests for all API endpoints
- E2E tests for critical user flows
- Tests must run in CI/CD pipeline

## Accessibility

- WCAG 2.1 AA compliance minimum
- Semantic HTML elements
- ARIA labels where needed
- Keyboard navigation support
- Color contrast ratio minimum 4.5:1

## Error Handling

- Use custom error classes
- Return appropriate HTTP status codes
- Log errors with context
- Never expose internal errors to users
- Implement global error handler
