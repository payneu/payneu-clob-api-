import { Controller, Get, Post, Body, Param, UsePipes } from '@nestjs/common';
import { OrderService } from './order.service';
import {
  CreateOrderDto,
  CreateOrderIdDto,
  CreateOrderIdSchema,
  CreateOrderSchema,
} from './dto/create-order.dto';
import { CreatePairDto, CreatePairSchema } from './dto/create-pair.dto';
import { ApiOperation } from '@nestjs/swagger';
import { ZodValidationPipe } from 'src/pipes/zod-validation.pipe';

@Controller('order')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @ApiOperation({
    operationId: 'generateId',
    description: 'Generated Order Id',
  })
  @Post('/id')
  @UsePipes(new ZodValidationPipe(CreateOrderIdSchema))
  generateId(@Body() createOrder: CreateOrderIdDto) {
    return this.orderService.generateId(createOrder);
  }

  @ApiOperation({
    operationId: 'createPair',
    description: 'Create a pair',
  })
  @Post('/pair/')
  @UsePipes(new ZodValidationPipe(CreatePairSchema))
  createPair(@Body() createPair: CreatePairDto) {
    return this.orderService.createPair(createPair);
  }

  @ApiOperation({
    operationId: 'create',
    description: 'Submit an order',
  })
  @Post('/:pairName')
  @UsePipes(new ZodValidationPipe(CreateOrderSchema))
  create(
    @Param('pairName') pairName: string,
    @Body() createOrders: CreateOrderDto,
  ) {
    return this.orderService.createOrders(pairName, createOrders);
  }

  @Get('/:pairName/all')
  findAll(@Param('pairName') pairName: string) {
    return this.orderService.orderbookStatus(pairName);
  }

  @Get('/marketprice')
  marketPrice() {
    return this.orderService.marketPrice();
  }

  @Get('/:pairName/candlestick')
  candlestickData(@Param('pairName') pairName: string) {
    return this.orderService.getCandlestickData(pairName);
  }

  @Get('/orders/:creatorAddress')
  openOrdersByCreator(@Param('creatorAddress') creatorAddress: string) {
    return this.orderService.getOpenOrders(creatorAddress);
  }
}
