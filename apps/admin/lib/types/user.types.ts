import { z } from 'zod';

export const UserRoleSchema = z.enum(['ADMIN', 'MANAGER', 'STAFF']);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  role: UserRoleSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const CreateUserSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  role: UserRoleSchema.default('STAFF'),
});

export const UpdateUserSchema = z.object({
  email: z.string().email('Please enter a valid email address').optional(),
  role: UserRoleSchema.optional(),
});

export const UserQuerySchema = z.object({
  search: z.string().optional(),
  role: UserRoleSchema.optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export type User = z.infer<typeof UserSchema>;
export type CreateUserRequest = z.infer<typeof CreateUserSchema>;
export type UpdateUserRequest = z.infer<typeof UpdateUserSchema>;
export type UserQuery = z.infer<typeof UserQuerySchema>;

export interface UsersResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}