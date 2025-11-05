# Platform Modal Standard - Navigation Header Theme

## 🎯 Core Principle
Every modal in the platform should include the **Modal Navigation Header** component as the standard interface pattern, providing:
- Dynamic search with 300ms debouncing
- Record navigation (previous/next)
- Advanced filtering with "include" and "exclude" options
- Consistent user experience across all data views

## 📐 Standard Modal Structure

```html
<!-- Standard Modal Template -->
<div class="modal-overlay" (click)="closeModal($event)">
  <div class="modal-content [entity-name]-modal" (click)="$event.stopPropagation()">
    
    <!-- REQUIRED: Navigation Header -->
    <app-modal-navigation-header
      [title]="modalTitle"
      [records]="allRecords"
      [currentRecordId]="currentRecord?.id || ''"
      [filterOptions]="filterOptions"
      [placeholder]="searchPlaceholder"
      (recordSelected)="onRecordSelected($event)"
      (searchChanged)="onSearchChanged($event)"
      (filtersChanged)="onFiltersChanged($event)"
      (navigateNext)="onNavigateNext()"
      (navigatePrevious)="onNavigatePrevious()">
    </app-modal-navigation-header>
    
    <!-- Modal Header with Entity Info -->
    <div class="modal-header">
      <!-- Entity-specific header content -->
    </div>
    
    <!-- Modal Body -->
    <div class="modal-body">
      <!-- Entity-specific content -->
    </div>
    
    <!-- Modal Footer with Actions -->
    <div class="modal-footer">
      <div class="footer-actions-left">
        <!-- Quick Actions (entity-specific) -->
        <!-- Admin Actions -->
      </div>
      <div class="footer-actions-right">
        <!-- Save/Cancel buttons -->
      </div>
    </div>
  </div>
</div>
```

## 🔧 Implementation Examples

### 1. Donation Details Modal
```typescript
export class DonationDetailsModalComponent implements OnInit {
  allDonations: NavigationRecord[] = [];
  filterOptions: FilterOption[] = [
    { key: 'amount', label: 'סכום', type: 'amount' },
    { key: 'paymentMethod', label: 'אמצעי תשלום', type: 'select', 
      options: [
        { value: 'cash', label: 'מזומן' },
        { value: 'check', label: 'צ׳ק' },
        { value: 'credit', label: 'אשראי' },
        { value: 'transfer', label: 'העברה' }
      ]
    },
    { key: 'campaign', label: 'קמפיין', type: 'select', options: [] },
    { key: 'donationDate', label: 'תאריך', type: 'range' },
    { key: 'isRecurring', label: 'תרומה חוזרת', type: 'boolean' }
  ];

  async ngOnInit() {
    await this.loadAllDonations();
    this.setupFilterOptions();
  }

  private async loadAllDonations() {
    const donations = await this.donationRepo.find({
      orderBy: { donationDate: 'desc' }
    });
    
    this.allDonations = donations.map(donation => ({
      ...donation,
      id: donation.id,
      displayName: `₪${donation.amount} - ${donation.donorName} - ${donation.donationDate}`
    }));
  }
}
```

### 2. Campaign Modal
```typescript
export class CampaignDetailsModalComponent implements OnInit {
  allCampaigns: NavigationRecord[] = [];
  filterOptions: FilterOption[] = [
    { key: 'status', label: 'סטטוס', type: 'select',
      options: [
        { value: 'active', label: 'פעיל' },
        { value: 'completed', label: 'הושלם' },
        { value: 'paused', label: 'מושהה' }
      ]
    },
    { key: 'targetAmount', label: 'יעד', type: 'amount' },
    { key: 'raisedAmount', label: 'גויס', type: 'amount' },
    { key: 'startDate', label: 'תחילה', type: 'range' },
    { key: 'endDate', label: 'סיום', type: 'range' }
  ];
}
```

### 3. Standing Order Modal
```typescript
export class StandingOrderModalComponent implements OnInit {
  allOrders: NavigationRecord[] = [];
  filterOptions: FilterOption[] = [
    { key: 'isActive', label: 'פעיל', type: 'boolean' },
    { key: 'frequency', label: 'תדירות', type: 'select',
      options: [
        { value: 'monthly', label: 'חודשי' },
        { value: 'quarterly', label: 'רבעוני' },
        { value: 'yearly', label: 'שנתי' }
      ]
    },
    { key: 'amount', label: 'סכום', type: 'amount' },
    { key: 'nextPaymentDate', label: 'תשלום הבא', type: 'range' }
  ];
}
```

## 🎨 Styling Standards

### Required SCSS Structure
```scss
.entity-modal {
  width: 90vw;
  max-width: 1200px;
  max-height: 90vh;
  background: white;
  border-radius: 16px;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  position: relative;
  animation: slideIn 0.3s ease-out;
  
  // Navigation header positioning
  app-modal-navigation-header {
    border-radius: 16px 16px 0 0;
    margin-bottom: 0;
    position: relative;
    z-index: 1000;
  }
}

.modal-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 24px 32px;
  // Entity-specific styling
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  overflow-x: visible;
  padding: 32px;
  background: #fafbfc;
  position: relative;
  z-index: 1;
}

.modal-footer {
  background: #f8f9fa;
  padding: 20px 32px;
  border-top: 1px solid #e1e8ed;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  border-radius: 0 0 16px 16px;
  
  .quick-action-btn {
    border-color: #2196F3;
    color: #2196F3;
    
    &:hover {
      background: rgba(33, 150, 243, 0.08);
    }
  }
  
  .footer-divider {
    width: 1px;
    height: 30px;
    background: #d0d0d0;
    margin: 0 12px;
  }
}
```

## 📋 Filter Types Reference

### 1. Boolean Filter
```typescript
{ key: 'isActive', label: 'פעיל', type: 'boolean' }
```

### 2. Select Filter
```typescript
{ 
  key: 'status', 
  label: 'סטטוס', 
  type: 'select',
  options: [
    { value: 'active', label: 'פעיל' },
    { value: 'inactive', label: 'לא פעיל' }
  ]
}
```

### 3. Range Filter (Age/Date)
```typescript
{ 
  key: 'age', 
  label: 'גיל', 
  type: 'range',
  min: 0,
  max: 120
}
```

### 4. Amount Filter
```typescript
{ 
  key: 'amount', 
  label: 'סכום', 
  type: 'amount'
}
```

## 🚀 Quick Implementation Checklist

For each new modal in the platform:

- [ ] Import `ModalNavigationHeaderComponent`
- [ ] Define `NavigationRecord[]` for all records
- [ ] Define `FilterOption[]` relevant to entity
- [ ] Implement load method for all records
- [ ] Add navigation event handlers
- [ ] Apply standard modal SCSS structure
- [ ] Add quick actions to footer (if applicable)
- [ ] Test search with 300ms debounce
- [ ] Test filters including "ללא" (exclude) options
- [ ] Test next/previous navigation

## 💡 Best Practices

1. **Display Name Format**: Make it descriptive and searchable
   - Donors: `"שם מלא - עיר - טלפון"`
   - Donations: `"₪סכום - שם תורם - תאריך"`
   - Campaigns: `"שם קמפיין - יעד - סטטוס"`

2. **Filter Selection**: Include the most commonly used filters
   - Always include status/active filters
   - Include date ranges where relevant
   - Include amount filters for financial entities
   - Include relationship filters (אנ"ש, תלמידנו, etc.)

3. **Performance**: 
   - Load all records once on init
   - Let the component handle filtering client-side
   - Use debouncing (already built-in at 300ms)

4. **Accessibility**:
   - All buttons should have tooltips
   - Use semantic HTML
   - Support keyboard navigation
   - Maintain RTL support

## 🔄 Migration Guide

To convert existing modals to the new standard:

1. **Add Navigation Header** as first element in modal
2. **Move any inline search** to use the header search
3. **Convert any custom filters** to FilterOption format
4. **Restructure footer** to include quick actions on left
5. **Apply standard SCSS** classes and structure
6. **Test all functionality** including new navigation features

## 📊 Platform Consistency Benefits

- **Unified Experience**: Users learn once, use everywhere
- **Reduced Development**: Reusable component = less code
- **Better Performance**: Optimized search and filtering
- **Enhanced Productivity**: Quick navigation between records
- **Professional Look**: Consistent, modern design language

---

This is the official modal standard for the entire donation platform. All new modals MUST follow this pattern, and existing modals should be migrated when updated.