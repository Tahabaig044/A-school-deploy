# Phase 7: Settings

## Duration

1 week

## Objectives

- Implement School Settings
- Build User Profile management
- Create System Configuration
- Implement Audit Logging

## Deliverables

### Week 1: Settings & Configuration

1. **School Settings**
   - School profile management
   - Academic year configuration
   - Branch management (multi-school)
   - School branding

2. **User Settings**
   - Profile management
   - Password change
   - Notification preferences
   - Theme preferences

3. **System Settings**
   - System configuration
   - Feature toggles
   - Backup management
   - System health monitoring

## Technical Implementation

### API Endpoints

```
# School Settings
GET    /api/v1/settings/school
PUT    /api/v1/settings/school
GET    /api/v1/settings/academic-year
PUT    /api/v1/settings/academic-year

# User Settings
GET    /api/v1/settings/profile
PUT    /api/v1/settings/profile
PUT    /api/v1/settings/password
GET    /api/v1/settings/notifications
PUT    /api/v1/settings/notifications

# System Settings
GET    /api/v1/settings/system
PUT    /api/v1/settings/system
GET    /api/v1/settings/features
PUT    /api/v1/settings/features

# Audit Logs
GET    /api/v1/audit-logs
GET    /api/v1/audit-logs/:id
```

### Database Schema

```sql
-- School Settings
CREATE TABLE school_settings (
  id UUID PRIMARY KEY,
  school_id UUID REFERENCES schools(id),
  key VARCHAR(100),
  value JSONB,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMP
);

-- Academic Year
CREATE TABLE academic_years (
  id UUID PRIMARY KEY,
  school_id UUID REFERENCES schools(id),
  name VARCHAR(50),
  start_date DATE,
  end_date DATE,
  is_current BOOLEAN DEFAULT false
);

-- User Preferences
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  theme VARCHAR(20) DEFAULT 'light',
  language VARCHAR(10) DEFAULT 'en',
  timezone VARCHAR(50),
  notifications_enabled BOOLEAN DEFAULT true,
  email_digest VARCHAR(20) -- daily, weekly, none
);

-- Audit Logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  action VARCHAR(50),
  entity_type VARCHAR(50),
  entity_id UUID,
  old_value JSONB,
  new_value JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- System Settings
CREATE TABLE system_settings (
  id UUID PRIMARY KEY,
  key VARCHAR(100) UNIQUE,
  value JSONB,
  description TEXT,
  category VARCHAR(50)
);
```

### UI Pages

- /settings - Settings dashboard
- /settings/school - School settings
- /settings/academic-year - Academic year
- /settings/profile - User profile
- /settings/notifications - Notification prefs
- /settings/system - System settings
- /settings/audit-logs - Audit logs

## Features

### School Settings

- Logo upload
- Contact information
- Address management
- Social media links

### User Settings

- Avatar upload
- Two-factor authentication (future)
- Session management
- Connected accounts

### System Settings

- Email configuration
- SMS configuration
- Storage settings
- Cache management

### Audit Logging

- Track all CRUD operations
- User activity logging
- Login/logout tracking
- IP address logging
- Search and filter logs

## Acceptance Criteria

- [ ] School settings can be updated
- [ ] Academic year configurable
- [ ] User profile editable
- [ ] Password change works
- [ ] Notification preferences saved
- [ ] Audit logs captured
- [ ] System settings manageable
- [ ] All changes logged

## Dependencies

- All previous phases completed
- Admin access configured

## Risks & Mitigations

| Risk                  | Impact | Mitigation            |
| --------------------- | ------ | --------------------- |
| Settings corruption   | High   | Backup before changes |
| Audit log performance | Medium | Archival strategy     |
| Configuration drift   | Medium | Validation rules      |
