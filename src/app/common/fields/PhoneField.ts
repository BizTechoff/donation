import {
  FieldRef,
  Fields,
  StringFieldOptions,
  type FieldValidator,
} from 'remult'

export function OnlyAllowIsraeliPhones(_: any, ref: FieldRef<any, string>) {
  if (ref.value.startsWith('+') && !ref.value.startsWith('+972'))
    throw Error('רק טלפונים ישראלים נתמכים כרגע')
}

export function whatsappUrl(phone: string, smsMessage: string, prefix: string = '+972') {
  phone = fixPhoneInput(phone, prefix)
  if (phone.startsWith('0')) {
    phone = prefix + phone.substring(1)
  }

  if (phone.startsWith('+')) phone = phone.substring(1)

  return 'https://wa.me/' + phone + '?text=' + encodeURI(smsMessage)
}

export function sendWhatsappToPhone(phone: string, smsMessage: string, prefix: string = '+972') {
  window.open(whatsappUrl(phone, smsMessage, prefix), '_blank')
}

export function fixPhoneInput(s: string, prefix: string = '+972') {
  if (!s) return s
  let orig = s.toString().trim()

  // אם המספר כבר מכיל קידומת בינלאומית, החזר כמו שהוא
  if (orig.startsWith('+')) return orig

  s = s.toString().replace(/\D/g, '')

  // טיפול בקידומת ישראלית
  if (prefix === '+972') {
    if (s.startsWith('972')) s = s.substring(3)
    if (s.length == 9 && s[0] != '0' && s[0] != '3') s = '0' + s
    // אם מספר ישראלי מתחיל ב-0, השאר אותו כמו שהוא
    return s
  }

  // למדינות אחרות - החזר את המספר עם הקידומת הבינלאומית
  return prefix + s
}

export function isPhoneValid(input: string, prefix: string = '+972') {
  if (!input) return false

  input = input.toString().trim()

  // אם המספר מכיל קידומת בינלאומית כלשהי
  if (input.startsWith('+')) return true

  // בדיקה לפי הקידומת
  if (prefix === '+972') {
    // בדיקת תקינות למספר ישראלי
    let st1 = input.match(/^0(5\d|7\d|[1,2,3,4,6,8,9])(-{0,1}\d{3})(-*\d{4})$/)
    return st1 != null
  }

  // לשאר המדינות - בדיקה בסיסית של אורך
  const digitsOnly = input.replace(/\D/g, '')
  return digitsOnly.length >= 7 && digitsOnly.length <= 15
}

export function isPhoneValidForIsrael(input: string) {
  return isPhoneValid(input, '+972')
}
export const phoneConfig = {
  disableValidation: false,
}
export function PhoneField<entityType>(
  options?: StringFieldOptions<entityType> & { prefix?: string }
) {
  const prefix = options?.prefix || '+972'
  const validate: FieldValidator<entityType, string>[] = [
    (_, f) => {
      if (!f.value) return
      f.value = fixPhoneInput(f.value, prefix)
      if (phoneConfig.disableValidation) return
      if (!isPhoneValid(f.value, prefix)) {
        throw new Error('טלפון לא תקין')
      }
    },
  ]
  if (options?.validate) {
    if (!Array.isArray(options.validate)) options.validate = [options.validate]
    validate.push(...options.validate)
  }
  return Fields.string({
    caption: 'מספר טלפון',
    inputType: 'tel',
    displayValue: (_, value) => formatPhone(value, prefix),
    ...options,
    validate,
  })
}

export function formatPhone(s: string, prefix: string = '+972') {
  if (!s) return s

  // אם המספר מכיל קידומת בינלאומית
  if (s.startsWith('+')) {
    return s // החזר כמו שהוא או פרמט לפי הצורך
  }

  // פירמוט למספרים ישראליים
  if (prefix === '+972') {
    let x = s.replace(/\D/g, '')
    if (x.length < 9 || x.length > 10) return s
    if (x.length < 10 && !x.startsWith('0')) x = '0' + x

    x = x.substring(0, x.length - 4) + '-' + x.substring(x.length - 4, x.length)
    x = x.substring(0, x.length - 8) + '-' + x.substring(x.length - 8, x.length)
    return x
  }

  return s // לשאר המדינות החזר כמו שהוא
}

export interface ContactInfo {
  phone: string
  formattedPhone: string
  name: string
}
export interface TaskContactInfo {
  origin: ContactInfo[]
  target: ContactInfo[]
}
