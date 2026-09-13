export type UserRole =
  | 'CALA'
  | 'PROJECT_DIRECTOR'
  | 'REVENUE_OFFICER'
  | 'LEGAL_OFFICER'
  | 'SUPER_ADMIN';

export type UserStatus = 'ACTIVE' | 'INACTIVE';

export interface AuthUser {
  id: string;
  official_id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  state: string;
  district: string;
  status: UserStatus;
  created_at?: string;
  last_login?: string | null;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    token: string;
    user: AuthUser;
  };
}

export interface LoginCredentials {
  official_id: string;
  password: string;
}
