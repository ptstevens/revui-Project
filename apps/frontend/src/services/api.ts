import axios from 'axios';

// Use environment-specific API URL
// Development: Uses Vite proxy (/api/v1 → https://api.revui.app)
// Production: Uses direct API URL (https://api.revui.app/api/v1)
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Required for httpOnly cookie sessions
});

export interface RegisterOrganizationData {
  organizationName: string;
  adminEmail: string;
  adminName: string;
  industry?: string;
  companySize?: string;
}

export interface RegisterResponse {
  data: {
    organizationId: string;
    tenantId: string;
    organizationName: string;
    adminEmail: string;
    message: string;
  };
}

export interface VerifyEmailResponse {
  data: {
    message: string;
    organizationName: string;
    email: string;
  };
}

export const organizationApi = {
  register: (data: RegisterOrganizationData): Promise<RegisterResponse> => {
    return api.post('/organizations/register', data);
  },

  verifyEmail: (token: string): Promise<VerifyEmailResponse> => {
    return api.get(`/organizations/verify-email?token=${token}`);
  },
};

// Authentication API - Refactor: Added password-based authentication
export interface SignupData {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  organizationName: string;
}

export interface LoginData {
  email: string;
  password: string;
  deviceName?: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

export interface AuthResponse {
  data: {
    success: boolean;
    message: string;
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
    };
    organization?: {
      id: string;
      name: string;
    };
  };
}

export interface LogoutResponse {
  data: {
    success: boolean;
    message: string;
  };
}

export const authApi = {
  signup: (data: SignupData): Promise<AuthResponse> => {
    return api.post('/auth/signup', data);
  },

  login: (data: LoginData): Promise<AuthResponse> => {
    return api.post('/auth/login', data);
  },

  logout: (): Promise<LogoutResponse> => {
    return api.post('/auth/logout');
  },

  changePassword: (data: ChangePasswordData): Promise<LogoutResponse> => {
    return api.post('/auth/change-password', data);
  },
};

export default api;
