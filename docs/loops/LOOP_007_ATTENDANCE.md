# Loop 007: Attendance

## Overview
Attendance module handles daily student attendance marking, tracking, and reporting. This is critical for student monitoring and compliance.

## User Stories

### As a Teacher
1. I want to mark attendance for my class
2. I want to mark students as present/absent/late
3. I want to add remarks for absent students
4. I want to view attendance history

### As an Admin
1. I want to view attendance reports
2. I want to see class-wise attendance
3. I want to track attendance patterns
4. I want to generate attendance certificates

### As a Parent
1. I want to see my child's attendance
2. I want to receive absence notifications
3. I want to view monthly attendance

## API Endpoints

```
GET    /api/v1/attendance
       Query: classId, sectionId, date, startDate, endDate
       Response: { data: Attendance[] }

POST   /api/v1/attendance
       Body: MarkAttendanceDto
       Response: { data: Attendance[] }

PUT    /api/v1/attendance/:id
       Body: UpdateAttendanceDto
       Response: { data: Attendance }

GET    /api/v1/attendance/student/:studentId
       Query: startDate, endDate
       Response: { data: Attendance[] }

GET    /api/v1/attendance/report
       Query: classId, startDate, endDate, type
       Response: { data: AttendanceReport }

GET    /api/v1/attendance/summary
       Query: classId, month, year
       Response: { data: AttendanceSummary }
```

## Database Schema

```sql
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused', 'half_day')),
  remarks TEXT,
  marked_by UUID REFERENCES teachers(id),
  marked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  school_id UUID REFERENCES schools(id) NOT NULL,
  UNIQUE(student_id, date)
);

-- Attendance settings
CREATE TABLE attendance_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) UNIQUE,
  late_after_minutes INTEGER DEFAULT 15,
  half_day_after_minutes INTEGER DEFAULT 60,
  auto_mark_absent BOOLEAN DEFAULT true,
  absent_threshold_minutes INTEGER DEFAULT 30,
  notify_parent_on_absent BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Attendance notifications log
CREATE TABLE attendance_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_id UUID REFERENCES attendance(id),
  parent_id UUID REFERENCES parents(id),
  notification_type VARCHAR(50),
  sent_at TIMESTAMP,
  status VARCHAR(20) DEFAULT 'pending'
);
```

## Business Rules

### Marking Rules
- Attendance can be marked for current day only (or previous day with permission)
- Once marked, changes are logged
- Class teacher marks attendance for their section
- Bulk marking supported

### Status Definitions
- **Present**: Student attended full day
- **Absent**: Student did not attend
- **Late**: Student arrived after grace period
- **Excused**: Student absent with valid reason
- **Half Day**: Student attended half day

### Time-based Rules
- Late arrival: After configurable minutes (default 15)
- Half day: After configurable minutes (default 60)
- Auto-mark absent: After configurable threshold

### Notification Rules
- Parent notified on absence (configurable)
- Daily summary to parents (optional)
- Weekly report available

## UI Components

### Attendance Marking
- Date selector
- Class/Section selector
- Student list with status buttons
- Quick mark (all present/absent)
- Remarks field
- Save button

### Attendance Report
- Calendar view
- Student-wise view
- Class-wise view
- Export options

### Attendance Summary
- Monthly summary cards
- Percentage calculation
- Trend charts
- Comparison views

## Acceptance Criteria
- [ ] Attendance can be marked for entire class
- [ ] Status options work correctly
- [ ] Late time calculation works
- [ ] Attendance history accurate
- [ ] Reports generate correctly
- [ ] Parent notifications sent
- [ ] Bulk marking works
- [ ] Date validation enforced
