# 08 - UI SYSTEM

> UI design system. Consistency is key.

---

## Design Principles

1. **Clarity** - Information hierarchy is clear
2. **Consistency** - Uniform patterns across the app
3. **Efficiency** - Minimize clicks to complete tasks
4. **Accessibility** - WCAG 2.1 AA compliant
5. **Responsive** - Works on all screen sizes

## Tech Stack

| Tool | Purpose |
|------|---------|
| Tailwind CSS | Styling |
| shadcn/ui | Base components |
| Radix UI | Primitives |
| Lucide React | Icons |
| class-variance-authority | Variants |
| clsx | Conditional classes |
| tailwind-merge | Class merging |

## Color System

```css
/* Primary */
--primary-500: #3b82f6;
--primary-600: #2563eb;

/* Semantic */
--success: #10b981;
--warning: #f59e0b;
--error: #ef4444;
--info: #3b82f6;

/* Neutral */
--gray-50: #f9fafb;
--gray-100: #f3f4f6;
--gray-900: #111827;
```

## Core Components

### Button
- Variants: primary, secondary, outline, ghost, danger
- Sizes: sm, md, lg
- States: default, loading, disabled

### Input
- Label always visible
- Error messages below
- Placeholder for hints

### Card
- Header, Content, Footer sections
- Consistent padding (p-6)

### Table
- Responsive (horizontal scroll)
- Loading and empty states
- Sortable columns

### Modal
- Accessible (focus trap)
- Close on escape
- Overlay click closes

## Layout Rules

### Sidebar
- Fixed width: 256px
- Dark background (gray-900)
- Active state highlighted

### Main Content
- Padding: 24px
- Max-width: 1280px
- Centered

### Responsive Breakpoints
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

## Form Rules

1. Labels always visible (not just placeholders)
2. Validation on blur
3. Clear error messages
4. Required fields marked
5. Logical tab order

## Forbidden Patterns

- Do not create new component libraries
- Do not use inline styles
- Do not use !important
- Do not skip loading states
- Do not skip empty states

---

> **Remember:** Use existing shadcn/ui components. Do not create custom component libraries.
