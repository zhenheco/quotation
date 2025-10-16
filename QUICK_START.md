# Quick Start Guide

## Prerequisites
- Node.js 18+ installed
- Supabase account and project set up
- Environment variables configured

## Installation

1. **Install dependencies:**
```bash
npm install
```

2. **Set up environment variables:**
Create a `.env.local` file with:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. **Run database migrations:**
Execute the SQL schema in your Supabase project:
```bash
# Apply the schema from supabase-schema.sql
```

4. **Start development server:**
```bash
npm run dev
```

5. **Access the application:**
- English: `http://localhost:3000/en/dashboard`
- Chinese: `http://localhost:3000/zh/dashboard`

## First Steps

### 1. Sign In
- Navigate to the login page
- Sign in with Google authentication
- You'll be redirected to the dashboard

### 2. Create Your First Customer
1. Click "Customers" in the sidebar
2. Click "Create Customer" button
3. Fill in the form:
   - Name (both Chinese and English)
   - Email (required)
   - Phone (optional)
   - Address (optional, both languages)
4. Click "Save"

**Example Customer:**
```
Name (ZH): 測試公司
Name (EN): Test Company
Email: test@example.com
Phone: +886 2 1234 5678
Address (ZH): 台北市信義區信義路五段7號
Address (EN): No. 7, Sec. 5, Xinyi Rd., Xinyi Dist., Taipei City
```

### 3. Create Your First Product
1. Click "Products" in the sidebar
2. Click "Create Product" button
3. Fill in the form:
   - Name (both Chinese and English)
   - Description (optional, both languages)
   - Price (required)
   - Currency (select from dropdown)
   - Category (optional)
4. Click "Save"

**Example Product:**
```
Name (ZH): 網站開發服務
Name (EN): Website Development Service
Description (ZH): 專業的網站設計和開發服務
Description (EN): Professional website design and development service
Price: 50000
Currency: TWD
Category: Service
```

### 4. Create Your First Quotation
1. Click "Quotations" in the sidebar
2. Click "Create Quotation" button
3. Select customer from dropdown
4. Choose currency (TWD, USD, EUR, JPY, or CNY)
5. Set issue date and valid until date
6. Add line items:
   - Click "Add Item"
   - Select product
   - Enter quantity
   - Unit price auto-fills from product
   - Add discount if needed
   - Subtotal calculates automatically
7. Adjust tax rate (default 5%)
8. Add notes (optional)
9. Click "Save"

**The system will automatically:**
- Calculate line item subtotals
- Calculate total tax amount
- Calculate final total amount
- Generate a unique quotation number

### 5. Manage Quotation Status
1. Open a quotation from the list
2. Click the status action buttons:
   - **Draft → Sent**: Ready to send to customer
   - **Sent → Accepted**: Customer accepted
   - **Sent → Rejected**: Customer rejected
   - **Any → Draft**: Reset to draft

## Features Overview

### Customer Management
- ✅ Bilingual customer information (Chinese/English)
- ✅ Search customers by name or email
- ✅ Edit customer details
- ✅ Delete customers (with confirmation)
- ✅ View all customers in a table

### Product Management
- ✅ Bilingual product catalog (Chinese/English)
- ✅ Multi-currency pricing
- ✅ Product categories
- ✅ Search products by name or category
- ✅ Edit product details
- ✅ Delete products (with confirmation)

### Quotation Management
- ✅ Create quotations with multiple line items
- ✅ Select from existing customers and products
- ✅ Automatic price calculations
- ✅ Discount support per line item
- ✅ Tax rate configuration
- ✅ Status workflow (Draft → Sent → Accepted/Rejected)
- ✅ Filter by status
- ✅ View detailed quotation
- ✅ Delete quotations (with confirmation)

### Language Support
- 🇺🇸 English
- 🇹🇼 Traditional Chinese
- Switch languages using the language toggle in the navbar

## Navigation

### Sidebar Menu
- **Dashboard** - Overview with statistics
- **Quotations** - Manage all quotations
- **Customers** - Manage customer database
- **Products** - Manage product catalog

### Navbar
- **Language Toggle** - Switch between English and Chinese
- **Sign Out** - Log out of the application

## Tips

1. **Create customers and products first** before creating quotations
2. **Use the search feature** to quickly find customers or products
3. **Bilingual data** allows you to serve both local and international clients
4. **Status workflow** helps track quotation progress
5. **Tax rate** can be adjusted per quotation (default 5%)
6. **Discounts** can be applied to individual line items

## Keyboard Shortcuts

- **Tab** - Navigate through form fields
- **Enter** - Submit forms
- **Esc** - Close modals

## Common Tasks

### Update Customer Information
1. Go to Customers page
2. Click "Edit" on the customer row
3. Update information
4. Click "Save"

### Add Multiple Products to Quotation
1. In quotation form, click "Add Item" for each product
2. Select different products from the dropdown
3. Set quantity and price for each
4. All subtotals calculate automatically

### Change Quotation Currency
1. Edit the quotation
2. Select new currency from dropdown
3. All amounts remain the same (no conversion)
4. Save changes

## Troubleshooting

### Can't create quotation?
- Make sure you have at least one customer created
- Make sure you have at least one product created

### Data not loading?
- Check Supabase connection
- Verify environment variables are set
- Check browser console for errors

### Bilingual fields not saving?
- Make sure both language fields are filled
- Check that JSONB columns are properly configured in Supabase

## Support

For issues or questions:
1. Check the IMPLEMENTATION.md for detailed technical information
2. Review the database schema in supabase-schema.sql
3. Check browser console for error messages

---

**Happy quoting!** 🎉
