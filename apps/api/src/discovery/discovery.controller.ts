import { Controller, Post, Body, HttpCode, HttpStatus } from "@nestjs/common";
import { DiscoveryService } from "./discovery.service";
import { DiscoveryRequestDto } from "./dto/discovery-request.dto";
import { DiscoveryResponseDto } from "./dto/discovery-response.dto";

@Controller("api")
export class DiscoveryController {
  constructor(private readonly discoveryService: DiscoveryService) {}

  @Post("discovery")
  @HttpCode(HttpStatus.OK)
  async discover(
    @Body() request: DiscoveryRequestDto
  ): Promise<DiscoveryResponseDto> {
    return await this.discoveryService.discover(request);
  }
}
