# Loop 006: Subjects

## Overview

Subject module manages academic subjects, their categorization, and assignment to classes and teachers.

## User Stories

### As an Admin

1. I want to create and manage subjects
2. I want to assign subjects to classes
3. I want to categorize subjects
4. I want to view subject statistics

### As a Teacher

1. I want to see subjects I teach
2. I want to view subject syllabus
3. I want to manage subject resources

### As a Student

1. I want to see my subjects
2. I want to view subject materials

## API Endpoints

```
GET    /api/v1/subjects
       Query: classId, categoryId
       Response: { data: Subject[] }

GET    /api/v1/subjects/:id
       Response: { data: Subject }

POST   /api/v1/subjects
       Body: CreateSubjectDto
       Response: { data: Subject }

PUT    /api/v1/subjects/:id
       Body: UpdateSubjectDto
       Response: { data: Subject }

DELETE /api/v1/subjects/:id
       Response: { message: "Subject deleted" }

GET    /api/v1/subjects/:id/teachers
       Response: { data: Teacher[] }

GET    /api/v1/subjects/categories
       Response: { data: Category[] }
```

## Database Schema

```sql
CREATE TABLE subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  category_id UUID REFERENCES subject_categories(id),
  class_id UUID REFERENCES classes(id),
  school_id UUID REFERENCES schools(id) NOT NULL,
  is_compulsory BOOLEAN DEFAULT true,
  max_marks INTEGER DEFAULT 100,
  passing_marks INTEGER DEFAULT 33,
  theory_marks INTEGER,
  practical_marks INTEGER,
  credits INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE subject_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  school_id UUID REFERENCES schools(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Subject-teacher mapping
CREATE TABLE subject_teachers (
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
  academic_year VARCHAR(20),
  PRIMARY KEY (subject_id, teacher_id, academic_year)
);
```

## Business Rules

### Subject Code Generation

```
Format: {CLASS}{SUBJECT_CODE}
Example: 5MATH (Class 5, Mathematics)
```

### Marks Configuration

- Max marks default: 100
- Passing marks default: 33 (or 33%)
- Theory/Practical split optional
- Credits for grading

### Subject Categories

- Languages
- Sciences
- Mathematics
- Humanities
- Arts
- Physical Education

## UI Components

### Subject List

- Category-wise grouping
- Class filter
- Teacher assignment
- Quick actions

### Subject Form

- Name and code
- Category selector
- Marks configuration
- Class assignment

## Acceptance Criteria

- [ ] Subjects can be created and edited
- [ ] Subject codes are unique
- [ ] Subjects assigned to classes
- [ ] Teachers assigned to subjects
- [ ] Marks configuration works
- [ ] Categories organize subjects
