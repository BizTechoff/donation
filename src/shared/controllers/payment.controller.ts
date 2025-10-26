import { BackendMethod, Allow, remult } from 'remult';
import { Payment } from '../entity/payment';

export class PaymentController {

  @BackendMethod({ allowed: Allow.authenticated })
  static async getPaymentsByDonation(donationId: string): Promise<Payment[]> {
    return await remult.repo(Payment).find({
      where: { donationId, isActive: true },
      orderBy: { paymentDate: 'desc' }
    });
  }

  @BackendMethod({ allowed: Allow.authenticated })
  static async createPayment(payment: Partial<Payment>): Promise<Payment> {
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
}
