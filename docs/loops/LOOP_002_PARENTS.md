# Loop 002: Parents

## Overview
Parent module manages parent/guardian information and their relationship with students. This enables effective communication and tracking of student guardians.

## User Stories

### As an Admin
1. I want to add parent information
2. I want to link parents to students
3. I want to manage parent accounts
4. I want to view parent contact details

### As a Parent
1. I want to view my profile
2. I want to update my contact information
3. I want to view all my children
4. I want to communicate with teachers

### As a Teacher
1. I want to view parent information for my students
2. I want to contact parents when needed

## API Endpoints

```
GET    /api/v1/parents
       Query: page, limit, search
       Response: { data: Parent[], pagination: Pagination }

GET    /api/v1/parents/:id
       Response: { data: Parent }

POST   /api/v1/parents
       Body: CreateParentDto
       Response: { data: Parent }

PUT    /api/v1/parents/:id
       Body: UpdateParentDto
       Response: { data: Parent }

DELETE /api/v1/parents/:id
       Response: { message: "Parent deleted" }

GET    /api/v1/parents/:id/children
       Response: { data: Student[] }

POST   /api/v1/parents/:id/link-student
       Body: { studentId: string }
       Response: { message: "Student linked" }

DELETE /api/v1/parents/:id/unlink-student/:studentId
       Response: { message: "Student unlinked" }
```

## Database Schema

```sql
CREATE TABLE parents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  relationship VARCHAR(50) NOT NULL CHECK (relationship IN ('father', 'mother', 'guardian', 'other')),
  phone VARCHAR(20) NOT NULL,
  phone_secondary VARCHAR(20),
  email VARCHAR(255),
  occupation VARCHAR(255),
  annual_income DECIMAL(12,2),
  education VARCHAR(255),
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(50) DEFAULT 'India',
  aadhar_number VARCHAR(12),
  pan_number VARCHAR(10),
  school_id UUID REFERENCES schools(id) NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Linking table for parent-student relationship
CREATE TABLE parent_student (
  parent_id UUID REFERENCES parents(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (parent_id, student_id)
);
```

## Business Rules

### Parent-Student Relationship
- A student can have multiple parents/guardians
- One parent can be marked as primary
- Primary parent receives all communications
- Parent must have valid contact information

### Validation Rules
1. Phone number required and valid
2. Email must be unique if provided
3. Relationship must be valid enum
4. Aadhar number must be 12 digits if provided

## UI Components

### Parent List
- Search and filter
- View children count
- Quick contact actions

### Parent Form
- Personal information
- Contact details
- Professional information
- Address information

### Parent Profile
- Personal details
- Linked students
- Communication history
- Fee payment history

## Acceptance Criteria
- [ ] Parent can be created and edited
- [ ] Parent can be linked to students
- [ ] Primary parent can be marked
- [ ] Parent contact info is searchable
- [ ] Parent account creation works
- [ ] Multiple children display correctly
