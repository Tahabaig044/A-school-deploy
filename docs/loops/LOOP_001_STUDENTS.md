# Loop 001: Students

## Overview
Student management is the core module of the School Management System. This loop covers the complete student lifecycle from admission to graduation.

## User Stories

### As an Admin
1. I want to add new students with all required information
2. I want to import students in bulk from CSV/Excel
3. I want to search and filter students by various criteria
4. I want to view student profiles with complete information
5. I want to transfer students between classes/sections
6. I want to deactivate/archive students who have left

### As a Teacher
1. I want to view students in my assigned classes
2. I want to see student contact information
3. I want to view student attendance history
4. I want to view student academic performance

### As a Parent
1. I want to view my child's profile
2. I want to update contact information
3. I want to view my child's attendance
4. I want to view my child's results

## API Endpoints

### Student CRUD
```
GET    /api/v1/students
       Query: page, limit, search, classId, sectionId, status
       Response: { data: Student[], pagination: Pagination }

GET    /api/v1/students/:id
       Response: { data: Student }

POST   /api/v1/students
       Body: CreateStudentDto
       Response: { data: Student }

PUT    /api/v1/students/:id
       Body: UpdateStudentDto
       Response: { data: Student }

DELETE /api/v1/students/:id
       Response: { message: "Student deleted" }
```

### Student Features
```
POST   /api/v1/students/import
       Body: CSV/Excel file
       Response: { imported: number, errors: Error[] }

GET    /api/v1/students/:id/attendance
       Query: startDate, endDate
       Response: { data: Attendance[] }

GET    /api/v1/students/:id/results
       Query: examId, classId
       Response: { data: Result[] }

POST   /api/v1/students/:id/transfer
       Body: { classId, sectionId, reason }
       Response: { data: Student }

POST   /api/v1/students/:id/archive
       Response: { message: "Student archived" }
```

## Database Schema

### Students Table
```sql
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  admission_number VARCHAR(50) UNIQUE NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100),
  date_of_birth DATE NOT NULL,
  gender VARCHAR(20) NOT NULL CHECK (gender IN ('male', 'female', 'other')),
  blood_group VARCHAR(10),
  nationality VARCHAR(50),
  religion VARCHAR(50),
  caste VARCHAR(50),
  phone VARCHAR(20),
  email VARCHAR(255),
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(50) DEFAULT 'India',
  emergency_contact_name VARCHAR(200),
  emergency_contact_phone VARCHAR(20),
  emergency_contact_relation VARCHAR(50),
  admission_date DATE NOT NULL,
  class_id UUID REFERENCES classes(id),
  section_id UUID REFERENCES sections(id),
  school_id UUID REFERENCES schools(id) NOT NULL,
  parent_id UUID REFERENCES parents(id),
  photo_url VARCHAR(500),
  documents JSONB DEFAULT '[]',
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'graduated', 'transferred', 'archived')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id)
);
```

### Student History Table
```sql
CREATE TABLE student_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  changes JSONB,
  performed_by UUID REFERENCES users(id),
  performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Data Validation

### CreateStudentDto
```typescript
interface CreateStudentDto {
  firstName: string;          // Required, 2-100 chars
  lastName: string;           // Required, 2-100 chars
  middleName?: string;        // Optional, 2-100 chars
  admissionNumber: string;    // Required, unique
  dateOfBirth: string;        // Required, valid date, age 3-20
  gender: 'male' | 'female' | 'other';
  bloodGroup?: string;        // Optional, valid blood group
  phone?: string;             // Optional, valid phone format
  email?: string;             // Optional, valid email
  address?: Address;
  emergencyContact: {
    name: string;
    phone: string;
    relation: string;
  };
  classId: string;            // Required, valid class
  sectionId: string;          // Required, valid section
  parentId?: string;          // Optional, valid parent
}
```

## Business Rules

### Admission Number Generation
```
Format: {YEAR}{CLASS}{SEQUENCE}
Example: 202405001 (Year 2024, Class 5, Student 001)
```

### Student Status Transitions
```
active → inactive (leave/withdrawal)
active → graduated (end of year)
active → transferred (to another school)
inactive → active (re-enrollment)
```

### Validation Rules
1. Admission number must be unique within school
2. Date of birth must be valid (age 3-20)
3. Class and section must belong to same school
4. Parent must exist if provided
5. Email must be unique if provided

## UI Components

### Student List Page
- Search bar with filters
- Data table with pagination
- Quick actions (view, edit, delete)
- Bulk selection
- Export to Excel/CSV

### Student Form
- Multi-step form
- Section-wise fields
- Photo upload
- Document upload
- Validation feedback

### Student Profile
- Tabbed interface
- Overview tab
- Attendance tab
- Results tab
- Documents tab
- History tab

## Search & Filter

### Search Fields
- Admission number
- First name
- Last name
- Phone number
- Email

### Filter Options
- Class
- Section
- Status
- Admission date range
- Gender

## Reports
1. Student list report
2. Class-wise student list
3. Gender-wise statistics
4. Admission report
5. Transfer report
6. Graduation report

## Acceptance Criteria
- [ ] Student can be created with all required fields
- [ ] Admission number auto-generated correctly
- [ ] Bulk import works for CSV/Excel
- [ ] Search returns accurate results
- [ ] Filters work independently and combined
- [ ] Student status transitions work
- [ ] Profile displays all information
- [ ] History tracks all changes
- [ ] Validation prevents invalid data
- [ ] Photos and documents can be uploaded

## Dependencies
- Authentication system
- Class/Section modules
- Parent module (optional)
- File upload service
