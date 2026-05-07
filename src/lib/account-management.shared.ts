import type { AppRole } from "@/lib/rbac";

export interface ManagedUserAccount {
  id: number;
  username: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: AppRole;
  status: string | null;
  lastLogin: string | null;
  createdAt: string | null;
  isCurrentUser: boolean;
}
