import { User, FamilyStats } from '../types/User';

// Datos mockeados de miembros de la familia
const mockFamilyMembers: User[] = [
  { 
    id: 1, 
    name: "Papá García", 
    role: "leader", 
    familyRole: "padre",
    age: 42,
    avatar: "👨‍💼",
    tasksCompleted: 8,
    joinedAt: new Date('2020-01-01'),
    isActive: true
  },
  { 
    id: 2, 
    name: "Mamá García", 
    role: "leader", 
    familyRole: "madre",
    age: 38,
    avatar: "👩‍💼",
    tasksCompleted: 12,
    joinedAt: new Date('2020-01-01'),
    isActive: true
  },
  { 
    id: 3, 
    name: "María García", 
    role: "member", 
    familyRole: "hija",
    age: 16,
    avatar: "👧",
    tasksCompleted: 5,
    joinedAt: new Date('2020-01-01'),
    isActive: true
  },
  { 
    id: 4, 
    name: "Carlos García", 
    role: "member", 
    familyRole: "hijo",
    age: 12,
    avatar: "👦",
    tasksCompleted: 3,
    joinedAt: new Date('2020-01-01'),
    isActive: true
  }
];

export class UserService {
  /**
   * Obtiene todos los miembros de la familia
   * @returns Array de miembros de la familia
   */
  public getAllFamilyMembers(): User[] {
    return mockFamilyMembers.filter(member => member.isActive);
  }

  /**
   * Obtiene un miembro de la familia por su ID
   * @param id - ID del miembro a buscar
   * @returns Miembro encontrado o undefined si no existe
   */
  public getFamilyMemberById(id: number): User | undefined {
    return mockFamilyMembers.find(member => member.id === id && member.isActive);
  }

  /**
   * Obtiene los líderes del hogar (padres/tutores)
   * @returns Array de líderes del hogar
   */
  public getFamilyLeaders(): User[] {
    return mockFamilyMembers.filter(member => member.role === 'leader' && member.isActive);
  }

  /**
   * Obtiene los miembros del hogar (hijos)
   * @returns Array de miembros del hogar
   */
  public getFamilyMembers(): User[] {
    return mockFamilyMembers.filter(member => member.role === 'member' && member.isActive);
  }

  /**
   * Obtiene estadísticas de la familia
   * @returns Estadísticas de la familia
   */
  public getFamilyStats(): FamilyStats {
    const activeMembers = mockFamilyMembers.filter(member => member.isActive);
    return {
      totalMembers: activeMembers.length,
      leaders: activeMembers.filter(member => member.role === 'leader').length,
      members: activeMembers.filter(member => member.role === 'member').length,
      activeMembers: activeMembers.length
    };
  }

  /**
   * Verifica si existe un miembro con el ID especificado
   * @param id - ID del miembro a verificar
   * @returns true si el miembro existe, false en caso contrario
   */
  public familyMemberExists(id: number): boolean {
    return mockFamilyMembers.some(member => member.id === id && member.isActive);
  }

  /**
   * Agrega un nuevo miembro a la familia
   * @param memberData - Datos del nuevo miembro
   * @returns El miembro creado
   */
  public addFamilyMember(memberData: Omit<User, 'id' | 'joinedAt' | 'isActive'>): User {
    const newMember: User = {
      ...memberData,
      id: Math.max(...mockFamilyMembers.map(m => m.id)) + 1,
      joinedAt: new Date(),
      isActive: true,
      tasksCompleted: 0
    };
    mockFamilyMembers.push(newMember);
    return newMember;
  }

  /**
   * Actualiza un miembro de la familia
   * @param id - ID del miembro a actualizar
   * @param updateData - Datos a actualizar
   * @returns El miembro actualizado o undefined si no existe
   */
  public updateFamilyMember(id: number, updateData: Partial<User>): User | undefined {
    const memberIndex = mockFamilyMembers.findIndex(member => member.id === id);
    if (memberIndex === -1) return undefined;

    mockFamilyMembers[memberIndex] = { ...mockFamilyMembers[memberIndex], ...updateData };
    return mockFamilyMembers[memberIndex];
  }

  /**
   * Desactiva un miembro de la familia (soft delete)
   * @param id - ID del miembro a desactivar
   * @returns true si se desactivó correctamente, false si no existe
   */
  public deactivateFamilyMember(id: number): boolean {
    const member = mockFamilyMembers.find(member => member.id === id);
    if (!member) return false;

    member.isActive = false;
    return true;
  }

  // Métodos de compatibilidad con la API existente
  public getAllUsers(): User[] {
    return this.getAllFamilyMembers();
  }

  public getUserById(id: number): User | undefined {
    return this.getFamilyMemberById(id);
  }

  public userExists(id: number): boolean {
    return this.familyMemberExists(id);
  }
}