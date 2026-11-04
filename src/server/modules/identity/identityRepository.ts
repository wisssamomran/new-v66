import { User, Organization } from '../../../types';
import { storageManager } from '../../storage/storageManager';

export class IdentityRepository {
  private static instance: IdentityRepository;

  public static getInstance(): IdentityRepository {
    if (!IdentityRepository.instance) {
      IdentityRepository.instance = new IdentityRepository();
    }
    return IdentityRepository.instance;
  }

  // --- Users Operations ---
  public getUsers(): User[] {
    return [...storageManager.data.users];
  }

  public getUserById(id: string): User | undefined {
    return storageManager.data.users.find(u => u.id === id);
  }

  public getUserBySupabaseId(supabaseUserId: string): User | undefined {
    return storageManager.data.users.find(u => u.supabaseUserId === supabaseUserId);
  }

  public getUserByEmailOrPhone(identifier: string): User | undefined {
    const clean = identifier.trim().toLowerCase();
    const cleanPhone = identifier.replace(/[\s\-\(\)\+]/g, '');
    return storageManager.data.users.find(u => {
      if (u.email && u.email.toLowerCase() === clean) return true;
      if (u.id === identifier) return true;
      if (u.supabaseUserId === identifier) return true;
      if (u.phone) {
        const uPhoneClean = u.phone.replace(/[\s\-\(\)\+]/g, '');
        if (uPhoneClean === cleanPhone) return true;
        if (cleanPhone.length >= 7 && uPhoneClean.endsWith(cleanPhone)) return true;
      }
      return false;
    });
  }

  public updateUser(id: string, updates: Partial<User>): User | undefined {
    const index = storageManager.data.users.findIndex(u => u.id === id);
    if (index === -1) return undefined;
    storageManager.data.users[index] = {
      ...storageManager.data.users[index],
      ...updates
    };
    storageManager.persist();
    storageManager.syncPgUser(storageManager.data.users[index]);
    return storageManager.data.users[index];
  }

  public toggleUserStatus(id: string): User | undefined {
    const index = storageManager.data.users.findIndex(u => u.id === id);
    if (index === -1) return undefined;
    storageManager.data.users[index].activeStatus = !storageManager.data.users[index].activeStatus;
    storageManager.persist();
    return storageManager.data.users[index];
  }

  // --- Organizations Operations ---
  public getOrganizations(): Organization[] {
    return [...storageManager.data.organizations];
  }

  public getOrganizationById(id: string): Organization | undefined {
    return storageManager.data.organizations.find(o => o.id === id);
  }

  public updateOrganization(id: string, updates: Partial<Organization>): Organization | undefined {
    const index = storageManager.data.organizations.findIndex(o => o.id === id);
    if (index === -1) return undefined;
    storageManager.data.organizations[index] = {
      ...storageManager.data.organizations[index],
      ...updates
    };
    storageManager.persist();
    return storageManager.data.organizations[index];
  }
}

export const identityRepository = IdentityRepository.getInstance();
