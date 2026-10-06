// The migration registry only imports table definitions; importing it never opens a connection.
export { accounts, sessions } from '@/backend/auth/infrastructure/database/schema';
export { learnerProfiles, users } from '@/backend/users/infrastructure/database/schema';
