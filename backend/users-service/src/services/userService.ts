import { User, FamilyStats } from '../types/User';
import { databaseService } from '../config/database';

// Ahora todas las lecturas de usuarios usan PostgreSQL (tabla `users`)

// Datos mock para autenticación cuando no hay conexión a BD
const mockAuthUsers = [
  {
    id: 1,
    username: 'admin',
    email: 'admin@smarthome.com',
    password: '$2b$10$hash_for_admin_password',
    firstName: 'Admin',
    lastName: 'Usuario',
    role: 'head_of_household',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: 2,
    username: 'member',
    email: 'member@smarthome.com',
    password: '$2b$10$hash_for_member_password',
    firstName: 'Member',
    lastName: 'Usuario',
    role: 'family_member',
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02')
  }
];

export class UserService {
  /**
   * Mapea una fila de BD al modelo público User
   */
  private mapRowToUser(row: any): User {
    return {
      id: row.id,
      username: row.username,
      email: row.email,
      role: row.family_role_id === 1 ? 'head_of_household' : 'family_member',
      firstName: row.first_name,
      lastName: row.last_name,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * Obtiene todos los miembros de la familia desde la BD
   */
  public async getAllFamilyMembers(): Promise<User[]> {
    const query = `
      SELECT id, username, email, first_name, last_name, family_role_id, created_at, updated_at
      FROM users
      ORDER BY id ASC
    `;
    const result = await databaseService.query(query, []);
    return (result.rows || []).map(r => this.mapRowToUser(r));
  }

  /**
   * Obtiene un miembro de la familia por su ID
   * @param id - ID del miembro a buscar
   * @returns Miembro encontrado o undefined si no existe
   */
  public async getFamilyMemberById(id: number): Promise<User | undefined> {
    const query = `
      SELECT id, username, email, first_name, last_name, family_role_id, created_at, updated_at
      FROM users
      WHERE id = $1
      LIMIT 1
    `;
    const result = await databaseService.query(query, [id]);
    if (!result.rows.length) return undefined;
    return this.mapRowToUser(result.rows[0]);
  }

  /**
   * Obtiene los líderes del hogar (padres/tutores)
   * @returns Array de líderes del hogar
   */
  public async getFamilyLeaders(): Promise<User[]> {
    const query = `
      SELECT id, username, email, first_name, last_name, family_role_id, created_at, updated_at
      FROM users
      WHERE family_role_id = 1
      ORDER BY id ASC
    `;
    const result = await databaseService.query(query, []);
    return (result.rows || []).map(r => this.mapRowToUser(r));
  }

  /**
   * Obtiene los miembros del hogar (hijos)
   * @returns Array de miembros del hogar
   */
  public async getFamilyMembers(): Promise<User[]> {
    const query = `
      SELECT id, username, email, first_name, last_name, family_role_id, created_at, updated_at
      FROM users
      WHERE family_role_id <> 1
      ORDER BY id ASC
    `;
    const result = await databaseService.query(query, []);
    return (result.rows || []).map(r => this.mapRowToUser(r));
  }

  /**
   * Obtiene estadísticas de la familia
   * @returns Estadísticas de la familia
   */
  public async getFamilyStats(): Promise<FamilyStats> {
    const query = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN family_role_id = 1 THEN 1 ELSE 0 END) as heads,
        SUM(CASE WHEN family_role_id <> 1 THEN 1 ELSE 0 END) as members
      FROM users
    `;
    const result = await databaseService.query(query, []);
    const row = result.rows[0] || { total: 0, heads: 0, members: 0 };
    return {
      totalMembers: Number(row.total) || 0,
      headsOfHousehold: Number(row.heads) || 0,
      familyMembers: Number(row.members) || 0
    };
  }

  /**
   * Verifica si existe un miembro con el ID especificado
   * @param id - ID del miembro a verificar
   * @returns true si el miembro existe, false en caso contrario
   */
  public async familyMemberExists(id: number): Promise<boolean> {
    const result = await databaseService.query('SELECT 1 FROM users WHERE id = $1 LIMIT 1', [id]);
    return !!result.rows.length;
  }

  /**
   * Agrega un nuevo miembro a la familia
   * @param memberData - Datos del nuevo miembro
   * @returns El miembro creado
   */
  public async addFamilyMember(memberData: { username: string; email: string; firstName: string; lastName: string; role: 'head_of_household' | 'family_member'; }): Promise<User> {
    const familyRoleId = memberData.role === 'head_of_household' ? 1 : 2;
    const query = `
      INSERT INTO users (username, email, first_name, last_name, family_role_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, username, email, first_name, last_name, family_role_id, created_at, updated_at
    `;
    const result = await databaseService.query(query, [
      memberData.username,
      memberData.email,
      memberData.firstName,
      memberData.lastName,
      familyRoleId
    ]);
    return this.mapRowToUser(result.rows[0]);
  }

  /**
   * Actualiza un miembro de la familia
   * @param id - ID del miembro a actualizar
   * @param updateData - Datos a actualizar
   * @returns El miembro actualizado o undefined si no existe
   */
  public async updateFamilyMember(id: number, updateData: Partial<User>): Promise<User | undefined> {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;
    if (updateData.username) { fields.push(`username = $${idx++}`); values.push(updateData.username); }
    if (updateData.email) { fields.push(`email = $${idx++}`); values.push(updateData.email); }
    if (updateData.firstName) { fields.push(`first_name = $${idx++}`); values.push(updateData.firstName); }
    if (updateData.lastName) { fields.push(`last_name = $${idx++}`); values.push(updateData.lastName); }
    if (updateData.role) { fields.push(`family_role_id = $${idx++}`); values.push(updateData.role === 'head_of_household' ? 1 : 2); }
    if (!fields.length) {
      const res = await databaseService.query('SELECT id, username, email, first_name, last_name, family_role_id, created_at, updated_at FROM users WHERE id = $1', [id]);
      if (!res.rows.length) return undefined;
      return this.mapRowToUser(res.rows[0]);
    }
    const query = `UPDATE users SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING id, username, email, first_name, last_name, family_role_id, created_at, updated_at`;
    values.push(id);
    const result = await databaseService.query(query, values);
    if (!result.rows.length) return undefined;
    return this.mapRowToUser(result.rows[0]);
  }

  /**
   * Desactiva un miembro de la familia (soft delete)
   * @param id - ID del miembro a desactivar
   * @returns true si se desactivó correctamente, false si no existe
   */
  public async deactivateFamilyMember(id: number): Promise<boolean> {
    const result = await databaseService.query('UPDATE users SET updated_at = NOW() WHERE id = $1 RETURNING id', [id]);
    return (result.rows || []).length > 0;
  }

  // Métodos de compatibilidad con la API existente
  public async getAllUsers(): Promise<User[]> {
    return this.getAllFamilyMembers();
  }

  public async getUserById(id: number): Promise<User | undefined> {
    return this.getFamilyMemberById(id);
  }

  public async userExists(id: number): Promise<boolean> {
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
   * Busca un usuario por rol
   * @param role - Rol a buscar
   * @returns Usuario encontrado o undefined
   */
  public async findByRole(role: string): Promise<any | undefined> {
    return mockAuthUsers.find(user => user.role === role);
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