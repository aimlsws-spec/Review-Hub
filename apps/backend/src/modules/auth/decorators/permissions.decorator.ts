import { SetMetadata } from '@nestjs/common';

import { SystemPermission } from '@common/enums';

export const PERMISSIONS_KEY = 'auth_permissions';
export const Permissions = (...permissions: (SystemPermission | string)[]) => SetMetadata(PERMISSIONS_KEY, permissions);
