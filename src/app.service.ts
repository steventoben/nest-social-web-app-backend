import { Injectable, Logger } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";

@Injectable()
export class AppService {
  private readonly logger: Logger = new Logger(AppService.name);
  constructor() {
  }
  getHello(): string {
    return 'Hello World!';
  }
}
