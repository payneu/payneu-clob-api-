import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { z } from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: z.ZodType) {}

  transform(value: unknown, metadata: { type: string }) {
    console.log('value', value);
    try {
      if (metadata.type === 'body') {
        return this.schema.parse(value);
      } else {
        return value;
      }
    } catch (error) {
      console.error(error);
      throw new BadRequestException(
        'Validation failed',
        JSON.parse(error.message),
      );
    }
  }
}
