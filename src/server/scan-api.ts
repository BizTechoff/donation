import express, { Request, Response, Router } from 'express'
import multer from 'multer'
import { remult } from 'remult'
import { DonationFile } from '../shared/entity/file'
import { Donation } from '../shared/entity/donation'
import { Donor } from '../shared/entity/donor'
import { doGenerateSignedURL } from './s3'
import { api } from './api'

// ── In-memory active-donation map ────────────────────────────────
interface ActiveDonation {
  donationId: string
  donorName: string
  amount: number
  currencyId: string
  timestamp: number
}

const activeDonations = new Map<string, ActiveDonation>()

// ── Multer config (memory storage for S3 relay) ──────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/tiff'
    ]
    if (allowed.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Unsupported file type: ' + file.mimetype))
    }
  }
})

// ── Helper: get authenticated user from session ──────────────────
function getSessionUser(req: Request) {
  const user = (req as any).session?.['user']
  if (!user?.id) return null
  return user as { id: string; name: string; roles: string[] }
}

// ── Router ───────────────────────────────────────────────────────
export const scanRouter = Router()

// JSON parsing for non-multipart routes
scanRouter.use(express.json())

/**
 * GET /api/scan/active-donation
 * Returns the active donation for the current user (set by Angular modal)
 */
scanRouter.get('/active-donation', async (req: Request, res: Response) => {
  try {
    const user = getSessionUser(req)
    if (!user) {
      res.status(401).json({ error: 'Not authenticated' })
      return
    }

    const active = activeDonations.get(user.id)
    if (!active) {
      res.json(null)
      return
    }

    // Expire after 30 minutes
    if (Date.now() - active.timestamp > 30 * 60 * 1000) {
      activeDonations.delete(user.id)
      res.json(null)
      return
    }

    res.json({
      donationId: active.donationId,
      donorName: active.donorName,
      amount: active.amount,
      currencyId: active.currencyId
    })
  } catch (err: any) {
    console.error('[scan-api] active-donation error:', err)
    res.status(500).json({ error: err.message })
  }
})

/**
 * POST /api/scan/register-active
 * Body: { donationId: string | null }
 * Called by Angular when opening/closing donation-details-modal
 */
scanRouter.post('/register-active', api.withRemult, async (req: Request, res: Response) => {
  try {
    const user = getSessionUser(req)
    if (!user) {
      res.status(401).json({ error: 'Not authenticated' })
      return
    }

    const { donationId } = req.body

    if (!donationId) {
      // Unregister
      activeDonations.delete(user.id)
      console.log(`[scan-api] User ${user.name} unregistered active donation`)
      res.json({ success: true })
      return
    }

    // Look up donation + donor name
    const donationRepo = remult.repo(Donation)
    const donation = await donationRepo.findId(donationId)
    if (!donation) {
      res.status(404).json({ error: 'Donation not found' })
      return
    }

    let donorName = ''
    if (donation.donorId) {
      const donor = await remult.repo(Donor).findId(donation.donorId)
      if (donor) {
        donorName = `${donor.firstName || ''} ${donor.lastName || ''}`.trim()
      }
    }

    activeDonations.set(user.id, {
      donationId,
      donorName,
      amount: donation.amount,
      currencyId: donation.currencyId || 'ILS',
      timestamp: Date.now()
    })

    console.log(`[scan-api] User ${user.name} registered active donation ${donationId} (${donorName} - ${donation.amount})`)
    res.json({ success: true })
  } catch (err: any) {
    console.error('[scan-api] register-active error:', err)
    res.status(500).json({ error: err.message })
  }
})

/**
 * POST /api/scan/upload
 * Multipart: file + donationId
 * Uploads file to S3 and creates DonationFile record
 */
scanRouter.post('/upload', upload.single('file'), api.withRemult, async (req: Request, res: Response) => {
  try {
    const user = getSessionUser(req)
    if (!user) {
      res.status(401).json({ error: 'Not authenticated' })
      return
    }

    const file = req.file
    const { donationId } = req.body

    if (!file) {
      res.status(400).json({ error: 'No file provided' })
      return
    }
    if (!donationId) {
      res.status(400).json({ error: 'No donationId provided' })
      return
    }

    // Verify donation exists
    const donation = await remult.repo(Donation).findId(donationId)
    if (!donation) {
      res.status(404).json({ error: 'Donation not found' })
      return
    }

    // Generate unique filename
    const timestamp = Date.now()
    const uniqueFileName = `${timestamp}_${file.originalname}`
    const bucketKey = `donations/${donationId}`

    // Step 1: Get signed upload URL
    const s3Result = await doGenerateSignedURL('putObject', uniqueFileName, file.mimetype, bucketKey)
    if (!s3Result.success || !s3Result.url) {
      res.status(500).json({ error: s3Result.error || 'Failed to generate upload URL' })
      return
    }

    // Step 2: Upload file buffer to S3 via signed URL
    const uploadResponse = await fetch(s3Result.url, {
      method: 'PUT',
      headers: { 'Content-Type': file.mimetype },
      body: file.buffer
    })

    if (!uploadResponse.ok) {
      res.status(500).json({ error: `S3 upload failed: ${uploadResponse.status} ${uploadResponse.statusText}` })
      return
    }

    // Step 3: Create DonationFile record
    const fileRepo = remult.repo(DonationFile)
    const donationFile = fileRepo.create()
    donationFile.fileName = file.originalname
    donationFile.filePath = `${bucketKey}/${uniqueFileName}`
    donationFile.fileType = file.mimetype
    donationFile.fileSize = file.size
    donationFile.donationId = donationId
    donationFile.description = 'סריקה מהסורק'
    donationFile.isActive = true
    donationFile.uploadedById = user.id

    await fileRepo.save(donationFile)

    console.log(`[scan-api] User ${user.name} uploaded scan "${file.originalname}" to donation ${donationId}`)

    res.json({
      success: true,
      fileId: donationFile.id,
      fileName: file.originalname
    })
  } catch (err: any) {
    console.error('[scan-api] upload error:', err)
    res.status(500).json({ error: err.message })
  }
})

/**
 * GET /api/scan/search-donations?q=...
 * Search donations for the scanner app (by donor name, amount, etc.)
 */
scanRouter.get('/search-donations', api.withRemult, async (req: Request, res: Response) => {
  try {
    const user = getSessionUser(req)
    if (!user) {
      res.status(401).json({ error: 'Not authenticated' })
      return
    }

    const query = (req.query['q'] as string || '').trim()
    if (!query) {
      res.json([])
      return
    }

    // Search donors by name
    const donorRepo = remult.repo(Donor)
    const words = query.split(/\s+/)

    // Find matching donors
    const donors = await donorRepo.find({
      limit: 20,
      where: {
        $or: words.map(word => ({
          $or: [
            { firstName: { $contains: word } },
            { lastName: { $contains: word } }
          ]
        }))
      }
    })

    if (donors.length === 0) {
      // Try searching by amount
      const amount = parseFloat(query)
      if (!isNaN(amount)) {
        const donations = await remult.repo(Donation).find({
          limit: 20,
          where: { amount },
          orderBy: { donationDate: 'desc' },
          include: { donor: true }
        })

        const results = donations.map(d => ({
          donationId: d.id,
          donorName: d.donor ? `${d.donor.firstName || ''} ${d.donor.lastName || ''}`.trim() : '',
          amount: d.amount,
          currencyId: d.currencyId || 'ILS',
          donationDate: d.donationDate
        }))

        res.json(results)
        return
      }

      res.json([])
      return
    }

    // Find recent donations for matching donors
    const donorIds = donors.map(d => d.id)
    const donations = await remult.repo(Donation).find({
      limit: 30,
      where: { donorId: { $in: donorIds } },
      orderBy: { donationDate: 'desc' },
      include: { donor: true }
    })

    const results = donations.map(d => ({
      donationId: d.id,
      donorName: d.donor ? `${d.donor.firstName || ''} ${d.donor.lastName || ''}`.trim() : '',
      amount: d.amount,
      currencyId: d.currencyId || 'ILS',
      donationDate: d.donationDate
    }))

    res.json(results)
  } catch (err: any) {
    console.error('[scan-api] search-donations error:', err)
    res.status(500).json({ error: err.message })
  }
})
