import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma/prisma.service';

/** Reads the states and cities people choose from. Only active rows are ever returned. */
@Injectable()
export class LocationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listStates(countryCode: string) {
    return this.prisma.state.findMany({
      where: { isActive: true, country: { code: countryCode, isActive: true } },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, code: true },
    });
  }

  async listCities(stateId: string) {
    return this.prisma.city.findMany({
      where: { stateId, isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });
  }

  async findState(id: string) {
    return this.prisma.state.findFirst({
      where: { id, isActive: true, country: { isActive: true } },
      select: { id: true, name: true, countryId: true },
    });
  }

  /** A city together with the state and country it belongs to, so one lookup can check all three. */
  async findCity(id: string) {
    return this.prisma.city.findFirst({
      where: { id, isActive: true, state: { isActive: true, country: { isActive: true } } },
      select: { id: true, name: true, stateId: true, state: { select: { countryId: true } } },
    });
  }
}
