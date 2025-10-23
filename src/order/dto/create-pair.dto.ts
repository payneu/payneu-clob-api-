import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';

// CreatePair
export const CreatePairSchema = z.object({
  baseTokenSymbol: z.string(),
  quoteTokenSymbol: z.string(),
  baseTokenType: z.number(),
  quoteTokenType: z.number(),
  tokenId: z.number().optional(),
  baseToken: z.string(),
  quoteToken: z.string(),
});

type CreatePairType = z.infer<typeof CreatePairSchema>;

export class CreatePairDto implements CreatePairType {
  @ApiProperty({
    required: true,
    example: 'firetoken',
  })
  baseTokenSymbol: string;

  @ApiProperty({
    required: true,
    example: 'musd',
  })
  quoteTokenSymbol: string;

  @ApiProperty({
    required: true,
    example: '2',
    description: '1-ERC20, 2-ERC1155',
  })
  baseTokenType: number;

  @ApiProperty({
    required: true,
    example: '1',
  })
  quoteTokenType: number;

  @ApiProperty({
    required: true,
    example: '112233',
    description: 'Required for ERC-1155',
  })
  tokenId: number;

  @ApiProperty({
    required: true,
    example: '0x7470075fA4d15fD57774481D52612eBc89d3E002',
  })
  baseToken: string;

  @ApiProperty({
    required: true,
    example: '0x31B61A616eC02E67219780910b15B75c9a427A0C',
  })
  quoteToken: string;
}
