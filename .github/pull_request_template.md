## PR Checklist

### Security & Compliance
- [ ] No PHI in code/logs/tests/fixtures
- [ ] No credentials or secrets in code
- [ ] Secrets via AWS Secrets Manager only
- [ ] HIPAA compliance maintained

### Code Quality
- [ ] TypeScript strict mode passes
- [ ] Tests added/updated (coverage ≥80%)
- [ ] ESLint/Prettier applied (when available)
- [ ] Bundle size checked (<5MB for frontend)

### Database
- [ ] Migration tested (if applicable)
- [ ] Rollback plan documented
- [ ] No direct SQL with user input

### Documentation
- [ ] API changes documented
- [ ] README updated if needed
- [ ] Breaking changes noted

### Review Requirements
- [ ] Security review if touching auth/payment/patient data
- [ ] Database review if schema changes
- [ ] Performance review if adding new dependencies

## Description
<!-- Describe your changes in detail -->

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Security fix

## Testing
<!-- Describe the tests you ran to verify your changes -->
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Related Issues
<!-- Link to related issues -->
Fixes #(issue number)

## Rollback Plan
<!-- How to rollback if this change causes issues in production -->

## Screenshots (if applicable)
<!-- Add screenshots to help explain your changes -->

## Additional Notes
<!-- Any additional information that reviewers should know -->
