import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Bind,
  Dependencies,
  Req,
} from '@nestjs/common';
import { BudgetsService } from './budgets.service';

@Controller('budgets')
@Dependencies(BudgetsService)
export class BudgetsController {
  constructor(budgetsService) {
    this.budgetsService = budgetsService;
  }

  @Get()
  @Bind(Req(), Query('month'))
  getMonthly(req, month) {
    return this.budgetsService.getMonthlyBudget(req.user.id, month);
  }

  @Put('items')
  @Bind(Req(), Body())
  upsertItem(req, body) {
    return this.budgetsService.upsertBudgetItem(req.user.id, body);
  }

  @Delete('items/:id')
  @Bind(Req(), Param('id'))
  deleteItem(req, id) {
    return this.budgetsService.deleteBudgetItem(req.user.id, id);
  }
}