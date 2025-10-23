import { Logger } from '@nestjs/common';

export class SafeLogger {
  logger: Logger;
  constructor(name: string) {
    this.logger = new Logger(name, {
      timestamp: false,
    });
  }

  safeJSONStringify(value: any): string {
    const bigIntReplacer = (_key: string, val: any) => {
      if (typeof val === 'bigint') {
        return val.toString();
      }
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return val;
    };

    return JSON.stringify(value, bigIntReplacer);
  }

  log(logObject: object) {
    this.logger.log(this.safeJSONStringify(logObject));
  }

  debug(logObject: object) {
    this.logger.debug(this.safeJSONStringify(logObject));
  }

  error(logObject: object) {
    this.logger.error(this.safeJSONStringify(logObject));
  }
}
