import { HttpStatus } from '@nestjs/common';

import { ERROR_CODES } from '@common/constants';
import { AppException } from '@common/exceptions/app.exception';

/** The platform is switched to maintenance and this caller is not an administrator. */
export class MaintenanceException extends AppException {
  constructor(message: string) {
    super({ code: ERROR_CODES.MAINTENANCE_MODE, message, statusCode: HttpStatus.SERVICE_UNAVAILABLE });
  }
}

/** The app is older than the oldest version the server still supports. */
export class AppUpdateRequiredException extends AppException {
  constructor(minimumVersion: string, updateUrl: string | null) {
    super({
      code: ERROR_CODES.APP_UPDATE_REQUIRED,
      message: 'A new version of the app is required. Please update to continue.',
      // 426 Upgrade Required: Nest has no named constant for it.
      statusCode: 426 as HttpStatus,
      details: { minimumVersion, updateUrl },
    });
  }
}
