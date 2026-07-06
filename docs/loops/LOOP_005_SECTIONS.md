# Loop 005: Sections

## Overview
Section module manages divisions within classes, enabling organized student grouping and class teacher assignments.

## User Stories

### As an Admin
1. I want to create sections for classes
2. I want to assign class teachers to sections
3. I want to manage section capacity
4. I want to view section-wise statistics

### As a Teacher
1. I want to view sections I teach
2. I want to see students in my section
3. I want to manage my section's attendance

### As a Parent
1. I want to know which section my child is in
2. I want to know the class teacher

## API Endpoints

```
GET    /api/v1/sections
       Query: classId
       Response: { data: Section[] }

GET    /api/v1/sections/:id
       Response: { data: Section }

POST   /api/v1/sections
       Body: CreateSectionDto
       Response: { data: Section }

PUT    /api/v1/sections/:id
       Body: UpdateSectionDto
       Response: { data: Section }

DELETE /api/v1/sections/:id
       Response: { message: "Section deleted" }

GET    /api/v1/sections/:id/students
       Response: { data: Student[] }

GET    /api/v1/sections/:id/stats
       Response: { data: SectionStats }
```

## Database Schema

```sql
CREATE TABLE sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES teachers(id),
  capacity INTEGER DEFAULT 40,
  room_number VARCHAR(50),
  school_id UUID REFERENCES schools(id) NOT NULL,
  academic_year VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(name, class_id, academic_year)
);
```

## Business Rules

### Section Naming
- Convention: "A", "B", "C" or "Alpha", "Beta", "Gamma"
- Must be unique within a class
- Auto-increment naming supported

### Class Teacher Assignment
- One class teacher per section
- Class teacher handles section management
- Can be reassigned

### Capacity Management
- Student count cannot exceed capacity
- Warning at 90% capacity
- Configurable per section

## UI Components

### Section List
- Class-wise grouping
- Student count
- Class teacher display
- Quick actions

### Section Form
- Name input
- Class selector
- Teacher selector
- Capacity setting

## Acceptance Criteria
- [ ] Sections can be created for classes
- [ ] Class teacher can be assigned
- [ ] Capacity limits enforced
- [ ] Student count accurate
- [ ] Section search works
