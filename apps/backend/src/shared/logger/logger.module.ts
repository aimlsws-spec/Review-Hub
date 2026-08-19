import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import 'winston-daily-rotate-file';

import { AppLogger } from './app-logger.service';

@Global()
@Module({
  imports: [
    WinstonModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const env = config.get<string>('app.env', 'development');
        const isDev = env === 'development';
        const logLevel = config.get<string>('LOG_LEVEL', isDev ? 'debug' : 'info');

        const consoleFormat = isDev
          ? winston.format.combine(
              winston.format.colorize(),
              winston.format.timestamp({ format: 'HH:mm:ss' }),
              winston.format.printf(({ timestamp, level, message, context, trace }) => {
                const ctx = context ? ` [${String(context)}]` : '';
                const tr = trace ? `\n${String(trace)}` : '';
                return `${String(timestamp)} ${level}${ctx}: ${String(message)}${tr}`;
              }),
            )
          : winston.format.combine(
              winston.format.timestamp(),
              winston.format.json(),
            );

        const fileFormat = winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
        );

        const transports: winston.transport[] = [
          new winston.transports.Console({ format: consoleFormat }),
        ];

        if (config.get<string>('LOG_FILE_ENABLED', 'true') === 'true') {
          transports.push(
            new (winston.transports as unknown as Record<string, new (opts: object) => winston.transport>)['DailyRotateFile']({
              filename: 'logs/app-%DATE%.log',
              datePattern: 'YYYY-MM-DD',
              zippedArchive: true,
              maxSize: config.get<string>('LOG_FILE_MAX_SIZE', '20m'),
              maxFiles: config.get<string>('LOG_FILE_MAX_FILES', '14d'),
              level: logLevel,
              format: fileFormat,
            }),
            new (winston.transports as unknown as Record<string, new (opts: object) => winston.transport>)['DailyRotateFile']({
              filename: 'logs/error-%DATE%.log',
              datePattern: 'YYYY-MM-DD',
              zippedArchive: true,
              maxSize: '20m',
              maxFiles: '30d',
              level: 'error',
              format: fileFormat,
            }),
          );
        }

        return { level: logLevel, transports };
      },
    }),
  ],
  providers: [AppLogger],
  exports: [AppLogger],
})
export class LoggerModule {}

