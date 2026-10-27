import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @ApiOperation({ summary: 'API welcome check', description: 'Returns the API welcome message. No request body is needed.' })
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
