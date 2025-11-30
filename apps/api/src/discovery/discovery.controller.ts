import { Controller, Post, Body, HttpCode, HttpStatus } from "@nestjs/common";
import { DiscoveryService } from "./discovery.service";
import { DiscoveryRequestDto } from "./dto/discovery-request.dto";
import { DiscoveryResponseDto } from "./dto/discovery-response.dto";
import { ServiceTypesRequestDto } from "./dto/service-types-request.dto";
import { ServiceTypesResponseDto } from "./dto/service-types-response.dto";

@Controller("api")
export class DiscoveryController {
  constructor(private readonly discoveryService: DiscoveryService) {}

  @Post("service-types")
  @HttpCode(HttpStatus.OK)
  async getServiceTypes(
    @Body() request: ServiceTypesRequestDto
  ): Promise<ServiceTypesResponseDto> {
    return await this.discoveryService.getServiceTypes(request);
  }

  @Post("discovery")
  @HttpCode(HttpStatus.OK)
  async discover(
    @Body() request: DiscoveryRequestDto
  ): Promise<DiscoveryResponseDto> {
    return await this.discoveryService.discover(request);
  }
}
