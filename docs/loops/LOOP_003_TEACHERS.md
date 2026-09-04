# Loop 003: Teachers

## Overview

Teacher module manages teacher profiles, qualifications, assignments, and schedules. This is essential for academic operations and class management.

## User Stories

### As an Admin

1. I want to add new teachers
2. I want to manage teacher assignments
3. I want to view teacher workload
4. I want to manage teacher leave

### As a Teacher

1. I want to view my profile
2. I want to see my assigned classes
3. I want to view my timetable
4. I want to apply for leave

### As a Principal

1. I want to view all teachers
2. I want to approve leave requests
3. I want to see teacher performance

## API Endpoints

```
GET    /api/v1/teachers
       Query: page, limit, search, departmentId, status
       Response: { data: Teacher[], pagination: Pagination }

GET    /api/v1/teachers/:id
       Response: { data: Teacher }

POST   /api/v1/teachers
       Body: CreateTeacherDto
       Response: { data: Teacher }

PUT    /api/v1/teachers/:id
       Body: UpdateTeacherDto
       Response: { data: Teacher }

DELETE /api/v1/teachers/:id
       Response: { message: "Teacher deleted" }

GET    /api/v1/teachers/:id/classes
       Response: { data: Class[] }

GET    /api/v1/teachers/:id/timetable
       Query: weekStart
       Response: { data: TimetableSlot[] }

GET    /api/v1/teachers/:id/subjects
       Response: { data: Subject[] }

POST   /api/v1/teachers/:id/assign-class
       Body: { classId, sectionId, subjectId }
       Response: { message: "Class assigned" }

DELETE /api/v1/teachers/:id/unassign-class/:assignmentId
       Response: { message: "Class unassigned" }
```

## Database Schema

```sql
CREATE TABLE teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  employee_id VARCHAR(50) UNIQUE NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  date_of_birth DATE,
  gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'other')),
  blood_group VARCHAR(10),
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  qualification VARCHAR(255),
  experience_years INTEGER DEFAULT 0,
  specialization VARCHAR(255),
  designation VARCHAR(100),
  department_id UUID REFERENCES departments(id),
  joining_date DATE NOT NULL,
  salary DECIMAL(12,2),
  bank_account_number VARCHAR(20),
  bank_name VARCHAR(100),
  ifsc_code VARCHAR(11),
  aadhar_number VARCHAR(12),
  pan_number VARCHAR(10),
  address TEXT,
  photo_url VARCHAR(500),
  documents JSONB DEFAULT '[]',
  school_id UUID REFERENCES schools(id) NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_leave', 'resigned')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Teacher class assignments
CREATE TABLE teacher_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id),
  section_id UUID REFERENCES sections(id),
  subject_id UUID REFERENCES subjects(id),
  is_class_teacher BOOLEAN DEFAULT false,
  academic_year VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Teacher leave
CREATE TABLE teacher_leave (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES teachers(id),
  leave_type VARCHAR(50),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Business Rules

### Employee ID Generation

```
Format: TCH{YEAR}{SEQUENCE}
Example: TCH2024001 (Year 2024, Teacher 001)
```

### Assignment Rules

- A teacher can be class teacher for one section only
- A teacher can teach multiple subjects
- Subject must belong to assigned class
- No scheduling conflicts allowed

### Leave Rules

- Maximum 2 days casual leave per month
- Maximum 12 days sick leave per year
- Leave requests need principal approval
- Substitute teacher assignment required

## UI Components

### Teacher List

- Search and filter
- Department-wise view
- Status indicators
- Quick actions

### Teacher Form

- Multi-step form
- Qualification details
- Bank details
- Document upload

### Teacher Profile

- Personal information
- Assigned classes
- Timetable view
- Leave history
- Performance metrics

## Acceptance Criteria

- [ ] Teacher can be created with all details
- [ ] Employee ID auto-generated
- [ ] Class assignments work correctly
- [ ] Timetable displays properly
- [ ] Leave requests can be made
- [ ] Leave approval workflow works
- [ ] Teacher search functions
