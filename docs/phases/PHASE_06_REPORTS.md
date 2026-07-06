# Phase 6: Reports

## Duration
2 weeks

## Objectives
- Implement Results management
- Build Report Card generation
- Create Analytics dashboard
- Implement Export functionality

## Deliverables

### Week 1: Results & Grading
1. **Results Management**
   - Enter exam results
   - Bulk marks entry
   - Grade calculation
   - Result approval workflow

2. **Grading System**
   - Configure grading scales
   - GPA calculation
   - Grade points mapping
   - Custom grading rules

### Week 2: Reports & Analytics
1. **Report Cards**
   - Generate report cards
   - Custom report templates
   - Print report cards
   - Digital report cards

2. **Analytics Dashboard**
   - Student performance analytics
   - Class performance analytics
   - Subject-wise analysis
   - Trend analysis

## Technical Implementation

### API Endpoints
```
# Results
GET    /api/v1/results?exam_id=&class_id=
POST   /api/v1/results
PUT    /api/v1/results/:id
POST   /api/v1/results/bulk
GET    /api/v1/results/student/:studentId

# Report Cards
GET    /api/v1/report-cards?student_id=&exam_id=
POST   /api/v1/report-cards/generate
GET    /api/v1/report-cards/:id
GET    /api/v1/report-cards/:id/pdf

# Analytics
GET    /api/v1/analytics/student/:id
GET    /api/v1/analytics/class/:id
GET    /api/v1/analytics/subject/:id
GET    /api/v1/analytics/overview

# Exports
GET    /api/v1/exports/results
GET    /api/v1/exports/attendance
GET    /api/v1/exports/students
```

### Database Schema
```sql
-- Results
CREATE TABLE results (
  id UUID PRIMARY KEY,
  student_id UUID REFERENCES students(id),
  exam_id UUID REFERENCES exams(id),
  subject_id UUID REFERENCES subjects(id),
  marks_obtained DECIMAL(5,2),
  grade VARCHAR(5),
  grade_points DECIMAL(3,2),
  remarks TEXT,
  entered_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'draft'
);

-- Grading Scales
CREATE TABLE grading_scales (
  id UUID PRIMARY KEY,
  name VARCHAR(100),
  school_id UUID REFERENCES schools(id),
  grades JSONB, -- [{min: 90, max: 100, grade: 'A+', points: 4.0}]
  is_default BOOLEAN DEFAULT false
);

-- Report Cards
CREATE TABLE report_cards (
  id UUID PRIMARY KEY,
  student_id UUID REFERENCES students(id),
  exam_id UUID REFERENCES exams(id),
  generated_at TIMESTAMP,
  generated_by UUID REFERENCES users(id),
  pdf_url VARCHAR(500)
);

-- Report Templates
CREATE TABLE report_templates (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  school_id UUID REFERENCES schools(id),
  structure JSONB,
  is_default BOOLEAN DEFAULT false
);
```

### UI Pages
- /results - Results dashboard
- /results/enter - Marks entry
- /results/bulk-entry - Bulk marks entry
- /report-cards - Report card list
- /report-cards/generate - Generate report cards
- /analytics - Analytics dashboard

## Features

### Results
- Excel-like marks entry
- Auto-grade calculation
- Validation rules
- Approval workflow
- Result locking

### Report Cards
- Multiple templates
- Customizable sections
- School branding
- PDF generation
- Bulk generation

### Analytics
- Interactive charts
- Drill-down capability
- Date range filtering
- Export to Excel
- Scheduled reports

### Export Formats
- PDF
- Excel (XLSX)
- CSV
- Print-friendly

## Report Card Sections
1. Student Information
2. Attendance Summary
3. Exam Results Table
4. Grade Summary
5. Teacher Remarks
6. Principal Signature
7. School Stamp

## Acceptance Criteria
- [ ] Results can be entered and saved
- [ ] Bulk entry works correctly
- [ ] Grades calculated automatically
- [ ] Report cards generate properly
- [ ] PDF export works
- [ ] Analytics display correctly
- [ ] All exports functional
- [ ] Grading scales configurable

## Dependencies
- Phase 3 completed
- Exams module ready
- Attendance data available

## Risks & Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| PDF generation performance | Medium | Queue-based generation |
| Large dataset exports | Medium | Streaming exports |
| Grade calculation errors | High | Comprehensive testing |
