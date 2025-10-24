# PayNeu CLOB API

A Central Limit Order Book (CLOB) matching engine API built with NestJS for managing trading pairs, orders, and market data.

## Features

- **Order Management**: Create, submit, and track orders
- **Trading Pairs**: Dynamic creation and management of trading pairs
- **Order Book**: Real-time order book status and matching
- **Market Data**: Market prices and candlestick data
- **Blockchain Integration**: Support for token-based trading with Ethereum integration
- **API Documentation**: Auto-generated Swagger/OpenAPI documentation

## Tech Stack

- **Framework**: NestJS 11.x
- **Language**: TypeScript
- **Database**: Prisma ORM
- **Order Matching**: nodejs-order-book
- **Blockchain**: viem (Ethereum library)
- **Validation**: Zod
- **Documentation**: Swagger/OpenAPI
- **Node**: v22.x

## Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
npx prisma migrate dev

# Generate Prisma client
npx prisma generate
```

## Running the Application

```bash
# Development mode
npm run start:dev

# Production mode
npm run build
npm run start:prod

# Debug mode
npm run start:debug
```

The API will be available at `http://localhost:3000`

Swagger documentation: `http://localhost:3000/doc`

## API Endpoints

### Order Management

- `POST /order/id` - Generate an order ID
- `POST /order/pair` - Create a new trading pair
- `POST /order/:pairName` - Submit an order for a specific pair
- `GET /order/:pairName/all` - Get order book status for a pair
- `GET /order/marketprice` - Get current market prices
- `GET /order/:pairName/candlestick` - Get candlestick data for a pair
- `GET /order/orders/:creatorAddress` - Get open orders by creator address

## Usage Examples

### Create a New Trading Pair

```bash
curl -X POST http://localhost:3000/order/pair \
  -H "Content-Type: application/json" \
  -d '{
    "baseTokenSymbol": "baze",
    "quoteTokenSymbol": "musd",
    "baseTokenType": 1,
    "quoteTokenType": 1,
    "baseToken": "0x8ec7d893f57b6a7c837bc93cfb4c01b80f58ba6b",
    "quoteToken": "0x35435120c2cf51f7f122f2b37bda3bbc686831de"
  }'
```

## Contributing

Built by [@sleepbuildrun](https://x.com/sleepbuildrun)

## License

Copyright 2025 PayNeu. All rights reserved.
