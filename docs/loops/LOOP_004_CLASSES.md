# Loop 004: Classes

## Overview

Class module manages the academic class structure, including grade levels and class organization. This is fundamental for organizing students and academic activities.

## User Stories

### As an Admin

1. I want to create and manage classes
2. I want to organize classes by grade level
3. I want to set class capacity
4. I want to view class statistics

### As a Teacher

1. I want to view my assigned classes
2. I want to see students in my classes
3. I want to view class performance

### As a Parent

1. I want to see which class my child is in
2. I want to view class information

## API Endpoints

```
GET    /api/v1/classes
       Query: schoolId, gradeLevel
       Response: { data: Class[] }

GET    /api/v1/classes/:id
       Response: { data: Class }

POST   /api/v1/classes
       Body: CreateClassDto
       Response: { data: Class }

PUT    /api/v1/classes/:id
       Body: UpdateClassDto
       Response: { data: Class }

DELETE /api/v1/classes/:id
       Response: { message: "Class deleted" }

GET    /api/v1/classes/:id/students
       Query: sectionId
       Response: { data: Student[] }

GET    /api/v1/classes/:id/sections
       Response: { data: Section[] }

GET    /api/v1/classes/:id/stats
       Response: { data: ClassStats }
```

## Database Schema

```sql
CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  grade_level INTEGER NOT NULL,
  description TEXT,
  school_id UUID REFERENCES schools(id) NOT NULL,
  academic_year VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id),
  UNIQUE(name, school_id, academic_year)
);

-- Class subjects mapping
CREATE TABLE class_subjects (
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  is_compulsory BOOLEAN DEFAULT true,
  PRIMARY KEY (class_id, subject_id)
);
```

## Business Rules

### Grade Level

- Grade levels from 1 to 12 (or configurable)
- Classes follow naming convention: "Class 1", "Class 2", etc.
- Each class can have multiple sections

### Class Capacity

- Default capacity: 40 students
- Configurable per class
- Warning when capacity reached
- Block when over capacity (optional)

### Validation Rules

1. Class name must be unique within school and academic year
2. Grade level must be positive integer
3. Capacity must be positive integer

## UI Components

### Class List

- Grid/list view
- Grade level filter
- Student count display
- Quick actions

### Class Form

- Name input
- Grade level selector
- Description field
- Capacity setting

### Class Details

- Section tabs
- Student list
- Subject list
- Statistics

## Acceptance Criteria

- [ ] Classes can be created and edited
- [ ] Grade levels organized correctly
- [ ] Class capacity enforced
- [ ] Student count accurate
- [ ] Sections display correctly
- [ ] Class statistics available
