# Authentication System

## Overview

JWT-based authentication with refresh token rotation for secure access.

## Authentication Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│   Auth      │────▶│  Database   │
│   (Login)   │     │   Server    │     │  (Verify)   │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       │   1. Login Request│                   │
       │──────────────────▶│                   │
       │                   │  2. Verify User   │
       │                   │──────────────────▶│
       │                   │                   │
       │                   │  3. User Found    │
       │                   │◀──────────────────│
       │                   │                   │
       │                   │  4. Validate Pass │
       │                   │──────────────────▶│
       │                   │                   │
       │                   │  5. User Valid    │
       │                   │◀──────────────────│
       │                   │                   │
       │  6. JWT + Refresh │                   │
       │◀──────────────────│                   │
```

## Token Structure

### Access Token (JWT)

```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "role": "teacher",
  "schoolId": "school-uuid",
  "iat": 1234567890,
  "exp": 1234567890
}
```

### Refresh Token

```json
{
  "sub": "user-uuid",
  "tokenVersion": 1,
  "iat": 1234567890,
  "exp": 1234567890
}
```

## API Endpoints

### POST /api/v1/auth/register

Register new user account.

**Request:**

```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "student",
  "schoolId": "school-uuid"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "role": "student"
    },
    "accessToken": "jwt-token",
    "refreshToken": "refresh-token"
  }
}
```

### POST /api/v1/auth/login

Authenticate user and return tokens.

**Request:**

```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

### POST /api/v1/auth/refresh

Refresh access token using refresh token.

### POST /api/v1/auth/logout

Invalidate refresh token.

### POST /api/v1/auth/forgot-password

Send password reset email.

### POST /api/v1/auth/reset-password

Reset password with token.

### PUT /api/v1/auth/change-password

Change password (requires authentication).

## Security Features

### Password Requirements

- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character
- Hashed with bcrypt (12 rounds)

### Token Security

- Access token expiry: 15 minutes
- Refresh token expiry: 7 days
- Refresh token rotation on use
- Token blacklisting on logout
- IP-based token binding (optional)

### Rate Limiting

- Login: 5 attempts per 15 minutes
- Register: 3 attempts per hour
- Password reset: 3 attempts per hour
- API general: 100 requests per minute

## Session Management

- Active sessions tracking
- Force logout all sessions
- Session invalidation on password change
- Concurrent session limits

## Multi-Factor Authentication (Future)

- TOTP-based 2FA
- SMS verification
- Email verification
