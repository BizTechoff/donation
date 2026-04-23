export interface LookupItem {
  id: string;
  name: string;
}

export interface ExportLookups {
  fundraisers: LookupItem[];
  secretaries: LookupItem[];
  contactPersons: LookupItem[];
}
