# Loop 010: Results

## Overview

Results module handles exam results processing, grade calculation, report card generation, and result publication.

## User Stories

### As an Admin

1. I want to view all results
2. I want to approve results
3. I want to generate report cards
4. I want to publish results

### As a Teacher

1. I want to enter marks for my subjects
2. I want to view class performance
3. I want to add remarks for students

### As a Student

1. I want to view my results
2. I want to download my report card
3. I want to see my grade history

### As a Parent

1. I want to view my child's results
2. I want to download report card
3. I want to see performance trends

## API Endpoints

```
GET    /api/v1/results
       Query: examId, classId, studentId, subjectId
       Response: { data: Result[] }

GET    /api/v1/results/:id
       Response: { data: Result }

POST   /api/v1/results
       Body: CreateResultDto
       Response: { data: Result }

PUT    /api/v1/results/:id
       Body: UpdateResultDto
       Response: { data: Result }

POST   /api/v1/results/bulk
       Body: BulkResultDto
       Response: { data: Result[] }

PUT    /api/v1/results/:id/approve
       Response: { data: Result }

GET    /api/v1/results/student/:studentId
       Query: examId, academicYear
       Response: { data: StudentResults }

GET    /api/v1/results/class/:classId
       Query: examId
       Response: { data: ClassResults }

POST   /api/v1/results/publish/:examId
       Response: { message: "Results published" }
```

## Database Schema

```sql
-- Results table (extends exam_results from Loop 009)
CREATE TABLE results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id),
  marks_obtained DECIMAL(5,2),
  total_marks INTEGER,
  percentage DECIMAL(5,2),
  grade VARCHAR(5),
  grade_points DECIMAL(3,2),
  rank INTEGER,
  remarks TEXT,
  entered_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'draft',
  school_id UUID REFERENCES schools(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, exam_id, subject_id)
);

-- Report cards
CREATE TABLE report_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id),
  exam_id UUID REFERENCES exams(id),
  report_number VARCHAR(100) UNIQUE,
  total_marks INTEGER,
  marks_obtained DECIMAL(6,2),
  percentage DECIMAL(5,2),
  overall_grade VARCHAR(5),
  overall_grade_points DECIMAL(3,2),
  rank_in_class INTEGER,
  rank_in_section INTEGER,
  attendance_percentage DECIMAL(5,2),
  teacher_remarks TEXT,
  principal_remarks TEXT,
  status VARCHAR(20) DEFAULT 'draft',
  generated_at TIMESTAMP,
  generated_by UUID REFERENCES users(id),
  published_at TIMESTAMP,
  pdf_url VARCHAR(500),
  school_id UUID REFERENCES schools(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Grading scales
CREATE TABLE grading_scales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  school_id UUID REFERENCES schools(id),
  grades JSONB NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Grade configuration example
-- grades: [
--   { min: 90, max: 100, grade: "A+", points: 4.0 },
--   { min: 80, max: 89, grade: "A", points: 3.7 },
--   { min: 70, max: 79, grade: "B+", points: 3.3 },
--   { min: 60, max: 69, grade: "B", points: 3.0 },
--   { min: 50, max: 59, grade: "C+", points: 2.7 },
--   { min: 40, max: 49, grade: "C", points: 2.3 },
--   { min: 33, max: 39, grade: "D", points: 2.0 },
--   { min: 0, max: 32, grade: "F", points: 0.0 }
-- ]
```

## Business Rules

### Report Number Generation

```
Format: RPT{CLASS}{EXAM}{YEAR}{SEQUENCE}
Example: RPT05MT2024001
```

### Grade Calculation

1. Percentage = (Marks Obtained / Total Marks) × 100
2. Grade determined from grading scale
3. Grade points from scale
4. Overall grade from weighted average

### Rank Calculation

1. Rank within class based on percentage
2. Rank within section
3. Tie-breaking by subject scores
4. Ranks updated on approval

### Result Status Flow

```
draft → entered → approved → published
```

### Report Card Generation

1. Compile all subject results
2. Calculate overall metrics
3. Add attendance data
4. Add remarks
5. Generate PDF
6. Publish

## UI Components

### Results Dashboard

- Exam selector
- Class/section filter
- Statistics cards
- Quick actions

### Marks Entry

- Subject-wise entry
- Bulk entry mode
- Validation indicators
- Save/approve buttons

### Result View

- Student result card
- Subject-wise breakdown
- Grade display
- Rank information

### Report Card

- School branding
- Student information
- Subject table
- Grades and remarks
- Signature areas
- PDF preview/download

## Reports

1. Class-wise results
2. Subject-wise analysis
3. Top performers
4. Pass/fail statistics
5. Grade distribution
6. Performance trends

## Acceptance Criteria

- [ ] Results can be entered for all subjects
- [ ] Grade calculation accurate
- [ ] Rank calculation correct
- [ ] Report cards generate properly
- [ ] PDF export works
- [ ] Results can be published
- [ ] Student results viewable
- [ ] Parent can view child's results
