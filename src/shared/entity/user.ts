import {
  Allow,
  BackendMethod,
  Entity,
  Fields,
  IdEntity,
  Validators,
  isBackend
} from 'remult'
import { DataControl } from '../../app/common-ui-elements/interfaces'
import { terms } from '../../app/terms'
import { Roles } from '../enum/roles'


@Entity<User>('users', {
  allowApiCrud: Allow.authenticated,
  defaultOrderBy: { admin: 'desc', secretary: 'desc', donator: 'desc', name: 'asc' },
  // allowApiRead: Allow.authenticated,
  // allowApiUpdate: Allow.authenticated,
  // allowApiDelete: false,
  // allowApiInsert: Roles.admin,
  // apiPrefilter: () =>
  //   !remult.isAllowed(Roles.admin) ? { id: [remult.user?.id!] } : {},
  saving: async (user) => {
    if (isBackend()) {
      if (user._.isNew()) {
        user.createDate = new Date()
      }
    }
  },
})
export class User extends IdEntity {

  @Fields.string({
    validate: [Validators.required, Validators.uniqueOnBackend],
    caption: terms.username,
  })
  name = ''

  @Fields.string({ includeInApi: false })
  password = ''

  @Fields.string({ caption: terms.email, inputType: 'email' })
  email = ''

  @Fields.date({
    allowApiUpdate: false,
  })
  createDate = new Date()

  @DataControl<User, boolean>({
    valueChange: (row, col) => {
      if (col.value) {
        row.secretary = false
        row.donator = false
      }
    }
  })
  @Fields.boolean({
    allowApiUpdate: Roles.admin,
    caption: terms.admin,
  })
  admin = false


  @DataControl<User, boolean>({
    valueChange: (row, col) => {
      if (col.value) {
        row.admin = false
        row.donator = false
      }
    }
  })
  @Fields.boolean({
    allowApiUpdate: Roles.admin,
    caption: terms.secretary,
  })
  secretary = false

  @DataControl<User, boolean>({
    valueChange: (row, col) => {
      if (col.value) {
        row.admin = false
        row.secretary = false
      }
    }
  })
  @Fields.boolean({
    allowApiUpdate: Roles.admin,
    caption: terms.donator,
  })
  donator = false

  @Fields.object({
    caption: "הגדרות",
    allowNull: true
  })
  settings?: {
    notificationsEnabled?: boolean;
    language?: string;
    theme?: string;
    openModal: string; // 'route' | 'dialog'
    calendar_heb_holidays_jews_enabled: boolean;
    calendar_open_heb_and_eng_parallel: boolean;
    globalFilters?: any; // Store global filter preferences
    sidebarMode?: 'open' | 'close'; // Sidebar state preference
    currencyRates?: {
      USD?: number; // Default: 3.7
      EUR?: number; // Default: 4.0
      GBP?: number; // Default: 4.5
    };
    mapSettings?: {
      fullscreen?: boolean;
      filters?: {
        statusFilter?: string[]; // ['active', 'inactive', 'high-donor', 'recent-donor']
        hasCoordinates?: boolean | null; // true = only with coords, false = only without, null = all
        minTotalDonations?: number;
        maxTotalDonations?: number;
        minDonationCount?: number;
        hasRecentDonation?: boolean | null; // donated in last 3 months
        searchTerm?: string;
      };
    };
    donorList?: {
      sort?: Array<{ field: string; direction: 'asc' | 'desc' }>;
      searchTerm?: string;
    };
    reminderList?: {
      sort?: Array<{ field: string; direction: 'asc' | 'desc' }>;
      searchTerm?: string;
    };
    certificateList?: {
      sort?: Array<{ field: string; direction: 'asc' | 'desc' }>;
    };
    reports?: {
      lastSelectedTab?: 'general' | 'donations' | 'payments' | 'yearly' | 'blessings' | 'personalDonor';
      filtersExpanded?: boolean;
      pageSize?: number;
      donationFilters?: {
        groupBy?: string;
        showDonorAddress?: boolean;
        showDonorPhone?: boolean;
        showDonorEmail?: boolean;
        showActualPayments?: boolean;
        showCurrencySummary?: boolean;
        showDonationDetails?: boolean;
      };
    };
    globalSearch?: {
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      minimized?: boolean;
    };
    googleSync?: {
      conflictResolution?: 'platform_wins' | 'google_wins' | 'newest_wins' | 'manual';
      autoSync?: boolean;
    };
  };

  @Fields.number({
    allowApiUpdate: Roles.admin,
    caption: 'עמלה (%)',
    validate: (value: number) => {
      if (value < 0 || value > 100) {
        throw new Error('עמלה חייבת להיות בין 0 ל-100 אחוזים');
      }
    }
  })
  commission = 0

  @Fields.boolean({
    allowApiUpdate: Roles.admin,
    caption: terms.disabled,
  })
  disabled = false

  async hashAndSetPassword(password: string) {
    this.password = (await import('password-hash')).generate(password)
  }
  async passwordMatches(password: string) {
    return (
      !this.password ||
      (await import('password-hash')).verify(password, this.password)
    )
  }
  @BackendMethod({ allowed: Roles.admin })
  async resetPassword() {
    this.password = ''
    await this.save()
  }
}
