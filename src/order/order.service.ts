import 'dotenv/config';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateOrderDto, CreateOrderIdDto } from './dto/create-order.dto';

import { IProcessOrder, OrderBook, Side } from 'nodejs-order-book';
import { ILimitOrder } from 'nodejs-order-book/dist/types/types';

import SettlementArtifacts from '../../abi/Settlement.json';

import {
  createPublicClient,
  http,
  createWalletClient,
  verifyMessage,
} from 'viem';
import { privateKeyToAccount, nonceManager } from 'viem/accounts';
import { SchedulerRegistry } from '@nestjs/schedule';
import { OrderRepository, Pair } from './order.repository';
import { CreatePairDto } from './dto/create-pair.dto';
import { SafeLogger } from 'src/utils/logger';

const rpcUrl = process.env.RPC_URL as string;
const privateKey = process.env.PRIVATE_KEY as `0x${string}`;

const account = privateKeyToAccount(privateKey, { nonceManager });

const publicClient = createPublicClient({
  transport: http(rpcUrl),
});

const walletCLient = createWalletClient({
  transport: http(rpcUrl),
  account,
});

const SETTLEMENT_CONTRACT = process.env.SETTLEMENT_CONTRACT;

const safeJSONStringify = (value: any): string => {
  const bigIntReplacer = (_key: string, val: any) => {
    if (typeof val === 'bigint') {
      return val.toString();
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return val;
  };

  return JSON.stringify(value, bigIntReplacer);
};

type Trade = {
  orderId: string;
  user: string;
  size: number;
  side: string;
  price: number;
};

@Injectable()
export class OrderService {
  private readonly logger = new SafeLogger(OrderService.name);
  orderbooks: { [key: string]: { ob: OrderBook; pair: Pair } } = {};

  async onApplicationBootstrap() {
    this.logger.debug({ message: 'getting all pairs' });
    const allPairs = await this.repository.getPairs();

    allPairs.forEach((pair) => {
      let thisOrderbook: OrderBook;
      this.logger.debug({
        message: 'checking if pair has snapshot',
        snapshot: pair?.snapshot,
      });
      if (pair?.snapshot) {
        thisOrderbook = new OrderBook({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          snapshot: JSON.parse(pair.snapshot.content),
        });
      } else {
        thisOrderbook = new OrderBook();
      }

      this.orderbooks[`${pair.pairName}`] = {
        ob: thisOrderbook,
        pair,
      };

      // const testOb = this.orderbooks['bazed-musd'].ob;

      // const depth = testOb.depth();
      // console.log('depth', depth);
      // const buyMarketPrice = testOb.calculateMarketPrice(Side.BUY, 1);
      // const sellMarketPrice = testOb.calculateMarketPrice(Side.SELL, 4);

      // console.log('buyMarketPrice', buyMarketPrice);
      // console.log('sellMarketPrice', sellMarketPrice);
      // console.log('marketprice', testOb.marketPrice);
    });
    this.startMarketPriceSaver();
  }

  constructor(
    private readonly repository: OrderRepository,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  async processOrder(pairName: string, order: IProcessOrder) {
    const retVal: Array<Trade> = [];
    const dones = order.done;

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    dones.forEach(async (done: ILimitOrder) => {
      const orderDetails = await this.repository.getOrder(done.id);

      retVal.push({
        orderId: done.id,
        user: orderDetails?.creator as string,
        size: done.size,
        side: done.side,
        price: done.price,
      });
    });

    const partial = order.partial;
    if (partial) {
      const orderDetails = await this.repository.getOrder(partial.id);

      retVal.push({
        orderId: partial.id,
        user: orderDetails?.creator as string,
        size: order.partialQuantityProcessed,
        side: partial.side,
        price: partial.price,
      });
    }

    await this.repository.updateSnapshotByName(
      pairName,
      JSON.stringify(this.orderbooks[pairName].ob.snapshot()),
    );

    if (retVal.length > 0) {
      // execute trade
      const txHash = await this.executeTrade(retVal);
      // return retVal;
      return { txHash };
    } else {
      return { message: 'Order added' };
    }

    // this.logger.log('partialQuantityProcessed', order.partialQuantityProcessed);
  }

  createOrders(pairName: string, order: CreateOrderDto) {
    // check if pairName exists in the orderbook
    const ob = this.orderbooks[pairName];

    if (ob) {
      const output = this.create(pairName, order);
      return output;
    } else {
      throw new BadRequestException('Pair does not exists');
    }
  }

  generateId(o: CreateOrderIdDto) {
    const orderId = `${o.pairId}:${o.userAddress}:${o.type}:${o.quantity}:@${o.price}:${+new Date()}`;
    return { orderId };
  }

  async create(pairName: string, order: CreateOrderDto) {
    // verify Signature
    try {
      // const isValid = await verifyMessage({
      //   address: order.userAddress,
      //   message: order.orderId,
      //   signature: order.signature as `0x${string}`,
      // });
      // if (!isValid) throw new BadRequestException('Signature is invalid');

      const limitOrderId = order.orderId;

      await this.repository.saveOrder({
        order_id: limitOrderId,
        creator: order.userAddress,
        signature: order.signature,
        status: 'open',
      });

      this.logger.debug({ message: 'order', order });

      const obChanges = this.orderbooks[pairName].ob.limit({
        id: limitOrderId,
        side: order.type === 'buy' ? Side.BUY : Side.SELL,
        size: order.quantity,
        price: order.price,
      });

      this.logger.debug({ message: 'obChanges', obChanges });
      return this.processOrder(pairName, obChanges);
    } catch (error) {
      throw new BadRequestException('Unable to process order');
    }
  }

  async getOpenOrders(creator: string) {
    return await this.repository.getOrderByStatus(creator, 'open');
  }

  getOrderDetails(pairName: string, orderId: string) {
    const thisOb = this.orderbooks[pairName];
    return thisOb.ob.order(orderId);
  }

  async executeTrade(trades: Trade[]) {
    const first = trades[0];

    const pairId = first.orderId.split(':')[0];
    const pairDetails: Pair = this.orderbooks[pairId].pair;
    if (!pairDetails) {
      console.error('Pair not supported');
      throw new BadRequestException('Pair not found');
    }

    const sellTrades = trades.filter((tr) => tr.side === 'sell');
    const buyTrades = trades.filter((tr) => tr.side === 'buy');

    const trade = {
      asks: await Promise.all(
        sellTrades.map(async (tr) => {
          const tradeOrderDetails = await this.repository.getOrder(tr.orderId);
          // update
          await this.repository.updateOrderStatus(tr.orderId, 'matched');

          return {
            user: tr.user,
            size: BigInt(tr.size),
            orderId: tr.orderId,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            signature: tradeOrderDetails?.signature,
          };
        }),
      ),
      bids: await Promise.all(
        buyTrades.map(async (tr) => {
          const tradeOrderDetails = await this.repository.getOrder(tr.orderId);
          await this.repository.updateOrderStatus(tr.orderId, 'matched');

          return {
            user: tr.user,
            size: BigInt(tr.size),
            orderId: tr.orderId,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            signature: tradeOrderDetails?.signature,
          };
        }),
      ),
      totalSize: BigInt(trades[0].size),
      unitPrice: BigInt(trades[0].price),
      baseToken: pairDetails.baseToken,
      quoteToken: pairDetails.quoteToken,
      tokenId: pairDetails.tokenId || 0n,
      baseTokenType: pairDetails.baseTokenType,
      quoteTokenType: pairDetails.quoteTokenType,
    };
    const args = [trade];

    this.logger.debug({ message: 'preparing tx with args', args });

    const { result, request } = await publicClient.simulateContract({
      address: SETTLEMENT_CONTRACT as `0x${string}`,
      abi: SettlementArtifacts.abi,
      functionName: 'executeTrade',
      args,
      account,
    });

    this.logger.debug({ message: 'simulateContract', result });

    const hash = await walletCLient.writeContract(request);
    this.logger.debug({ message: 'submitted tx', hash });

    await this.repository.saveTrade({
      txHash: hash,
      submitted: new Date(),
      callArgs: safeJSONStringify(args),
      status: 'open'
    });

    return hash;
  }

  async createPair(createPair: CreatePairDto) {
    const newPair = await this.repository.createPair(createPair);

    // TODO: add this new pair to the orderbook list
    this.orderbooks[`${newPair.pairName}`] = {
      ob: new OrderBook(),
      pair: newPair,
    };
    return newPair;
  }

  orderbookStatus(pairName: string) {
    // const retVal = {};

    const selectedOb = this.orderbooks[pairName];
    const thisSnapshot = selectedOb.ob.snapshot();
    return {
      bids: thisSnapshot.bids,
      asks: thisSnapshot.asks,
      pair: selectedOb.pair,
    };
  }

  marketPrice() {
    const retVal = {};
    Object.keys(this.orderbooks).forEach((k) => {
      // ORIG formula
      // const marketPrice = this.orderbooks[k].ob.marketPrice;
      const marketPrice = this.orderbooks[k].ob.calculateMarketPrice(
        Side.BUY,
        1,
      );
      this.logger.log({
        message: 'marketprice',
        pair: k,
        marketPrice: marketPrice.price,
      });

      retVal[k] = { marketPrice: marketPrice.price };
    });
    return retVal;
  }

  async getCandlestickData(pairName: string) {
    const orderbook = this.orderbooks[pairName];
    if (!orderbook) {
      throw new NotFoundException('Pair not found');
    }

    try {
      // Group data into 5-minute intervals
      const candlesticks: Record<number, any[]> = {};
      const INTERVAL_IN_MINUTE = 0.5; // originally 5
      const FIVE_MINUTES = INTERVAL_IN_MINUTE * 60 * 1000; // 5 minutes in milliseconds

      const marketPriceRecords =
        await this.repository.getAllMarketPrice(pairName);
      const dataPoints = marketPriceRecords
        .filter((record) => record.marketprice > 0)
        .map((record) => {
          return {
            ts: Number(record.timestamp),
            price: Number(record.marketprice),
          };
        });

      dataPoints.forEach((point) => {
        const intervalKey = Math.floor(point.ts / FIVE_MINUTES) * FIVE_MINUTES;
        if (!candlesticks[intervalKey]) {
          candlesticks[intervalKey] = [];
        }
        candlesticks[intervalKey].push(point);
      });

      // Calculate OHLC for each interval
      const result = Object.keys(candlesticks)
        .sort((a, b) => parseInt(a) - parseInt(b))
        .map((intervalKey) => {
          const interval = candlesticks[intervalKey];

          // Sort by timestamp to get open and close
          const sortedByTime = [...interval].sort((a, b) => a.ts - b.ts);
          const open = sortedByTime[0].price;
          const close = sortedByTime[sortedByTime.length - 1].price;

          // Sort by price to get high and low
          const sortedByPrice = [...interval].sort((a, b) => a.price - b.price);
          const low = sortedByPrice[0].price;
          const high = sortedByPrice[sortedByPrice.length - 1].price;

          return {
            timestamp: parseInt(intervalKey),
            open,
            high,
            low,
            close,
            trades: interval.length,
          };
        });

      return result;
    } catch (error) {
      this.logger.error({
        message: `Failed to generate candlestick data: ${error.message}`,
      });
      return [];
    }
  }

  startMarketPriceSaver() {
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    const job = setInterval(async () => {
      const marketPrices = this.marketPrice();
      this.logger.debug({ message: 'marketprice', marketPrices });
      const x = Object.keys(marketPrices).map((key) => {
        const pairInfo = this.orderbooks[key].pair;
        return this.repository.saveMarketPrice({
          pair_id: pairInfo.id,
          timestamp: new Date(),
          marketprice: BigInt(marketPrices[key].marketPrice),
        });
      });

      this.logger.debug({ message: 'saving marketprice to database' });
      await Promise.all(x);
    }, 5000);

    this.schedulerRegistry.addInterval('marketprice-saver', job);
  }
}
