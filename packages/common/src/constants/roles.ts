export const ROLES = {
  ADMIN: 'ADMIN',
  OWNER: 'OWNER',
  TEACHER: 'TEACHER',
  PARTICIPANT: 'PARTICIPANT',
  OBSERVER: 'OBSERVER',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];