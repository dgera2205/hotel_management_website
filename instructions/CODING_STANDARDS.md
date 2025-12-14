# Coding Standards - 378625e7-3833-4ff4-9ee6-3baec4a915ab

## General Principles

### Code Quality
- Write clean, readable, and self-documenting code
- Follow the DRY (Don't Repeat Yourself) principle
- Keep functions small and focused on a single responsibility
- Use meaningful variable and function names
- Add comments only when the code cannot speak for itself

### Git Workflow
- Write clear, descriptive commit messages
- Keep commits atomic and focused
- Use feature branches for new development
- Review code before merging to main branch

### Documentation
- Document all public APIs and interfaces
- Keep README files up to date
- Include inline documentation for complex logic

### Error Handling
- Handle errors gracefully with meaningful messages
- Never swallow exceptions silently
- Log errors appropriately for debugging

### Security
- Never commit secrets or credentials
- Validate all user inputs
- Follow the principle of least privilege
- Keep dependencies updated

### Testing
- Write tests for critical functionality
- Aim for meaningful test coverage
- Test edge cases and error conditions

## Project Structure

```
378625e7-3833-4ff4-9ee6-3baec4a915ab/
├── frontend/          # Frontend application
├── backend/           # Backend API
├── database/          # Database migrations/seeds
├── instructions/      # Coding guidelines
├── docker-compose.yml # Container orchestration
└── README.md          # Project documentation
```

## Environment
- Use environment variables for configuration
- Never hardcode sensitive values
- Keep .env.example updated with all required variables
