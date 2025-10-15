import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
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
