import { Allow, BackendMethod, Controller } from 'remult';
import { CurrencyType, PayerService } from '../../app/services/payer.service';

/**
 * Controller for payer-related operations including currency conversions
 * Wraps PayerService for server-side access
 */
@Controller('payer')
export class PayerController {

  /**
   * Get list of all available currency types with labels, symbols, and exchange rates
   * Server-side wrapper for PayerService.getCurrencyTypes()
   * @returns Array of currency objects with id, label, symbol, and rateInShekel
   */
  // @BackendMethod({ allowed: Allow.authenticated })
  // static async getCurrencyTypes(): Promise<CurrencyType[]> {
  //   const payerService = new PayerService();
  //   return await payerService.getCurrencyTypes();
  // }
}
