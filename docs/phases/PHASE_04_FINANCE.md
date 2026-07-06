# Phase 4: Finance

## Duration
2 weeks

## Objectives
- Implement Fee Management system
- Build Payment processing
- Create Invoice generation
- Implement Financial reports

## Deliverables

### Week 1: Fee Structure & Payments
1. **Fee Structure**
   - Define fee categories
   - Create fee templates
   - Class-wise fee setup
   - Academic year fees

2. **Payment Management**
   - Record payments
   - Multiple payment methods
   - Payment receipts
   - Partial payments

### Week 2: Invoices & Reports
1. **Invoice System**
   - Auto-generate invoices
   - Invoice templates
   - Email invoices
   - Payment reminders

2. **Financial Reports**
   - Collection reports
   - Outstanding reports
   - Class-wise reports
   - Date-wise reports

## Technical Implementation

### API Endpoints
```
# Fee Structure
GET    /api/v1/fee-structures
POST   /api/v1/fee-structures
PUT    /api/v1/fee-structures/:id
DELETE /api/v1/fee-structures/:id

# Payments
GET    /api/v1/payments
POST   /api/v1/payments
GET    /api/v1/payments/:id
GET    /api/v1/payments/receipt/:id

# Invoices
GET    /api/v1/invoices
POST   /api/v1/invoices/generate
GET    /api/v1/invoices/:id
POST   /api/v1/invoices/:id/send

# Reports
GET    /api/v1/reports/fees/collection
GET    /api/v1/reports/fees/outstanding
GET    /api/v1/reports/fees/class-wise
```

### Database Schema
```sql
-- Fee Structure
CREATE TABLE fee_structures (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  class_id UUID REFERENCES classes(id),
  amount DECIMAL(10,2),
  due_date DATE,
  academic_year VARCHAR(20),
  is_recurring BOOLEAN DEFAULT false,
  recurrence_type VARCHAR(20) -- monthly, quarterly, yearly
);

-- Invoices
CREATE TABLE invoices (
  id UUID PRIMARY KEY,
  invoice_number VARCHAR(100) UNIQUE,
  student_id UUID REFERENCES students(id),
  fee_structure_id UUID REFERENCES fee_structures(id),
  total_amount DECIMAL(10,2),
  paid_amount DECIMAL(10,2) DEFAULT 0,
  due_date DATE,
  status VARCHAR(20) DEFAULT 'pending',
  academic_year VARCHAR(20)
);

-- Payments
CREATE TABLE payments (
  id UUID PRIMARY KEY,
  invoice_id UUID REFERENCES invoices(id),
  amount DECIMAL(10,2),
  payment_date TIMESTAMP,
  payment_method VARCHAR(50),
  transaction_id VARCHAR(255),
  received_by UUID REFERENCES users(id),
  notes TEXT
);

-- Fee Waivers
CREATE TABLE fee_waivers (
  id UUID PRIMARY KEY,
  student_id UUID REFERENCES students(id),
  fee_structure_id UUID REFERENCES fee_structures(id),
  percentage DECIMAL(5,2),
  reason TEXT,
  approved_by UUID REFERENCES users(id)
);
```

### UI Pages
- /fees - Fee management dashboard
- /fees/structures - Fee structure setup
- /fees/invoices - Invoice list
- /fees/payments - Payment recording
- /fees/reports - Financial reports
- /fees/receipt/:id - Print receipt

## Features

### Fee Management
- Bulk invoice generation
- Online payment integration (future)
- Payment gateway support
- Auto-reminder emails

### Reports
- Daily collection report
- Outstanding dues report
- Class-wise collection
- Payment history
- Export to Excel/PDF

### Receipts
- Professional receipt templates
- Digital receipts
- Print receipts
- Email receipts

## Acceptance Criteria
- [ ] Fee structures can be created
- [ ] Invoices generated correctly
- [ ] Payments recorded accurately
- [ ] Receipts generated properly
- [ ] Financial reports are accurate
- [ ] Partial payments handled
- [ ] Fee waivers work correctly
- [ ] All amounts calculated correctly

## Dependencies
- Phase 2 completed
- Students module ready
- User authentication working

## Risks & Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Payment calculation errors | High | Use decimal arithmetic |
| Invoice duplication | High | Unique constraints |
| Receipt formatting | Medium | Template validation |
