import { termsHe } from '../app/i18n/terms.he'
import { termsEn } from '../app/i18n/terms.en'

// Global state for current language
let currentLang: 'he' | 'en' = 'he'

// Terms dictionary
const termsDictionary = {
  he: termsHe,
  en: termsEn
}

// Function to get current terms
export function getCurrentTerms() {
  return termsDictionary[currentLang]
}

// Function to set current language (called from I18nService)
export function setEntityCaptionLanguage(lang: 'he' | 'en') {
  currentLang = lang
}

// Helper function to get a term
export function t(key: keyof typeof termsHe): string {
  const terms = getCurrentTerms()
  return (terms[key] as string) || key
}

// Entity field captions
export const entityCaptions = {
  // User
  name: () => t('username'),
  admin: () => t('admin'),
  secretary: () => t('secretary'),
  donator: () => t('donator'),
  disabled: () => t('disabled'),
  commission: () => currentLang === 'he' ? 'עמלה (%)' : 'Commission (%)',
  userSettings: () => currentLang === 'he' ? 'הגדרות' : 'Settings',

  // Donor
  title: () => 'תואר', // TODO: add to terms
  firstName: () => t('firstName'),
  lastName: () => t('lastName'),
  suffix: () => 'סיומת', // TODO: add to terms
  nickname: () => 'כינוי', // TODO: add to terms
  wifeName: () => 'שם האשה', // TODO: add to terms
  wifeTitle: () => 'תואר האשה', // TODO: add to terms
  wifeTitleEnglish: () => 'תואר באנגלית בן/בת זוג', // TODO: add to terms
  wifeNameEnglish: () => 'שם באנגלית בן/בת זוג', // TODO: add to terms
  titleEnglish: () => 'תואר באנגלית', // TODO: add to terms
  firstNameEnglish: () => 'שם פרטי באנגלית', // TODO: add to terms
  lastNameEnglish: () => 'שם משפחה באנגלית', // TODO: add to terms
  suffixEnglish: () => 'סיומת באנגלית', // TODO: add to terms
  idNumber: () => t('idNumber'),
  email: () => t('email'),
  phone: () => t('phone'),
  additionalPhone: () => 'טלפון נוסף', // TODO: add to terms
  countryId: () => 'מזהה מדינה', // TODO: add to terms
  country: () => t('country'),
  homePlaceId: () => 'מזהה כתובת מגורים', // TODO: add to terms
  homePlace: () => 'כתובת מגורים', // TODO: add to terms
  vacationPlaceId: () => 'מזהה כתובת נופש', // TODO: add to terms
  vacationPlace: () => 'כתובת נופש', // TODO: add to terms

  // Donation
  amount: () => t('amount'),
  currency: () => t('currency'),
  donor: () => t('donor'),
  donorId: () => 'תורם ID', // TODO: add to terms
  campaign: () => t('campaign'),
  campaignId: () => 'קמפיין ID', // TODO: add to terms
  donationMethod: () => 'אמצעי תשלום', // TODO: add to terms
  donationMethodId: () => 'אמצעי תשלום ID', // TODO: add to terms
  notes: () => t('notes'),
  reason: () => 'סיבה', // TODO: add to terms
  isExceptional: () => 'תרומה חריגה', // TODO: add to terms
  isUrgent: () => 'חדר תה', // TODO: add to terms
  fundraiserId: () => 'מתרים ID', // TODO: add to terms
  partnerIds: () => 'שותפים לתרומה', // TODO: add to terms
  bankName: () => 'שם ח"ן', // TODO: add to terms
  checkNumber: () => 'מספר צק', // TODO: add to terms
  voucherNumber: () => 'מספר שובר', // TODO: add to terms
  isAnonymous: () => t('isAnonymous'),
  receiptIssued: () => t('receiptIssued'),
  receiptNumber: () => t('receiptNumber'),
  receiptDate: () => 'תאריך הוצאת אישור', // TODO: add to terms
  donationDate: () => t('donationDate'),
  hebrewDate: () => t('hebrewDate'),
  createdDate: () => t('createdDate'),
  updatedDate: () => t('updatedDate'),
  createdBy: () => 'נוצר על ידי', // TODO: add to terms
  status: () => t('status'),

  // Campaign
  campaignName: () => t('campaignName'),
  description: () => t('description'),
  targetAmount: () => t('targetAmount'),
  // Note: raisedAmount removed - now calculated on demand
  startDate: () => t('startDate'),
  endDate: () => t('endDate'),
  category: () => t('category'),
  imageUrl: () => t('imageUrl'),
  websiteUrl: () => t('websiteUrl'),
  internalNotes: () => t('internalNotes'),
  isActive: () => t('isActive'),
  isPublic: () => 'מוצג באתר', // TODO: add to terms
  managerId: () => 'אחראי ID', // TODO: add to terms
  manager: () => t('manager'),
}
