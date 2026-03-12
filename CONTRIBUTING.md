# Contributing to BeatBar

Thank you for your interest in contributing to BeatBar! This document outlines the code quality standards and contribution guidelines.

## Code Quality Standards

This project follows production-ready code standards suitable for professional software development:

### Architecture

- **Modular Design**: Keep code organized in logical modules
- **Separation of Concerns**: Each class/module should have a single responsibility
- **DRY Principle**: Don't repeat yourself - extract common functionality
- **Error Handling**: Always handle errors gracefully with try-catch blocks

### Code Style

- **JSDoc Comments**: Document all public methods and classes
- **Naming Conventions**: Use descriptive, camelCase names for variables/functions
- **Consistent Formatting**: Follow existing code style (2-space indentation)
- **Line Length**: Keep lines under 100 characters when possible

### Error Handling

- Use custom error classes from `app/utils/errors.js`
- Always validate inputs before processing
- Log errors with appropriate context
- Provide meaningful error messages

### Testing Considerations

- Write code that is testable (pure functions where possible)
- Handle edge cases explicitly
- Validate all external inputs
- Consider failure scenarios

## Development Workflow

1. **Fork and Clone**: Fork the repository and clone your fork
2. **Create Branch**: Create a feature branch (`git checkout -b feature/amazing-feature`)
3. **Make Changes**: Follow the code quality standards above
4. **Test**: Test your changes thoroughly
5. **Commit**: Write clear commit messages
6. **Push**: Push to your fork (`git push origin feature/amazing-feature`)
7. **Pull Request**: Open a pull request with a clear description

## Commit Message Format

Use clear, descriptive commit messages:

```
feat: Add search result caching
fix: Resolve WebSocket reconnection issue
docs: Update README with installation steps
refactor: Extract validation logic to utility module
```

## Code Review Checklist

Before submitting, ensure:

- [ ] Code follows the style guide
- [ ] JSDoc comments are present for public APIs
- [ ] Error handling is comprehensive
- [ ] Input validation is implemented
- [ ] No console.log statements (use logger instead)
- [ ] No hardcoded values (use config.js)
- [ ] Code is tested manually
- [ ] README is updated if needed

## File Structure

When adding new files:

- **Utilities**: Place in `app/utils/`
- **Configuration**: Add to `app/config.js` or create new config file
- **UI Components**: Place in `app/ui/`
- **Extension Scripts**: Place in `extension/`

## Questions?

If you have questions about contributing, please open an issue for discussion.

Thank you for contributing to BeatBar! 🎵
