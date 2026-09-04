# Phase 3: Academics

## Duration

3 weeks

## Objectives

- Implement Subject management
- Build Attendance system
- Create Timetable module
- Implement Exam management

## Deliverables

### Week 1: Subjects & Attendance

1. **Subject Management**
   - CRUD operations for subjects
   - Subject-class mapping
   - Subject-teacher assignment
   - Subject categorization

2. **Attendance System**
   - Daily attendance marking
   - Bulk attendance marking
   - Attendance reports
   - Parent notifications

### Week 2: Timetable

1. **Timetable Management**
   - Create class timetables
   - Teacher schedule management
   - Period/break management
   - Conflict detection

2. **Timetable Features**
   - Visual timetable display
   - Substitute teacher handling
   - Timetable printing
   - Schedule changes

### Week 3: Examinations

1. **Exam Management**
   - Create exam schedules
   - Define exam types
   - Set marks/grading criteria
   - Exam notifications

2. **Exam Features**
   - Exam timetable
   - Hall ticket generation
   - Exam center management

## Technical Implementation

### API Endpoints

```
# Subjects
GET    /api/v1/subjects
POST   /api/v1/subjects
PUT    /api/v1/subjects/:id
DELETE /api/v1/subjects/:id

# Attendance
GET    /api/v1/attendance?date=&class_id=
POST   /api/v1/attendance
PUT    /api/v1/attendance/:id
GET    /api/v1/attendance/report

# Timetable
GET    /api/v1/timetable?class_id=
POST   /api/v1/timetable
PUT    /api/v1/timetable/:id
DELETE /api/v1/timetable/:id

# Exams
GET    /api/v1/exams
POST   /api/v1/exams
PUT    /api/v1/exams/:id
DELETE /api/v1/exams/:id
```

### Database Schema

```sql
-- Subjects
CREATE TABLE subjects (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  code VARCHAR(50) UNIQUE,
  class_id UUID REFERENCES classes(id),
  teacher_id UUID REFERENCES teachers(id)
);

-- Attendance
CREATE TABLE attendance (
  id UUID PRIMARY KEY,
  student_id UUID REFERENCES students(id),
  date DATE,
  status VARCHAR(20), -- present, absent, late, excused
  marked_by UUID REFERENCES teachers(id),
  UNIQUE(student_id, date)
);

-- Timetable
CREATE TABLE timetable (
  id UUID PRIMARY KEY,
  class_id UUID REFERENCES classes(id),
  subject_id UUID REFERENCES subjects(id),
  teacher_id UUID REFERENCES teachers(id),
  day_of_week INTEGER,
  start_time TIME,
  end_time TIME,
  room_number VARCHAR(50)
);

-- Exams
CREATE TABLE exams (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  type VARCHAR(50),
  class_id UUID REFERENCES classes(id),
  subject_id UUID REFERENCES subjects(id),
  start_date DATE,
  end_date DATE,
  total_marks INTEGER,
  passing_marks INTEGER
);
```

### UI Pages

- /subjects - Subject list
- /attendance/mark - Mark attendance
- /attendance/report - Attendance reports
- /timetable - View/manage timetable
- /exams - Exam management

## Features

### Attendance

- Calendar view for attendance
- Quick mark with status buttons
- Auto-save functionality
- Filter by class/section/date
- Export attendance reports

### Timetable

- Drag-and-drop interface
- Color-coded by subject
- Print-friendly view
- Mobile-responsive

### Exams

- Exam creation wizard
- Marks entry interface
- Grade calculation
- Report card generation

## Acceptance Criteria

- [ ] Attendance can be marked for entire class
- [ ] Timetable displays correctly
- [ ] No scheduling conflicts allowed
- [ ] Exam marks can be entered
- [ ] Attendance reports generate correctly
- [ ] Parent notifications sent for absence
- [ ] All validations in place

## Dependencies

- Phase 2 completed
- Students and Teachers modules ready
- Classes and Sections configured

## Risks & Mitigations

| Risk                           | Impact | Mitigation                            |
| ------------------------------ | ------ | ------------------------------------- |
| Attendance marking performance | High   | Optimize queries, use bulk operations |
| Timetable conflicts            | High   | Implement conflict detection          |
| Exam scheduling overlaps       | Medium | Validation rules                      |
