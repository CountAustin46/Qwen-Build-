export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'developer' | 'admin';
}

export class AuthService {
  private currentUser: AuthUser = {
    id: 'usr_default_dev',
    email: 'developer@qwenbuild.local',
    name: 'Qwen Lead Engineer',
    role: 'developer',
  };

  public getCurrentUser(): AuthUser {
    return this.currentUser;
  }

  public verifyProjectAccess(userId: string, projectOwnerId?: string): boolean {
    if (!projectOwnerId) return true;
    return userId === projectOwnerId;
  }

  public generateSessionToken(user: AuthUser): string {
    return `qwen_sess_${user.id}_${Date.now()}`;
  }
}

export const authService = new AuthService();
