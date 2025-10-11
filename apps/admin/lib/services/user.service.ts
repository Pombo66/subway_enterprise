import { bff, bffWithErrorHandling } from '../api';
import { 
  User, 
  CreateUserRequest, 
  UpdateUserRequest, 
  UserQuery, 
  UsersResponse,
  UserSchema
} from '../types/user.types';
import { z } from 'zod';

const UsersResponseSchema = z.object({
  users: z.array(UserSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});

export class UserService {
  static async getUsers(query: UserQuery): Promise<UsersResponse> {
    const searchParams = new URLSearchParams();
    
    if (query.search) searchParams.set('search', query.search);
    if (query.role) searchParams.set('role', query.role);
    searchParams.set('page', query.page.toString());
    searchParams.set('limit', query.limit.toString());

    return bff(`/settings/users?${searchParams.toString()}`, UsersResponseSchema);
  }

  static async getUserById(id: string): Promise<User> {
    return bff(`/settings/users/${id}`, UserSchema);
  }

  static async createUser(data: CreateUserRequest): Promise<{ success: true; user: User } | { success: false; error: string }> {
    const result = await bffWithErrorHandling<User>('/settings/users', UserSchema, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    
    if (result.success) {
      return { success: true, user: result.data };
    } else {
      return { success: false, error: result.error };
    }
  }

  static async updateUser(id: string, data: UpdateUserRequest): Promise<{ success: true; user: User } | { success: false; error: string }> {
    const result = await bffWithErrorHandling<User>(`/settings/users/${id}`, UserSchema, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    
    if (result.success) {
      return { success: true, user: result.data };
    } else {
      return { success: false, error: result.error };
    }
  }

  static async deleteUser(id: string): Promise<{ success: true } | { success: false; error: string }> {
    return bffWithErrorHandling(`/settings/users/${id}`, z.object({}), {
      method: 'DELETE',
    });
  }
}