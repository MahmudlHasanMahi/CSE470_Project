import {
  Controller,
  Get,
  Post,
  Delete,
  Bind,
  Body,
  Param,
  Req,
  Dependencies,
} from '@nestjs/common';
import { FinancialScenariosService } from './financial-scenarios.service';


@Controller('financial-scenarios')
@Dependencies(FinancialScenariosService)
export class FinancialScenariosController {
  constructor(financialScenariosService) {
    this.financialScenariosService = financialScenariosService;
  }

  @Get('baseline')
  @Bind(Req())
  baseline(req) {
    return this.financialScenariosService.getBaseline(req.user.id);
  }

  @Post('calculate')
  @Bind(Req(), Body())
  calculate(req, body) {
    return this.financialScenariosService.calculate(req.user.id, body);
  }

  @Post()
  @Bind(Req(), Body())
  create(req, body) {
    return this.financialScenariosService.create(req.user.id, body);
  }

  @Get()
  @Bind(Req())
  findAll(req) {
    return this.financialScenariosService.findAll(req.user.id);
  }

  @Get(':id')
  @Bind(Req(), Param('id'))
  findOne(req, id) {
    return this.financialScenariosService.findOne(req.user.id, id);
  }

  @Delete(':id')
  @Bind(Req(), Param('id'))
  remove(req, id) {
    return this.financialScenariosService.remove(req.user.id, id);
  }
}
