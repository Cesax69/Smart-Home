import { User, FamilyStats } from '../types/User';
import { databaseService } from '../config/database';

// Datos mockeados de miembros de la familia
const mockFamilyMembers: User[] = [
  { 
    id: 1, 
    name: "Admin Usuario", 
    role: "leader", 
    familyRole: "jefe del hogar",
    age: 35,
    avatar: "👨‍💼",
    tasksCompleted: 8,
    joinedAt: new Date('2020-01-01'),
    isActive: true
  },
  { 
    id: 2, 
    name: "Member Usuario", 
    role: "member", 
    familyRole: "miembro",
    age: 30,
    avatar: "👩‍💼",
    tasksCompleted: 12,
    joinedAt: new Date('2020-01-01'),
    isActive: true
  }
];

// Eliminados los datos mock de autenticación: ahora se usa PostgreSQL

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

  // Métodos para autenticación
  /**
   * Busca un usuario por ID para autenticación
   * @param id - ID del usuario
   * @returns Usuario encontrado o undefined
   */
  public async findById(id: number): Promise<any | undefined> {
    const query = `
      SELECT id, username, email, password_hash, first_name, last_name, family_role_id, family_sub_role_id, created_at, updated_at
      FROM users
      WHERE id = $1
    `;
    const result = await databaseService.query(query, [id]);
    if (!result.rows.length) return undefined;
    const row = result.rows[0] as any;
    // Mapear a la forma esperada por AuthController
    return {
      id: row.id,
      username: row.username,
      email: row.email,
      password: row.password_hash,
      firstName: row.first_name,
      lastName: row.last_name,
      role: row.family_role_id === 1 ? 'head_of_household' : 'family_member',
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * Busca un usuario por username o email
   * @param username - Username a buscar
   * @param email - Email a buscar (opcional)
   * @returns Usuario encontrado o undefined
   */
  public async findByUsernameOrEmail(username: string, email?: string): Promise<any | undefined> {
    const query = `
      SELECT id, username, email, password_hash, first_name, last_name, family_role_id, family_sub_role_id, created_at, updated_at
      FROM users
      WHERE username = $1 OR email = $2
      LIMIT 1
    `;
    const result = await databaseService.query(query, [username, email || username]);
    if (!result.rows.length) return undefined;
    const row = result.rows[0] as any;
    return {
      id: row.id,
      username: row.username,
      email: row.email,
      password: row.password_hash,
      firstName: row.first_name,
      lastName: row.last_name,
      role: row.family_role_id === 1 ? 'head_of_household' : 'family_member',
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * Crea un nuevo usuario
   * @param userData - Datos del usuario a crear
   * @returns Usuario creado
   */
  public async createUser(userData: {
    username: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: string;
  }): Promise<any> {
    // mapear role a family_role_id
    const familyRoleId = userData.role === 'head_of_household' ? 1 : 2;
    const query = `
      INSERT INTO users (username, email, password_hash, first_name, last_name, family_role_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, username, email, password_hash, first_name, last_name, family_role_id, created_at, updated_at
    `;
    const result = await databaseService.query(query, [
      userData.username,
      userData.email,
      userData.password,
      userData.firstName,
      userData.lastName,
      familyRoleId
    ]);
    const row = result.rows[0] as any;
    return {
      id: row.id,
      username: row.username,
      email: row.email,
      password: row.password_hash,
      firstName: row.first_name,
      lastName: row.last_name,
      role: row.family_role_id === 1 ? 'head_of_household' : 'family_member',
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}