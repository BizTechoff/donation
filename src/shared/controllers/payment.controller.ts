import { Allow, BackendMethod, remult } from 'remult';
import { Donation } from '../entity/donation';
import { DonationBank } from '../entity/donation-bank';
import { DonationOrganization } from '../entity/donation-organization';
import { Payment } from '../entity/payment';

interface ExcelRow {
  [key: string]: any;
}

interface ParsedPayment {
  paymentIdentifier: string;
  amount: number;
  paymentDate: Date;
  reference?: string;
  status: string;
}

export class PaymentController {

  @BackendMethod({ allowed: Allow.authenticated })
  static async getPaymentsByDonation(donationId: string, paymentType = ''): Promise<Payment[]> {
    return await remult.repo(Payment).find({
      where: { donationId, type: paymentType || undefined, isActive: true },
      orderBy: { paymentDate: 'desc' }
    });
  }

  @BackendMethod({ allowed: Allow.authenticated })
  static async createPayment(payment: Partial<Payment>): Promise<Payment> {
    // Auto-set type from parent donation if not already set
    if (!payment.type && payment.donationId) {
      const donation = await remult.repo(Donation).findId(payment.donationId);
      if (donation) {
        payment.type = donation.donationType;
      }
    }
    const newPayment = remult.repo(Payment).create(payment);
    await newPayment.save();
    return newPayment;
  }

  @BackendMethod({ allowed: Allow.authenticated })
  static async updatePayment(id: string, updates: Partial<Payment>): Promise<Payment> {
    const payment = await remult.repo(Payment).findId(id);
    if (!payment) {
      throw new Error('Payment not found');
    }

    Object.assign(payment, updates);
    await payment.save();
    return payment;
  }

  @BackendMethod({ allowed: Allow.authenticated })
  static async deletePayment(id: string): Promise<void> {
    const payment = await remult.repo(Payment).findId(id);
    if (!payment) {
      throw new Error('Payment not found');
    }

    payment.isActive = false;
    await payment.save();
  }

  @BackendMethod({ allowed: Allow.authenticated })
  static async processExcelTransactions(donationId: string, paymentType:string, excelData: ExcelRow[]): Promise<{
    matched: number;
    created: number;
    errors: string[]
  }> {
    const donation = await remult.repo(Donation).findId(donationId);
    if (!donation) {
      throw new Error('Donation not found');
    }

    // Get all donation banks and organizations with their paymentIdentifiers
    const [donationBanks, donationOrganizations] = await Promise.all([
      remult.repo(DonationBank).find({
        where: { donationId, isActive: true }
      }),
      remult.repo(DonationOrganization).find({
        where: { donationId, isActive: true }
      })
    ]);

    // Create a map of paymentIdentifiers to track which records to match
    const identifierMap = new Map<string, boolean>();
    [...donationBanks, ...donationOrganizations].forEach(item => {
      if (item.paymentIdentifier) {
        identifierMap.set(item.paymentIdentifier.trim().toLowerCase(), true);
      }
    });

    let matched = 0;
    let created = 0;
    const errors: string[] = [];

    // Process each Excel row
    for (let i = 0; i < excelData.length; i++) {
      const row = excelData[i];

      try {
        // Parse the payment data from Excel row
        // Assuming common column names - adjust based on actual Excel structure
        const parsedPayment = this.parseExcelRow(row);

        if (!parsedPayment) {
          errors.push(`Row ${i + 1}: Could not parse payment data`);
          continue;
        }

        // Check if paymentIdentifier matches any in our map
        const identifier = parsedPayment.paymentIdentifier?.trim().toLowerCase();
        if (!identifier || !identifierMap.has(identifier)) {
          continue; // Skip rows that don't match our identifiers
        }

        matched++;

        // Check if payment already exists
        const existingPayment = await remult.repo(Payment).findFirst({
          donationId,
          paymentIdentifier: parsedPayment.paymentIdentifier,
          paymentDate: parsedPayment.paymentDate,
          type: paymentType,
          isActive: true
        });

        if (existingPayment) {
          continue; // Skip duplicate payments
        }

        // Create new payment record
        const payment = remult.repo(Payment).create({
          donationId,
          amount: parsedPayment.amount,
          paymentDate: parsedPayment.paymentDate,
          status: parsedPayment.status,
          reference: parsedPayment.reference || '',
          paymentIdentifier: parsedPayment.paymentIdentifier,
          notes: `Imported from Excel - Row ${i + 1}`,
          type: paymentType,
          isActive: true
        });

        await payment.save();
        created++;

      } catch (error) {
        errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { matched, created, errors };
  }

  private static parseExcelRow(row: ExcelRow): ParsedPayment | null {
    // Try to find common column names in Excel
    // This is a flexible approach that handles various column naming conventions
    const getColumnValue = (possibleNames: string[]): any => {
      for (const name of possibleNames) {
        if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
          return row[name];
        }
      }
      return null;
    };

    // Try to extract paymentIdentifier
    const paymentIdentifier = getColumnValue([
      'מזהה תשלום', 'מזהה', 'paymentIdentifier', 'identifier', 'id', 'מזהה_תשלום',
      'Payment Identifier', 'Payment ID', 'Transaction ID'
    ]);

    if (!paymentIdentifier) {
      return null; // Can't process without identifier
    }

    // Try to extract amount
    const amountValue = getColumnValue([
      'סכום', 'amount', 'סכום_תשלום', 'Amount', 'Payment Amount', 'תשלום'
    ]);

    const amount = typeof amountValue === 'number' ? amountValue :
      typeof amountValue === 'string' ? parseFloat(amountValue.replace(/[^\d.-]/g, '')) : 0;

    if (isNaN(amount) || amount <= 0) {
      return null; // Invalid amount
    }

    // Try to extract date
    const dateValue = getColumnValue([
      'תאריך', 'תאריך תשלום', 'date', 'paymentDate', 'Date', 'Payment Date', 'תאריך_תשלום'
    ]);

    let paymentDate: Date;
    if (dateValue instanceof Date) {
      paymentDate = dateValue;
    } else if (typeof dateValue === 'number') {
      // Excel serial date number
      paymentDate = new Date((dateValue - 25569) * 86400 * 1000);
    } else if (typeof dateValue === 'string') {
      paymentDate = new Date(dateValue);
    } else {
      paymentDate = new Date(); // Default to current date if not found
    }

    // Try to extract reference
    const reference = getColumnValue([
      'אסמכתא', 'reference', 'אסמכתא_תשלום', 'Reference', 'Transaction Reference', 'Ref'
    ]);

    // Try to extract status
    const statusValue = getColumnValue([
      'סטטוס', 'status', 'Status', 'מצב', 'Payment Status'
    ]);

    const status = statusValue ? String(statusValue).toLowerCase() : 'completed';

    return {
      paymentIdentifier: String(paymentIdentifier),
      amount,
      paymentDate,
      reference: reference ? String(reference) : undefined,
      status: status === 'completed' || status === 'הושלם' ? 'completed' : 'pending'
    };
  }
}
