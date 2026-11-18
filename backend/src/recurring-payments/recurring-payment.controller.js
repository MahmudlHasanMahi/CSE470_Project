import {
  Controller,
  Dependencies,
  Bind,
  Get,
  Post,
  Patch,
  Req,
  Body,
  Param,
} from '@nestjs/common';
import { RecurringPaymentsService } from './recurring-payment.service';

const uid = (req) => req.user.id ?? req.user.sub; // CHECK

@Controller('recurring-payments')
@Dependencies(RecurringPaymentsService)
export class RecurringPaymentsController {
  constructor(service) {
    this.service = service;
  }

  @Get()
  @Bind(Req())
  list(req) {
    return this.service.list(uid(req));
  }

  @Post()
  @Bind(Req(), Body())
  create(req, body) {
    return this.service.create(uid(req), body);
  }

  @Patch(':id/status')
  @Bind(Req(), Param('id'), Body())
  setStatus(req, id, body) {
    return this.service.setStatus(uid(req), id, body.status);
  }

  // For demo/testing: run the due-payment check now
  @Post('process-due')
  processDue() {
    return this.service.processDue();
  }
}
