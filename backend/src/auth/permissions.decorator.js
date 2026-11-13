import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

// Usage: @RequirePermissions('approval:review')
export const RequirePermissions = (...permissions) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
