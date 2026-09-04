# Loop 008: Fees

## Overview

Fee module manages fee structures, invoice generation, payment collection, and financial reporting for the school.

## User Stories

### As an Admin

1. I want to create fee structures
2. I want to generate invoices
3. I want to record payments
4. I want to view financial reports

### As an Accountant

1. I want to manage fee collection
2. I want to generate receipts
3. I want to track pending payments
4. I want to reconcile payments

### As a Parent

1. I want to view my child's fees
2. I want to see payment history
3. I want to download receipts
4. I want to pay fees online (future)

## API Endpoints

```
# Fee Structures
GET    /api/v1/fee-structures
GET    /api/v1/fee-structures/:id
POST   /api/v1/fee-structures
PUT    /api/v1/fee-structures/:id
DELETE /api/v1/fee-structures/:id

# Invoices
GET    /api/v1/invoices
GET    /api/v1/invoices/:id
POST   /api/v1/invoices/generate
PUT    /api/v1/invoices/:id
POST   /api/v1/invoices/:id/send

# Payments
GET    /api/v1/payments
GET    /api/v1/payments/:id
POST   /api/v1/payments
GET    /api/v1/payments/receipt/:id

# Reports
GET    /api/v1/reports/fees/collection
GET    /api/v1/reports/fees/outstanding
GET    /api/v1/reports/fees/class-wise
```

## Database Schema

```sql
CREATE TABLE fee_structures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  class_id UUID REFERENCES classes(id),
  amount DECIMAL(10,2) NOT NULL,
  due_date DATE,
  academic_year VARCHAR(20) NOT NULL,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_type VARCHAR(20) CHECK (recurrence_type IN ('monthly', 'quarterly', 'yearly')),
  school_id UUID REFERENCES schools(id) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number VARCHAR(100) UNIQUE NOT NULL,
  student_id UUID REFERENCES students(id),
  fee_structure_id UUID REFERENCES fee_structures(id),
  total_amount DECIMAL(10,2) NOT NULL,
  paid_amount DECIMAL(10,2) DEFAULT 0,
  due_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid', 'overdue', 'cancelled')),
  academic_year VARCHAR(20),
  school_id UUID REFERENCES schools(id),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_number VARCHAR(100) UNIQUE NOT NULL,
  invoice_id UUID REFERENCES invoices(id),
  amount DECIMAL(10,2) NOT NULL,
  payment_date TIMESTAMP NOT NULL,
  payment_method VARCHAR(50) CHECK (payment_method IN ('cash', 'card', 'bank_transfer', 'cheque', 'online')),
  transaction_id VARCHAR(255),
  cheque_number VARCHAR(50),
  bank_name VARCHAR(100),
  received_by UUID REFERENCES users(id),
  notes TEXT,
  receipt_url VARCHAR(500),
  school_id UUID REFERENCES schools(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE fee_waivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id),
  fee_structure_id UUID REFERENCES fee_structures(id),
  percentage DECIMAL(5,2),
  amount DECIMAL(10,2),
  reason TEXT,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Business Rules

### Invoice Generation

- Invoice number format: INV{YEAR}{MONTH}{SEQUENCE}
- Auto-generate for all students in class
- Due date from fee structure
- Support for partial payments

### Payment Rules

- Payment number format: PAY{YEAR}{MONTH}{SEQUENCE}
- Cannot exceed invoice amount
- Multiple payments allowed
- Receipt generated for each payment

### Status Flow

```
Invoice: pending → partial → paid
                        ↓
                   overdue (after due date)

Payment: completed (immediate)
```

### Fee Waiver

- Percentage or flat amount
- Requires approval
- Applied before payment

## UI Components

### Fee Structure Form

- Name and description
- Class selector
- Amount input
- Due date picker
- Recurrence settings

### Invoice List

- Status filters
- Student/class filters
- Bulk generate option
- Export to Excel

### Payment Form

- Invoice selection
- Amount input
- Payment method
- Transaction details
- Receipt generation

### Financial Reports

- Collection summary
- Outstanding dues
- Class-wise collection
- Date-wise reports
- Export options

## Acceptance Criteria

- [ ] Fee structures can be created
- [ ] Invoices generated correctly
- [ ] Payments recorded accurately
- [ ] Receipts generated properly
- [ ] Financial reports accurate
- [ ] Partial payments handled
- [ ] Fee waivers work
- [ ] Status transitions correct
