import {Controller, Dependencies, Bind, Get, Post, Req, Body, Query} from '@nestjs/common'
import {LedgerService} from './ledger.service'

const uid = (req) => req.user.id

@Controller('ledger')
@Dependencies(LedgerService)
export class LedgerController {
  constructor(ledgerService) {
    this.ledgerService = ledgerService;
  }

  @Get()
  @Bind(Req(), Query())
  list(req, query) {
    return this.ledgerService.list(uid(req), query);
  }

  @Get('team')
  @Bind(Req(), Query())
  listTeam(req, query) {
    return this.ledgerService.listTeam(uid(req), query);
  }

  @Post()
  @Bind(Req(), Body())
  create(req, body) {
    return this.ledgerService.create(uid(req), body);
  }

  @Post('import')
  @Bind(Req(), Body())
  importCsv(req, body) {
    return this.ledgerService.importCsv(uid(req), body);
  }
}