import { SetMetadata } from '@nestjs/common';

import { SystemRole } from '@common/enums';

export const ROLES_KEY = 'auth_roles';
export const Roles = (...roles: (SystemRole | string)[]) => SetMetadata(ROLES_KEY, roles);
