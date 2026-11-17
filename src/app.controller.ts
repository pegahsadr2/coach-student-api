import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { AppService } from "./app.service";

@ApiTags("Health")
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @ApiOperation({
    summary: "API welcome check",
    description: "Returns the API welcome message. No request body is needed.",
  })
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @ApiOperation({
    summary: "Check whether the coach server is reachable",
    description:
      "Public connectivity check for the student app after the user enters the coach server address. This confirms that the API process is reachable; it does not authenticate a student or prove database health.",
  })
  @Get("health")
  getHealth() {
    return {
      status: "ok",
      service: "coach-student-api",
      timestamp: new Date().toISOString(),
    };
  }
}
