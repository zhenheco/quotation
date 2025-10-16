# Quotation System Implementation

## Overview
A complete quotation management system built with Next.js 15, TypeScript, Supabase, and next-intl for internationalization.

## Completed Features

### 1. Customer Management
**Location:** `/app/[locale]/customers/`

**Pages:**
- **List Page** (`page.tsx`) - Display all customers with search functionality
- **Create Page** (`new/page.tsx`) - Create new customer
- **Edit Page** (`[id]/page.tsx`) - Edit existing customer

**Features:**
- Bilingual support (Chinese/English) for customer names and addresses
- Email and phone validation
- Search/filter functionality
- Delete with confirmation modal
- Empty state handling

**Components:**
- `CustomerList.tsx` - Client component for listing and managing customers
- `CustomerForm.tsx` - Reusable form for create/edit operations

---

### 2. Product Management
**Location:** `/app/[locale]/products/`

**Pages:**
- **List Page** (`page.tsx`) - Display all products with search functionality
- **Create Page** (`new/page.tsx`) - Create new product
- **Edit Page** (`[id]/page.tsx`) - Edit existing product

**Features:**
- Bilingual support (Chinese/English) for product names and descriptions
- Multi-currency support (TWD, USD, EUR, JPY, CNY)
- Category classification
- Search/filter functionality
- Delete with confirmation modal
- Empty state handling

**Components:**
- `ProductList.tsx` - Client component for listing and managing products
- `ProductForm.tsx` - Reusable form for create/edit operations

---

### 3. Quotation Management
**Location:** `/app/[locale]/quotations/`

**Pages:**
- **List Page** (`page.tsx`) - Display all quotations with status filtering
- **Detail Page** (`[id]/page.tsx`) - View complete quotation details
- **Create Page** (`new/page.tsx`) - Create new quotation

**Features:**
- Customer selection from existing customers
- Product selection with automatic pricing
- Multiple line items with quantity, unit price, and discount
- Automatic subtotal/tax/total calculation
- Status workflow: draft → sent → accepted/rejected
- Date range validation (issue date, valid until)
- Multi-currency support
- Notes/terms section
- Status filtering in list view
- Delete with confirmation (cascade delete items)

**Components:**
- `QuotationList.tsx` - Client component for listing and managing quotations
- `QuotationForm.tsx` - Complex form for creating quotations with line items
- `QuotationDetail.tsx` - Detailed view with status update actions

---

## Reusable UI Components
**Location:** `/components/ui/`

1. **PageHeader.tsx**
   - Page title and description
   - Optional action button (e.g., "Create New")

2. **FormInput.tsx**
   - Standard form input with label, validation, and error display
   - Supports text, email, tel, number, date, textarea types

3. **BilingualFormInput.tsx**
   - Side-by-side Chinese/English input fields
   - Maintains consistent styling with FormInput
   - Supports text and textarea types

4. **DeleteConfirmModal.tsx**
   - Reusable confirmation dialog
   - Loading state support
   - Customizable title, description, and button text

5. **EmptyState.tsx**
   - Friendly empty state display
   - Icon, title, description, and optional action button

6. **LoadingSpinner.tsx**
   - Animated loading indicator
   - Multiple sizes (sm, md, lg)

---

## Internationalization (i18n)

### Supported Languages
- English (`en`)
- Traditional Chinese (`zh`)

### Translation Files
- `/messages/en.json` - English translations
- `/messages/zh.json` - Traditional Chinese translations

### Translation Keys Structure
```
common - Shared UI elements
auth - Authentication
nav - Navigation
dashboard - Dashboard page
quotation - Quotation management
customer - Customer management
product - Product management
currency - Currency codes
status - Quotation statuses
```

### Usage Examples

**Server Components:**
```typescript
import { getTranslations } from 'next-intl/server'
const t = await getTranslations()
<h1>{t('customer.title')}</h1>
```

**Client Components:**
```typescript
import { useTranslations } from 'next-intl'
const t = useTranslations()
<button>{t('common.save')}</button>
```

---

## Database Schema

### Customers Table
```sql
- id: uuid (primary key)
- user_id: uuid (foreign key to auth.users)
- name: jsonb { zh: string, en: string }
- email: text
- phone: text (nullable)
- address: jsonb { zh: string, en: string } (nullable)
- created_at: timestamp
- updated_at: timestamp
```

### Products Table
```sql
- id: uuid (primary key)
- user_id: uuid (foreign key to auth.users)
- name: jsonb { zh: string, en: string }
- description: jsonb { zh: string, en: string } (nullable)
- base_price: numeric
- base_currency: text
- category: text (nullable)
- created_at: timestamp
- updated_at: timestamp
```

### Quotations Table
```sql
- id: uuid (primary key)
- user_id: uuid (foreign key to auth.users)
- customer_id: uuid (foreign key to customers)
- quotation_number: text (unique)
- issue_date: date
- valid_until: date
- status: text (draft | sent | accepted | rejected)
- currency: text
- subtotal: numeric
- tax_rate: numeric
- tax_amount: numeric
- total_amount: numeric
- notes: text (nullable)
- created_at: timestamp
- updated_at: timestamp
```

### Quotation Items Table
```sql
- id: uuid (primary key)
- quotation_id: uuid (foreign key to quotations, cascade delete)
- product_id: uuid (foreign key to products)
- quantity: numeric
- unit_price: numeric
- discount: numeric
- subtotal: numeric
- line_order: integer
- created_at: timestamp
```

---

## Project Structure

```
app/[locale]/
├── customers/
│   ├── page.tsx                 # List customers
│   ├── new/page.tsx             # Create customer
│   ├── [id]/page.tsx            # Edit customer
│   ├── CustomerList.tsx         # List component
│   └── CustomerForm.tsx         # Form component
├── products/
│   ├── page.tsx                 # List products
│   ├── new/page.tsx             # Create product
│   ├── [id]/page.tsx            # Edit product
│   ├── ProductList.tsx          # List component
│   └── ProductForm.tsx          # Form component
├── quotations/
│   ├── page.tsx                 # List quotations
│   ├── new/page.tsx             # Create quotation
│   ├── [id]/page.tsx            # View quotation
│   ├── [id]/QuotationDetail.tsx # Detail component
│   ├── QuotationList.tsx        # List component
│   └── QuotationForm.tsx        # Form component
└── dashboard/
    ├── layout.tsx               # Dashboard layout
    └── page.tsx                 # Dashboard overview

components/ui/
├── PageHeader.tsx
├── FormInput.tsx
├── BilingualFormInput.tsx
├── DeleteConfirmModal.tsx
├── EmptyState.tsx
└── LoadingSpinner.tsx

messages/
├── en.json                      # English translations
└── zh.json                      # Chinese translations
```

---

## Key Technical Decisions

### 1. Server Components First
- All pages use Server Components by default for data fetching
- Client Components only for interactive features (forms, modals, etc.)
- Marked with `export const dynamic = 'force-dynamic'` to ensure fresh data

### 2. Bilingual Data Storage
- Used JSONB columns for bilingual fields (name, description, address)
- Format: `{ zh: "中文內容", en: "English content" }`
- Displayed based on current locale: `data.name[locale]`

### 3. Form Handling
- Separated form components for reusability
- Client-side validation with HTML5 attributes
- Error state management with local state
- Loading states during submission

### 4. Data Relationships
- Quotations reference customers and products via foreign keys
- Quotation items have cascade delete on quotation deletion
- Join queries used to fetch related data efficiently

### 5. Authentication
- All pages check for authenticated user
- Redirect to login if not authenticated
- Row-level security through user_id filtering

---

## Usage Examples

### Creating a Customer
1. Navigate to `/[locale]/customers`
2. Click "Create Customer" button
3. Fill in bilingual name (required)
4. Add email (required), phone (optional), address (optional)
5. Submit form
6. Redirected to customer list

### Creating a Quotation
1. Navigate to `/[locale]/quotations`
2. Click "Create Quotation" button
3. Select customer from dropdown
4. Choose currency and dates
5. Add line items:
   - Select product (auto-fills unit price)
   - Enter quantity
   - Optional discount
   - Subtotal calculates automatically
6. Adjust tax rate if needed
7. Add notes (optional)
8. Submit form

### Quotation Workflow
1. **Draft** - Initial state, can be edited
2. **Sent** - Mark as sent to customer
3. **Accepted** - Customer accepted the quotation
4. **Rejected** - Customer rejected the quotation

---

## Best Practices Applied

1. **Component Modularity** - Reusable UI components
2. **Type Safety** - TypeScript interfaces for all data structures
3. **Internationalization** - Full bilingual support
4. **Error Handling** - Try-catch blocks with user-friendly messages
5. **Loading States** - Visual feedback during async operations
6. **Empty States** - Helpful messages when no data exists
7. **Confirmation Dialogs** - Prevent accidental deletions
8. **Consistent Styling** - Tailwind CSS utility classes
9. **Accessibility** - Semantic HTML, proper labels
10. **Performance** - Server-side rendering, efficient queries

---

## Future Enhancements

1. **PDF Export** - Generate PDF quotations
2. **Email Integration** - Send quotations via email
3. **Templates** - Save quotation templates
4. **Analytics** - Dashboard with charts and statistics
5. **Advanced Search** - Full-text search across all fields
6. **Bulk Operations** - Select multiple items for batch actions
7. **Audit Trail** - Track all changes to quotations
8. **Custom Fields** - User-defined fields for customers/products
9. **Multi-user** - Team collaboration features
10. **API Integration** - REST API for external systems

---

## Version Information

- **Next.js**: 15.x (App Router)
- **React**: 19.x
- **TypeScript**: 5.x
- **Tailwind CSS**: 3.x
- **Supabase**: Latest
- **next-intl**: Latest

---

**Last Updated:** 2025-10-16
**Author:** Claude Code Agent
