# UI Design System

## Design Principles
1. **Clarity**: Information hierarchy is clear
2. **Consistency**: Uniform patterns across the app
3. **Efficiency**: Minimize clicks to complete tasks
4. **Accessibility**: WCAG 2.1 AA compliant
5. **Responsive**: Works on all screen sizes

## Color Palette

### Primary Colors
```css
--color-primary-50: #eff6ff;
--color-primary-100: #dbeafe;
--color-primary-200: #bfdbfe;
--color-primary-300: #93c5fd;
--color-primary-400: #60a5fa;
--color-primary-500: #3b82f6;
--color-primary-600: #2563eb;
--color-primary-700: #1d4ed8;
--color-primary-800: #1e40af;
--color-primary-900: #1e3a8a;
```

### Neutral Colors
```css
--color-gray-50: #f9fafb;
--color-gray-100: #f3f4f6;
--color-gray-200: #e5e7eb;
--color-gray-300: #d1d5db;
--color-gray-400: #9ca3af;
--color-gray-500: #6b7280;
--color-gray-600: #4b5563;
--color-gray-700: #374151;
--color-gray-800: #1f2937;
--color-gray-900: #111827;
```

### Semantic Colors
```css
--color-success: #10b981;
--color-warning: #f59e0b;
--color-error: #ef4444;
--color-info: #3b82f6;
```

## Typography

### Font Family
```css
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;
```

### Font Sizes
```css
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
--text-3xl: 1.875rem;  /* 30px */
--text-4xl: 2.25rem;   /* 36px */
```

## Spacing Scale
```css
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
```

## Components

### Buttons
```typescript
// Variants: primary, secondary, outline, ghost, danger
// Sizes: sm, md, lg

<Button variant="primary" size="md">
  Save Changes
</Button>
```

### Forms
```typescript
// Input component
<Input 
  label="Email Address"
  type="email"
  placeholder="Enter email"
  error={errors.email?.message}
  required
/>

// Select component
<Select
  label="Class"
  options={classOptions}
  value={selectedClass}
  onChange={setSelectedClass}
/>

// Checkbox
<Checkbox
  label="Remember me"
  checked={rememberMe}
  onChange={setRememberMe}
/>
```

### Tables
```typescript
<Table
  columns={[
    { key: 'name', header: 'Name', sortable: true },
    { key: 'email', header: 'Email' },
    { key: 'actions', header: 'Actions', width: '100px' }
  ]}
  data={students}
  onSort={handleSort}
  pagination={pagination}
/>
```

### Cards
```typescript
<Card>
  <CardHeader>
    <CardTitle>Student Information</CardTitle>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
  <CardFooter>
    <Button>Save</Button>
  </CardFooter>
</Card>
```

### Modals
```typescript
<Modal
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  title="Add New Student"
  size="lg"
>
  <StudentForm onSubmit={handleSubmit} />
</Modal>
```

## Layout

### Grid System
```css
/* 12-column grid */
.grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: var(--space-6);
}

.col-span-4 { grid-column: span 4; }
.col-span-6 { grid-column: span 6; }
.col-span-12 { grid-column: span 12; }
```

### Breakpoints
```css
--breakpoint-sm: 640px;
--breakpoint-md: 768px;
--breakpoint-lg: 1024px;
--breakpoint-xl: 1280px;
--breakpoint-2xl: 1536px;
```

## Icons
- Use Lucide React icons
- Consistent sizing: 16px, 20px, 24px
- inherit color from parent

## Forms
- Labels always visible (not just placeholders)
- Inline validation on blur
- Clear error messages
- Required fields marked with asterisk
- Logical tab order

## Accessibility
- All interactive elements focusable
- Focus indicators visible
- Color not sole indicator
- Alt text for images
- ARIA labels for icon buttons
- Screen reader announcements for dynamic content
