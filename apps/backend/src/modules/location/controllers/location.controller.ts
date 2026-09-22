import { Controller, Get, Header, HttpCode, HttpStatus, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '@common/decorators/public.decorator';

import { LOCATION_CACHE_CONTROL } from '../constants';
import { CityResponseDto, StateResponseDto, StatesQueryDto } from '../dto/location.dto';
import { LocationService } from '../services/location.service';

/**
 * Public on purpose: the sign-up screen needs the lists before anyone has an account. They hold nothing but
 * place names, so there is nothing private to protect.
 */
@ApiTags('Locations')
@Controller({ path: 'locations', version: '1' })
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @Public()
  @Get('states')
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', LOCATION_CACHE_CONTROL)
  @ApiOperation({ summary: 'List the states people can choose from' })
  @ApiOkResponse({ type: [StateResponseDto] })
  async states(@Query() query: StatesQueryDto) {
    return this.locationService.listStates(query.countryCode);
  }

  @Public()
  @Get('states/:stateId/cities')
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', LOCATION_CACHE_CONTROL)
  @ApiOperation({ summary: 'List the cities in a state' })
  @ApiOkResponse({ type: [CityResponseDto] })
  async cities(@Param('stateId', new ParseUUIDPipe()) stateId: string) {
    return this.locationService.listCities(stateId);
  }
}
