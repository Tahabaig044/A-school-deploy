# Loop 009: Exams

## Overview

Exam module manages examination scheduling, configuration, and administration throughout the academic year.

## User Stories

### As an Admin

1. I want to create exam schedules
2. I want to define exam types
3. I want to set marks criteria
4. I want to manage exam centers

### As a Teacher

1. I want to view my exam duties
2. I want to enter marks
3. I want to view exam statistics

### As a Student

1. I want to see exam schedule
2. I want to download hall ticket
3. I want to view exam results

## API Endpoints

```
GET    /api/v1/exams
       Query: classId, subjectId, type, status
       Response: { data: Exam[] }

GET    /api/v1/exams/:id
       Response: { data: Exam }

POST   /api/v1/exams
       Body: CreateExamDto
       Response: { data: Exam }

PUT    /api/v1/exams/:id
       Body: UpdateExamDto
       Response: { data: Exam }

DELETE /api/v1/exams/:id
       Response: { message: "Exam deleted" }

GET    /api/v1/exams/:id/schedule
       Response: { data: ExamSchedule[] }

POST   /api/v1/exams/:id/schedule
       Body: CreateExamScheduleDto
       Response: { data: ExamSchedule }

GET    /api/v1/exams/:id/hall-ticket/:studentId
       Response: { data: HallTicket }
```

## Database Schema

```sql
CREATE TABLE exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('unit_test', 'midterm', 'final', 'quiz', 'assignment', 'practical')),
  description TEXT,
  class_id UUID REFERENCES classes(id),
  subject_id UUID REFERENCES subjects(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_marks INTEGER NOT NULL,
  passing_marks INTEGER NOT NULL,
  duration_minutes INTEGER,
  exam_code VARCHAR(50) UNIQUE,
  instructions TEXT,
  school_id UUID REFERENCES schools(id) NOT NULL,
  academic_year VARCHAR(20),
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'ongoing', 'completed', 'cancelled')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id)
);

CREATE TABLE exam_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id),
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  room_number VARCHAR(50),
  invigilator_id UUID REFERENCES teachers(id),
  max_students INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE exam_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID REFERENCES exams(id),
  student_id UUID REFERENCES students(id),
  marks_obtained DECIMAL(5,2),
  grade VARCHAR(5),
  grade_points DECIMAL(3,2),
  remarks TEXT,
  is_absent BOOLEAN DEFAULT false,
  entered_by UUID REFERENCES users(id),
  entered_at TIMESTAMP,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'entered', 'approved', 'published')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(exam_id, student_id)
);

-- Exam attendance
CREATE TABLE exam_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_schedule_id UUID REFERENCES exam_schedule(id),
  student_id UUID REFERENCES students(id),
  status VARCHAR(20) CHECK (status IN ('present', 'absent', 'late')),
  entry_time TIMESTAMP,
  exit_time TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Business Rules

### Exam Code Generation

```
Format: {EXAM_TYPE}{CLASS}{YEAR}{SEQUENCE}
Example: MT202405001 (Midterm 2024, Class 5, 001)
```

### Exam Types

- **Unit Test**: Short, frequent assessments
- **Midterm**: Mid-semester examination
- **Final**: End-semester examination
- **Quiz**: Quick knowledge checks
- **Assignment**: Project/coursework
- **Practical**: Lab/practical exams

### Marks Rules

- Marks cannot exceed total marks
- Passing marks must be less than total
- Marks entry validates range
- Grade calculated automatically

### Status Flow

```
draft → scheduled → ongoing → completed
                         ↓
                    cancelled
```

## UI Components

### Exam List

- Type filters
- Status indicators
- Date range selector
- Quick actions

### Exam Form

- Basic details
- Date configuration
- Marks settings
- Schedule builder

### Marks Entry

- Excel-like interface
- Bulk entry mode
- Validation feedback
- Approval workflow

### Hall Ticket

- Student details
- Exam schedule
- Instructions
- School branding

## Acceptance Criteria

- [ ] Exams can be created with all details
- [ ] Exam schedule works correctly
- [ ] Marks entry validates properly
- [ ] Grade calculation accurate
- [ ] Hall tickets generate correctly
- [ ] Exam status transitions work
- [ ] Reports generate correctly
