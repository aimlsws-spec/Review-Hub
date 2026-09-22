import { Injectable } from '@nestjs/common';

import { NotFoundException } from '@common/exceptions/domain.exceptions';

import { DEFAULT_COUNTRY_CODE } from '../constants';
import { LocationRepository } from '../repositories/location.repository';

/** A city with the ids of the state and country above it. */
export interface ResolvedCity {
  id: string;
  stateId: string;
  countryId: string;
}

export interface ResolvedState {
  id: string;
  countryId: string;
}

/**
 * The states and cities a person can say they live in. Used by the app's pickers, and by anything that has to check
 * a chosen state or city is real, active and consistent (for example that a city is really in the chosen state).
 */
@Injectable()
export class LocationService {
  constructor(private readonly locationRepository: LocationRepository) {}

  async listStates(countryCode: string = DEFAULT_COUNTRY_CODE) {
    return this.locationRepository.listStates(countryCode.toUpperCase());
  }

  async listCities(stateId: string) {
    const state = await this.locationRepository.findState(stateId);
    if (!state) throw new NotFoundException('State');
    return this.locationRepository.listCities(stateId);
  }

  /** The state, or null when it does not exist or is switched off. */
  async findState(stateId: string): Promise<ResolvedState | null> {
    const state = await this.locationRepository.findState(stateId);
    return state ? { id: state.id, countryId: state.countryId } : null;
  }

  /** The city with its state and country, or null when it does not exist or is switched off. */
  async findCity(cityId: string): Promise<ResolvedCity | null> {
    const city = await this.locationRepository.findCity(cityId);
    return city ? { id: city.id, stateId: city.stateId, countryId: city.state.countryId } : null;
  }
}
