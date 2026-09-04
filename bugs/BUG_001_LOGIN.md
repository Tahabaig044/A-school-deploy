# BUG_001

## Bug Information

| Field         | Value                                           |
| ------------- | ----------------------------------------------- |
| Bug ID        | BUG_001                                         |
| Title         | Login fails with special characters in password |
| Severity      | High                                            |
| Status        | Open                                            |
| Date Reported | [Date]                                          |
| Reported By   | [Name]                                          |

## Description

When user tries to login with a password containing special characters like `!@#$%`, the login fails silently.

## Steps to Reproduce

1. Register with password `Test@123`
2. Try to login with same password
3. Login fails without error message

## Expected Behavior

User should be able to login with valid credentials.

## Actual Behavior

Login fails silently.

## Root Cause

[To be investigated]

## Fix

[To be implemented]

## Files Affected

- src/actions/auth.ts
- src/lib/auth.ts

## Testing

- [ ] Fix verified
- [ ] No regressions
- [ ] Build passes
