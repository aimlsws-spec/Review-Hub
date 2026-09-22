import { Injectable } from '@nestjs/common';

import { BadRequestException } from '@common/exceptions/domain.exceptions';

import { LocationService } from '../../location/services/location.service';
import { UserGender } from '../constants';
import type { DemographicsInput } from '../interfaces';
import { isPlausibleBirthDate, parseBirthDate } from '../validators';

/** The columns a demographics change writes. A column that is left out is not touched. */
export interface DemographicsColumns {
  dateOfBirth?: Date | null;
  gender?: UserGender | null;
  countryId?: string | null;
  stateId?: string | null;
  cityId?: string | null;
}

export interface ResolvedDemographics {
  data: DemographicsColumns;
  /**
   * Which kinds of detail changed, without the details. This is what goes into the activity log: a date of birth or
   * a home city is personal, so the log records that it changed and never what it changed to.
   */
  changed: Partial<Record<'dateOfBirth' | 'gender' | 'location', 'updated' | 'cleared'>>;
}

/** The place a person has saved so far, so a new state can tell whether the old city still belongs. */
export interface SavedLocation {
  stateId?: string | null;
}

/**
 * Turns what a person typed (date of birth, gender, state, city) into what may be saved, or refuses it.
 *
 * WHY the server works out the country: taking state and country from the client would let them disagree, and a
 * campaign aimed at Gujarat could then match someone whose "state" says Gujarat and whose "country" says Canada.
 * One chosen city fixes all three.
 */
@Injectable()
export class DemographicsService {
  constructor(private readonly locationService: LocationService) {}

  async resolve(input: DemographicsInput, saved: SavedLocation = {}): Promise<ResolvedDemographics> {
    const data: DemographicsColumns = {};
    const changed: ResolvedDemographics['changed'] = {};

    if (input.dateOfBirth !== undefined) {
      if (input.dateOfBirth === null) {
        data.dateOfBirth = null;
        changed.dateOfBirth = 'cleared';
      } else {
        const parsed = parseBirthDate(input.dateOfBirth);
        // The DTO already checked this; checking again means no caller can skip it by building the input by hand.
        if (!parsed || !isPlausibleBirthDate(input.dateOfBirth)) throw new BadRequestException('Enter a valid date of birth');
        data.dateOfBirth = parsed;
        changed.dateOfBirth = 'updated';
      }
    }

    if (input.gender !== undefined) {
      data.gender = input.gender;
      changed.gender = input.gender === null ? 'cleared' : 'updated';
    }

    const location = await this.resolveLocation(input, saved);
    if (location) {
      Object.assign(data, location);
      changed.location = location.stateId === null ? 'cleared' : 'updated';
    }

    return { data, changed };
  }

  /** The location columns to write, or null when the input does not mention the location at all. */
  private async resolveLocation(input: DemographicsInput, saved: SavedLocation): Promise<DemographicsColumns | null> {
    const { stateId, cityId } = input;
    if (stateId === undefined && cityId === undefined) return null;

    if (typeof cityId === 'string') {
      if (stateId === null) throw new BadRequestException('Choose a state to go with the city');
      const city = await this.locationService.findCity(cityId);
      if (!city) throw new BadRequestException('That city was not found');
      if (typeof stateId === 'string' && stateId !== city.stateId) throw new BadRequestException('That city is not in the chosen state');
      return { countryId: city.countryId, stateId: city.stateId, cityId: city.id };
    }

    if (typeof stateId === 'string') {
      const state = await this.locationService.findState(stateId);
      if (!state) throw new BadRequestException('That state was not found');
      // A city belongs to exactly one state, so moving to another state drops the old city.
      const keepCity = cityId === undefined && saved.stateId === state.id;
      return { countryId: state.countryId, stateId: state.id, ...(keepCity ? {} : { cityId: null }) };
    }

    if (stateId === null) return { countryId: null, stateId: null, cityId: null };
    return { cityId: null };
  }
}
