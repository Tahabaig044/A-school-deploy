# Phase 5: Communication

## Duration

2 weeks

## Objectives

- Implement Announcement system
- Build Notification system
- Create Messaging module
- Implement Email/SMS integration

## Deliverables

### Week 1: Announcements & Notifications

1. **Announcements**
   - Create announcements
   - Target audience selection
   - Schedule announcements
   - Announcement history

2. **Notifications**
   - In-app notifications
   - Push notifications (future)
   - Notification preferences
   - Notification history

### Week 2: Messaging & Integrations

1. **Internal Messaging**
   - Teacher-parent messaging
   - Group messaging
   - Message threads
   - File attachments

2. **External Communications**
   - Email integration
   - SMS integration
   - Bulk messaging
   - Message templates

## Technical Implementation

### API Endpoints

```
# Announcements
GET    /api/v1/announcements
POST   /api/v1/announcements
PUT    /api/v1/announcements/:id
DELETE /api/v1/announcements/:id

# Notifications
GET    /api/v1/notifications
PUT    /api/v1/notifications/:id/read
PUT    /api/v1/notifications/read-all
GET    /api/v1/notifications/preferences
PUT    /api/v1/notifications/preferences

# Messages
GET    /api/v1/messages
POST   /api/v1/messages
GET    /api/v1/messages/:threadId
POST   /api/v1/messages/:threadId/reply

# Templates
GET    /api/v1/templates
POST   /api/v1/templates
PUT    /api/v1/templates/:id
```

### Database Schema

```sql
-- Announcements
CREATE TABLE announcements (
  id UUID PRIMARY KEY,
  title VARCHAR(255),
  content TEXT,
  target_audience VARCHAR(50)[], -- all, students, parents, teachers
  class_ids UUID[],
  priority VARCHAR(20) DEFAULT 'normal',
  published_at TIMESTAMP,
  expires_at TIMESTAMP,
  created_by UUID REFERENCES users(id)
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  title VARCHAR(255),
  message TEXT,
  type VARCHAR(50),
  reference_id UUID,
  reference_type VARCHAR(50),
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Messages
CREATE TABLE message_threads (
  id UUID PRIMARY KEY,
  subject VARCHAR(255),
  created_by UUID REFERENCES users(id),
  last_message_at TIMESTAMP
);

CREATE TABLE messages (
  id UUID PRIMARY KEY,
  thread_id UUID REFERENCES message_threads(id),
  sender_id UUID REFERENCES users(id),
  content TEXT,
  attachments VARCHAR(500)[],
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE thread_participants (
  thread_id UUID REFERENCES message_threads(id),
  user_id UUID REFERENCES users(id),
  PRIMARY KEY (thread_id, user_id)
);

-- Message Templates
CREATE TABLE message_templates (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  subject VARCHAR(255),
  content TEXT,
  type VARCHAR(50), -- email, sms, both
  variables VARCHAR(100)[]
);
```

### UI Pages

- /announcements - Announcement list
- /announcements/new - Create announcement
- /notifications - Notification center
- /messages - Message inbox
- /messages/:threadId - Message thread

## Features

### Announcements

- Rich text editor
- Schedule for later
- Audience targeting
- Priority levels
- Attach files

### Notifications

- Real-time updates
- Notification badges
- Mark as read
- Notification preferences
- Email digest option

### Messaging

- Conversation threads
- Read receipts
- File sharing
- Search messages
- Archive threads

## Email Integration

```typescript
// Email service
class EmailService {
  async send(to: string, subject: string, html: string) {}
  async sendBulk(recipients: string[], subject: string, html: string) {}
  async sendWithTemplate(templateId: string, data: Record<string, any>) {}
}
```

## SMS Integration

```typescript
// SMS service
class SMSService {
  async send(phone: string, message: string) {}
  async sendBulk(phones: string[], message: string) {}
}
```

## Acceptance Criteria

- [ ] Announcements can be created and targeted
- [ ] Notifications delivered in real-time
- [ ] Messages work between users
- [ ] Email integration functional
- [ ] SMS integration functional
- [ ] Templates can be customized
- [ ] Bulk messaging works
- [ ] File attachments supported

## Dependencies

- Phase 2 completed
- All user modules ready
- Email/SMS provider configured

## Risks & Mitigations

| Risk                           | Impact | Mitigation                  |
| ------------------------------ | ------ | --------------------------- |
| Notification delivery failures | High   | Retry mechanism, fallback   |
| Email spam filters             | Medium | Proper email authentication |
| SMS delivery delays            | Medium | Multiple provider support   |
