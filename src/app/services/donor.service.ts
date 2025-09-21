import { Injectable } from '@angular/core';
import { Donor } from '../../shared/entity/donor';
import { DonorController } from '../../shared/controllers/donor.controller';
import { GlobalFilters, GlobalFilterService } from './global-filter.service';

@Injectable({
  providedIn: 'root'
})
export class DonorService {

  constructor(private globalFilterService: GlobalFilterService) {}

  async findAll(): Promise<Donor[]> {
    return await DonorController.findAll();
  }

  async findActive(): Promise<Donor[]> {
    return await DonorController.findActive();
  }

  /**
   * Find donors with global filters applied automatically
   */
  async findFiltered(additionalFilters?: Partial<GlobalFilters>): Promise<Donor[]> {
    const globalFilters = this.globalFilterService.currentFilters;
    const combinedFilters = { ...globalFilters, ...additionalFilters };
    return await DonorController.findFiltered(combinedFilters);
  }

  async findById(id: string): Promise<Donor | null> {
    return await DonorController.findById(id);
  }

  async count(): Promise<number> {
    return await DonorController.count();
  }

  async countActive(): Promise<number> {
    return await DonorController.countActive();
  }

  /**
   * Count donors with global filters applied automatically
   */
  async countFiltered(additionalFilters?: Partial<GlobalFilters>): Promise<number> {
    const globalFilters = this.globalFilterService.currentFilters;
    const combinedFilters = { ...globalFilters, ...additionalFilters };
    return await DonorController.countFiltered(combinedFilters);
  }
}