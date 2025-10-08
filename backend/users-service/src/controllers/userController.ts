import { Request, Response } from 'express';
import { UserService } from '../services/userService';
import { UserResponse } from '../types/User';

export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  /**
   * Obtiene todos los miembros de la familia
   * GET /users
   */
  public getAllUsers = async (req: Request, res: Response): Promise<void> => {
    try {
      const familyMembers = await this.userService.getAllFamilyMembers();
      const response: UserResponse = {
        success: true,
        data: familyMembers,
        message: 'Miembros de la familia obtenidos exitosamente'
      };
      res.status(200).json(response);
    } catch (error) {
      const errorResponse: UserResponse = {
        success: false,
        message: 'Error interno del servidor'
      };
      res.status(500).json(errorResponse);
    }
  };

  /**
   * Obtiene un miembro de la familia por su ID
   * GET /users/:id
   */
  public getUserById = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = parseInt(req.params.id, 10);
      if (isNaN(userId)) {
        const errorResponse: UserResponse = {
          success: false,
          message: 'ID de miembro inválido'
        };
        res.status(400).json(errorResponse);
        return;
      }
      const familyMember = await this.userService.getFamilyMemberById(userId);
      if (!familyMember) {
        const notFoundResponse: UserResponse = {
          success: false,
          message: 'Miembro de la familia no encontrado'
        };
        res.status(404).json(notFoundResponse);
        return;
      }
      const response: UserResponse = {
        success: true,
        data: familyMember,
        message: 'Miembro de la familia obtenido exitosamente'
      };
      res.status(200).json(response);
    } catch (error) {
      const errorResponse: UserResponse = {
        success: false,
        message: 'Error interno del servidor'
      };
      res.status(500).json(errorResponse);
    }
  };

  /**
   * Obtiene los líderes del hogar
   * GET /users/leaders
   */
  public getFamilyLeaders = async (req: Request, res: Response): Promise<void> => {
    try {
      const leaders = await this.userService.getFamilyLeaders();
      const response: UserResponse = {
        success: true,
        data: leaders,
        message: 'Líderes del hogar obtenidos exitosamente'
      };
      res.status(200).json(response);
    } catch (error) {
      const errorResponse: UserResponse = {
        success: false,
        message: 'Error interno del servidor'
      };
      res.status(500).json(errorResponse);
    }
  };

  /**
   * Obtiene los miembros del hogar (hijos)
   * GET /users/members
   */
  public getFamilyMembers = async (req: Request, res: Response): Promise<void> => {
    try {
      const members = await this.userService.getFamilyMembers();
      const response: UserResponse = {
        success: true,
        data: members,
        message: 'Miembros del hogar obtenidos exitosamente'
      };
      res.status(200).json(response);
    } catch (error) {
      const errorResponse: UserResponse = {
        success: false,
        message: 'Error interno del servidor'
      };
      res.status(500).json(errorResponse);
    }
  };

  /**
   * Obtiene estadísticas de la familia
   * GET /users/stats
   */
  public getFamilyStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const stats = await this.userService.getFamilyStats();
      const response = {
        success: true,
        data: stats,
        message: 'Estadísticas de la familia obtenidas exitosamente'
      };
      res.status(200).json(response);
    } catch (error) {
      const errorResponse = {
        success: false,
        message: 'Error interno del servidor'
      };
      res.status(500).json(errorResponse);
    }
  };

  /**
   * Agrega un nuevo miembro a la familia
   * POST /users
   */
  public addFamilyMember = async (req: Request, res: Response): Promise<void> => {
    try {
      const { username, email, firstName, lastName } = req.body;
      let { role } = req.body as { role?: string };
      // compatibilidad con valores antiguos
      if (role === 'leader') role = 'head_of_household';
      if (role === 'member') role = 'family_member';

      if (!username || !email || !firstName || !lastName || !role) {
        const errorResponse: UserResponse = {
          success: false,
          message: 'username, email, firstName, lastName y role son requeridos'
        };
        res.status(400).json(errorResponse);
        return;
      }

      if (!['head_of_household', 'family_member'].includes(role)) {
        const errorResponse: UserResponse = {
          success: false,
          message: 'role debe ser "head_of_household" o "family_member"'
        };
        res.status(400).json(errorResponse);
        return;
      }

      const newMember = await this.userService.addFamilyMember({
        username,
        email,
        firstName,
        lastName,
        role: role as 'head_of_household' | 'family_member'
      });

      const response: UserResponse = {
        success: true,
        data: newMember,
        message: 'Miembro de la familia agregado exitosamente'
      };
      res.status(201).json(response);
    } catch (error) {
      const errorResponse: UserResponse = {
        success: false,
        message: 'Error interno del servidor'
      };
      res.status(500).json(errorResponse);
    }
  };

  /**
   * Actualiza un miembro de la familia
   * PUT /users/:id
   */
  public updateFamilyMember = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = parseInt(req.params.id, 10);
      if (isNaN(userId)) {
        const errorResponse: UserResponse = {
          success: false,
          message: 'ID de miembro inválido'
        };
        res.status(400).json(errorResponse);
        return;
      }
      const updateBody: any = { ...req.body };
      if (updateBody.role === 'leader') updateBody.role = 'head_of_household';
      if (updateBody.role === 'member') updateBody.role = 'family_member';
      const updatedMember = await this.userService.updateFamilyMember(userId, updateBody);
      if (!updatedMember) {
        const notFoundResponse: UserResponse = {
          success: false,
          message: 'Miembro de la familia no encontrado'
        };
        res.status(404).json(notFoundResponse);
        return;
      }
      const response: UserResponse = {
        success: true,
        data: updatedMember,
        message: 'Miembro de la familia actualizado exitosamente'
      };
      res.status(200).json(response);
    } catch (error) {
      const errorResponse: UserResponse = {
        success: false,
        message: 'Error interno del servidor'
      };
      res.status(500).json(errorResponse);
    }
  };

  /**
   * Desactiva un miembro de la familia
   * DELETE /users/:id
   */
  public deactivateFamilyMember = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = parseInt(req.params.id, 10);
      if (isNaN(userId)) {
        const errorResponse: UserResponse = {
          success: false,
          message: 'ID de miembro inválido'
        };
        res.status(400).json(errorResponse);
        return;
      }
      const success = await this.userService.deactivateFamilyMember(userId);
      if (!success) {
        const notFoundResponse: UserResponse = {
          success: false,
          message: 'Miembro de la familia no encontrado'
        };
        res.status(404).json(notFoundResponse);
        return;
      }
      const response: UserResponse = {
        success: true,
        message: 'Miembro de la familia desactivado exitosamente'
      };
      res.status(200).json(response);
    } catch (error) {
      const errorResponse: UserResponse = {
        success: false,
        message: 'Error interno del servidor'
      };
      res.status(500).json(errorResponse);
    }
  };
}