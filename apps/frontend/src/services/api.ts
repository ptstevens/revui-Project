import axios from 'axios';

// Use environment-specific API URL
// Development: Uses Vite proxy (/api/v1 → https://api.revui.app)
// Production: Uses direct API URL (https://api.revui.app/api/v1)
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
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

export default api;
