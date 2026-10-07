import { HttpStatus } from '@nestjs/common';

import { ERROR_CODES } from '@common/constants';
import { AppException } from '@common/exceptions/app.exception';

import { IDENTITY_VERIFICATION_REQUIRED_MESSAGE } from '../constants';

/** An earning feature was used before the person uploaded PAN or an identity document. */
export class IdentityVerificationRequiredException extends AppException {
  constructor() {
    super({
      code: ERROR_CODES.IDENTITY_VERIFICATION_REQUIRED,
      message: IDENTITY_VERIFICATION_REQUIRED_MESSAGE,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}
