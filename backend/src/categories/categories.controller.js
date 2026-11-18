import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Bind,
  Dependencies,
  Req,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';

@Controller('categories')
@Dependencies(CategoriesService)
export class CategoriesController {
  constructor(categoriesService) {
    this.categoriesService = categoriesService;
  }

  @Get()
  @Bind(Req(), Query('type'))
  list(req, type) {
    return this.categoriesService.listForUser(req.user.id, type);
  }

  @Post()
  @Bind(Req(), Body())
  create(req, body) {
    return this.categoriesService.createForUser(req.user.id, body);
  }

  @Patch(':id')
  @Bind(Req(), Param('id'), Body())
  update(req, id, body) {
    return this.categoriesService.updateForUser(req.user.id, id, body);
  }

  @Delete(':id')
  @Bind(Req(), Param('id'))
  remove(req, id) {
    return this.categoriesService.deleteForUser(req.user.id, id);
  }
}