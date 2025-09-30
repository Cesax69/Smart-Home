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
  public getAllUsers = (req: Request, res: Response): void => {
    try {
      const familyMembers = this.userService.getAllFamilyMembers();
      
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
  public getUserById = (req: Request, res: Response): void => {
    try {
      const userId = parseInt(req.params.id, 10);

      // Validar que el ID sea un número válido
      if (isNaN(userId)) {
        const errorResponse: UserResponse = {
          success: false,
          message: 'ID de miembro inválido'
        };
        res.status(400).json(errorResponse);
        return;
      }

      const familyMember = this.userService.getFamilyMemberById(userId);

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
  public getFamilyLeaders = (req: Request, res: Response): void => {
    try {
      const leaders = this.userService.getFamilyLeaders();
      
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
  public getFamilyMembers = (req: Request, res: Response): void => {
    try {
      const members = this.userService.getFamilyMembers();
      
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
  public getFamilyStats = (req: Request, res: Response): void => {
    try {
      const stats = this.userService.getFamilyStats();
      
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
  public addFamilyMember = (req: Request, res: Response): void => {
    try {
      const { name, role, familyRole, age, avatar } = req.body;

      // Validaciones básicas
      if (!name || !role) {
        const errorResponse: UserResponse = {
          success: false,
          message: 'Nombre y rol son requeridos'
        };
        res.status(400).json(errorResponse);
        return;
      }

      if (!['leader', 'member'].includes(role)) {
        const errorResponse: UserResponse = {
          success: false,
          message: 'Rol debe ser "leader" o "member"'
        };
        res.status(400).json(errorResponse);
        return;
      }

      const newMember = this.userService.addFamilyMember({
        name,
        role,
        familyRole,
        age,
        avatar
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
  public updateFamilyMember = (req: Request, res: Response): void => {
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

      const updatedMember = this.userService.updateFamilyMember(userId, req.body);

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
  public deactivateFamilyMember = (req: Request, res: Response): void => {
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

      const success = this.userService.deactivateFamilyMember(userId);

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