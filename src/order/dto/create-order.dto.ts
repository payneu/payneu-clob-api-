import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';

// CreateOrder
export const CreateOrderSchema = z.object({
  orderId: z.string(),
  userAddress: z.string(),
  pairId: z.string(),
  type: z.string(),
  price: z.any(),
  quantity: z.any(),
  signature: z.string(),
});

type CreateOrderSchema = z.infer<typeof CreateOrderSchema>;

export class CreateOrderDto implements CreateOrderSchema {
  @ApiProperty({
    required: true,
    example:
      'bunny-musd:0x284BB36A374bbe57349E3D8Fe56b70953f95ab16:sell:10000000000000000000:@2500000000000000:1759801332968',
  })
  orderId: string;

  @ApiProperty({
    required: true,
    example: '0x284BB36A374bbe57349E3D8Fe56b70953f95ab16',
  })
  userAddress: `0x${string}`;

  @ApiProperty({
    required: true,
    example: 'bunny-musd',
  })
  pairId: string;

  @ApiProperty({
    required: true,
    example: 'buy',
  })
  type: 'buy' | 'sell';

  @ApiProperty({
    required: true,
    example: 2500000000000000,
  })
  price: number;

  @ApiProperty({
    required: true,
    example: 10000000000000000000,
  })
  quantity: number;

  @ApiProperty({
    required: true,
    example:
      '0x550443fa782794a8d1c03b6c7f468809fc5733b71e77d1f048fb8d5794c067861b9021428919eab6922e6b9b96ace46fddc05e44934580341ad8030234b5e4eb1c',
  })
  signature: string;
}

// CreateOrderId
export const CreateOrderIdSchema = z.object({
  userAddress: z.string(),
  pairId: z.string(),
  type: z.enum(['buy', 'sell']),
  price: z.any(),
  quantity: z.any(),
});

type CreateOrderIdType = z.infer<typeof CreateOrderIdSchema>;

export class CreateOrderIdDto implements CreateOrderIdType {
  @ApiProperty({
    required: true,
    example: '0x284BB36A374bbe57349E3D8Fe56b70953f95ab16',
  })
  userAddress: `0x${string}`;

  @ApiProperty({ required: true, example: 'bunny-musd' })
  pairId: string;

  @ApiProperty({ required: true, example: 'buy' })
  type: 'buy' | 'sell';

  @ApiProperty({ required: true, example: 2500000000000000 })
  price: string;

  @ApiProperty({ required: true, example: 10000000000000000000 })
  quantity: string;
}
