import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreatePairDto } from './dto/create-pair.dto';
import { SafeLogger } from 'src/utils/logger';

export type MarketPrice = {
  timestamp: Date;
  marketprice: bigint;
  pair_id: number;
};

export type Pair = {
  id: number;
  baseTokenSymbol: string;
  quoteTokenSymbol: string;
  baseTokenType: number;
  quoteTokenType: number;
  tokenId: number | null;
  baseToken: string;
  quoteToken: string;
};

export type ExecutedTrade = {
  txHash: string;
  submitted: Date;
  callArgs: string;
  status: string;
};

export type OrderDetails = {
  order_id: string;
  creator: string;
  signature: string;
  status: string;
};

@Injectable()
export class OrderRepository {
  private readonly logger = new SafeLogger(OrderRepository.name);

  constructor(private readonly prismaService: PrismaService) {}

  async createPair(createPair: CreatePairDto) {
    this.logger.debug({ message: 'createPair', createPair });
    return await this.prismaService.pair.create({
      data: {
        baseTokenSymbol: createPair.baseTokenSymbol,
        quoteTokenSymbol: createPair.quoteTokenSymbol,
        pairName: `${createPair.baseTokenSymbol}-${createPair.quoteTokenSymbol}`,
        baseTokenType: createPair.baseTokenType,
        quoteTokenType: createPair.quoteTokenType,
        tokenId: createPair.tokenId,
        baseToken: createPair.baseToken,
        quoteToken: createPair.quoteToken,
      },
    });
  }

  async saveMarketPrice(marketPrice: MarketPrice) {
    this.logger.debug({ message: 'saveMarketPrice', marketPrice });

    const newMarketPrice = await this.prismaService.market_price.create({
      data: marketPrice,
    });

    return newMarketPrice;
  }

  async saveTrade(execTrade: ExecutedTrade) {
    this.logger.debug({ message: 'saveTrade', execTrade });

    const newExecTrade = await this.prismaService.trade.create({
      data: execTrade,
    });
    return newExecTrade;
  }

  async saveOrder(orderDetails: OrderDetails) {
    this.logger.debug({ message: 'saveOrder', orderDetails });

    return await this.prismaService.order.create({
      data: orderDetails,
    });
  }

  async getOrder(orderId: string) {
    this.logger.debug({ message: 'getOrder', orderId });

    return await this.prismaService.order.findFirst({
      where: {
        order_id: orderId || '',
      },
    });
  }

  async getOrderByStatus(creator: string, status: string) {
    return await this.prismaService.order.findMany({
      where: {
        status,
        creator,
      },
    });
  }

  async updateOrderStatus(orderId: string, status: string) {
    const orderToUpdate = await this.getOrder(orderId);
    await this.prismaService.order.update({
      where: {
        id: orderToUpdate?.id,
      },
      data: {
        status: status,
      },
    });
  }

  async getSnapshotByPairName(pairName: string) {
    this.logger.debug({ message: 'getSnapshotByPairName', pairName });

    const pair = await this.prismaService.pair.findFirst({
      where: {
        pairName: pairName,
      },
    });

    await this.prismaService.snapshot.findFirst({
      where: {
        pair_id: pair?.id || 0,
      },
    });
  }

  async updateSnapshotByName(pairName: string, snapshot: string) {
    this.logger.debug({ message: 'updateSnapshotByName', pairName, snapshot });

    const pair = await this.prismaService.pair.findFirst({
      where: {
        pairName: pairName || '',
      },
      include: {
        snapshot: true,
      },
    });

    // check if there's a snapshot, if yes, update
    // if none, create it

    if (pair?.snapshot) {
      await this.prismaService.snapshot.update({
        where: {
          pair_id: pair?.id || 0,
        },
        data: {
          content: snapshot,
        },
      });
    } else {
      await this.prismaService.snapshot.create({
        data: {
          content: snapshot,
          pair_id: pair?.id || 0,
        },
      });
    }
  }

  async getPairs() {
    this.logger.debug({ message: 'getPairs' });

    return await this.prismaService.pair.findMany({
      include: {
        snapshot: true,
      },
    });
  }

  async getAllMarketPrice(pairName: string) {
    this.logger.debug({ message: 'getAllMarketPrice', pairName });

    const pair = await this.prismaService.pair.findFirst({
      where: {
        pairName: pairName,
      },
    });

    this.logger.debug({ message: 'found pair', pair });

    const allMarketPrices = await this.prismaService.market_price.findMany({
      where: {
        pair_id: pair?.id || 0,
        marketprice: { gte: 0 },
      },
    });
    return allMarketPrices;
  }
}
