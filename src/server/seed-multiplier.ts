import { remult, withRemult } from 'remult'
import { createPostgresConnection } from 'remult/postgres'
import { Donor, Donation } from '../shared/entity'
import { entities } from './api'

const FACTOR = parseInt(process.argv[2] ?? '9', 10)
if (isNaN(FACTOR) || FACTOR < 1) {
  console.error(`FACTOR לא תקין: "${process.argv[2]}". חייב להיות מספר חיובי.`)
  process.exit(1)
}

const CHUNK_SIZE = 300

function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

const FIRST_NAMES = [
  'אברהם', 'יצחק', 'יעקב', 'משה', 'אהרן', 'דוד', 'שלמה', 'יוסף',
  'בנימין', 'שמואל', 'אליהו', 'חיים', 'מנחם', 'שניאור', 'לוי',
  'נחמן', 'מרדכי', 'אייזיק', 'פנחס', 'יהודה',
]
const LAST_NAMES = [
  'כהן', 'לוי', 'מזרחי', 'אשכנזי', 'פרידמן', 'גולדברג', 'שפירא',
  'רבינוביץ', 'שטרן', 'ברגר', 'וייס', 'קלמן', 'הורוביץ', 'לנדא',
  'פרלמן', 'שוורץ', 'זילברמן', 'פישר', 'ביינוש', 'גרינברג',
]

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function varyAmount(amount: number): number {
  const factor = 0.9 + Math.random() * 0.2
  return Math.max(1, Math.round((amount * factor) / 10) * 10)
}

async function insertChunked<T>(repo: any, items: T[], label: string): Promise<void> {
  const total = items.length
  for (let i = 0; i < total; i += CHUNK_SIZE) {
    await repo.insert(items.slice(i, i + CHUNK_SIZE))
    process.stdout.write(`\r   ${label}: ${Math.min(i + CHUNK_SIZE, total)} / ${total}`)
  }
  process.stdout.write('\n')
}

async function multiplyDonors(): Promise<Map<string, string[]>> {
  process.stdout.write('[1/4] טוען תורמים קיימים... ')
  const donors = await remult.repo(Donor).find({ limit: 100_000 })
  console.log(`${donors.length} נמצאו`)

  const donorMap = new Map<string, string[]>()
  const clones: any[] = []

  for (const d of donors) {
    const ids: string[] = []
    for (let i = 1; i <= FACTOR; i++) {
      const id = newId()
      ids.push(id)
      clones.push({
        ...d,
        id,
        firstName: pick(FIRST_NAMES),
        lastName: pick(LAST_NAMES),
        idNumber: d.idNumber ? `${d.idNumber}${i}` : '',
        createdDate: new Date(),
        fundraiser: undefined,
        contactPerson: undefined,
        fullName: undefined,
        fullNameEnglish: undefined,
        fullNameReversed: undefined,
        fullNameReversedEnglish: undefined,
      })
    }
    donorMap.set(d.id, ids)
  }

  console.log(`[2/4] מכניס ${clones.length} תורמים חדשים...`)
  await insertChunked(remult.repo(Donor), clones, 'donors')
  console.log(`   ✓ ${clones.length} תורמים הוכנסו`)

  return donorMap
}

async function multiplyDonations(donorMap: Map<string, string[]>): Promise<number> {
  process.stdout.write('[3/4] טוען תרומות קיימות... ')
  const donations = await remult.repo(Donation).find({ limit: 200_000 })
  console.log(`${donations.length} נמצאו`)

  const clones: any[] = []

  for (const don of donations) {
    const cloneDonorIds = donorMap.get(don.donorId)
    if (!cloneDonorIds) continue

    for (const newDonorId of cloneDonorIds) {
      clones.push({
        id: newId(),
        amount: varyAmount(don.amount),
        currencyId: don.currencyId,
        donorId: newDonorId,
        campaignId: don.campaignId,
        donationMethodId: don.donationMethodId,
        donationDate: don.donationDate,
        donationType: don.donationType,
        notes: don.notes ?? '',
        checkNumber: don.checkNumber ?? '',
        voucherNumber: don.voucherNumber ?? '',
        createdDate: new Date(),
      })
    }
  }

  console.log(`[4/4] מכניס ${clones.length} תרומות חדשות...`)
  await insertChunked(remult.repo(Donation), clones, 'donations')
  console.log(`   ✓ ${clones.length} תרומות הוכנסו`)

  return clones.length
}

async function main() {
  const t0 = Date.now()
  console.log('\n╔══════════════════════════════╗')
  console.log(`║  SEED MULTIPLIER  ×${FACTOR + 1}        ║`)
  console.log('╚══════════════════════════════╝\n')

  const donorMap = await multiplyDonors()
  const donationCount = await multiplyDonations(donorMap)

  const sec = ((Date.now() - t0) / 1000).toFixed(1)
  console.log('\n══════════ SUMMARY ═══════════')
  console.log(`תורמים חדשים:  +${donorMap.size * FACTOR}`)
  console.log(`תרומות חדשות:  +${donationCount}`)
  console.log(`זמן כולל:       ${sec}s`)
  console.log('═════════════════════════════\n')
}

if (typeof module !== 'undefined' && require.main === module) {
  const dataProvider = createPostgresConnection({
    configuration: 'heroku',
    sslInDev: !(process.env['DEV_MODE'] === 'DEV'),
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  withRemult(() => main(), { dataProvider, entities } as any)
    .then(() => process.exit(0))
    .catch(err => {
      console.error('שגיאה:', err)
      process.exit(1)
    })
}
