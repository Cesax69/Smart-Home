import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserService } from '../services/userService';

export class AuthController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  /**
   * Iniciar sesión de usuario
   */
  public login = async (req: Request, res: Response): Promise<void> => {
    try {
      const { username, password } = req.body;
      console.log('🔐 LOGIN ATTEMPT:', { username, passwordLength: password?.length });

      if (!username || !password) {
        console.log('❌ Missing credentials');
        res.status(400).json({
          success: false,
          message: 'Username y password son requeridos'
        });
        return;
      }

      // Buscar usuario por username o email
      console.log('🔍 Searching user:', username);
      const user = await this.userService.findByUsernameOrEmail(username);
      
      if (!user) {
        console.log('❌ User not found:', username);
        res.status(401).json({
          success: false,
          message: 'Credenciales inválidas'
        });
        return;
      }

      console.log('✅ User found:', { id: user.id, username: user.username, hasPassword: !!user.password });

      // Verificar contraseña
      console.log('🔒 Verifying password...');
      console.log('   Password to check:', password);
      console.log('   Stored hash:', user.password);
      console.log('   Hash type:', typeof user.password);
      console.log('   Hash length:', user.password?.length);
      
      const isValidPassword = await bcrypt.compare(password, user.password);
      console.log('   bcrypt.compare result:', isValidPassword);
      
      if (!isValidPassword) {
        console.log('❌ Invalid password for user:', username);
        res.status(401).json({
          success: false,
          message: 'Credenciales inválidas'
        });
        return;
      }

      console.log('✅ Password valid for user:', username);

      // Generar token JWT
      const token = jwt.sign(
        { 
          userId: user.id, 
          username: user.username,
          role: user.role 
        },
        process.env.JWT_SECRET || 'default-secret',
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' } as jwt.SignOptions
      );

      // Remover password de la respuesta
      const { password: _, ...userWithoutPassword } = user;

      res.json({
        success: true,
        message: 'Login exitoso',
        user: userWithoutPassword,
        token,
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
      });

    } catch (error) {
      console.error('Error en login:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  };

  /**
   * Registrar nuevo usuario
   */
  public register = async (req: Request, res: Response): Promise<void> => {
    try {
      const { username, email, password, firstName, lastName, role } = req.body;

      // Validar campos requeridos
      if (!username || !email || !password || !firstName || !lastName) {
        res.status(400).json({
          success: false,
          message: 'Todos los campos son requeridos'
        });
        return;
      }

      // Validar rol
      if (role && !['head_of_household', 'family_member'].includes(role)) {
        res.status(400).json({
          success: false,
          message: 'Rol inválido'
        });
        return;
      }

      // Verificar si el usuario ya existe
      const existingUser = await this.userService.findByUsernameOrEmail(username, email);
      
      if (existingUser) {
        res.status(409).json({
          success: false,
          message: 'El usuario o email ya existe'
        });
        return;
      }

      // Hashear contraseña
      const hashedPassword = await bcrypt.hash(password, 10);

      // Crear usuario
      const newUser = await this.userService.createUser({
        username,
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: role || 'family_member'
      });

      // Generar token JWT
      const token = jwt.sign(
        { 
          userId: newUser.id, 
          username: newUser.username,
          role: newUser.role 
        },
        process.env.JWT_SECRET || 'default-secret',
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' } as jwt.SignOptions
      );

      // Remover password de la respuesta
      const { password: _, ...userWithoutPassword } = newUser;

      res.status(201).json({
        success: true,
        message: 'Usuario registrado exitosamente',
        user: userWithoutPassword,
        token,
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
      });

    } catch (error) {
      console.error('Error en registro:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  };

  /**
   * Cerrar sesión de usuario
   */
  public logout = async (req: Request, res: Response): Promise<void> => {
    try {
      // En una implementación real, aquí invalidarías el token
      // Por ejemplo, agregándolo a una lista negra en Redis
      
      res.json({
        success: true,
        message: 'Logout exitoso'
      });

    } catch (error) {
      console.error('Error en logout:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  };

  /**
   * Obtener información del usuario autenticado
   */
  public getCurrentUser = async (req: Request, res: Response): Promise<void> => {
    try {
      // El middleware de autenticación debería agregar el usuario al request
      const userId = (req as any).user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Token inválido'
        });
        return;
      }

      const user = await this.userService.findById(userId);
      
      if (!user) {
        res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
        return;
      }

      // Remover password de la respuesta
      const { password: _, ...userWithoutPassword } = user;

      res.json({
        success: true,
        user: userWithoutPassword
      });

    } catch (error) {
      console.error('Error obteniendo usuario actual:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  };

  /**
   * Renovar token de acceso
   */
  public refreshToken = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Token inválido'
        });
        return;
      }

      const user = await this.userService.findById(userId);
      
      if (!user) {
        res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
        return;
      }

      // Generar nuevo token
      const token = jwt.sign(
        { 
          userId: user.id, 
          username: user.username,
          role: user.role 
        },
        process.env.JWT_SECRET || 'default-secret',
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' } as jwt.SignOptions
      );

      res.json({
        success: true,
        message: 'Token renovado exitosamente',
        token,
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
      });

    } catch (error) {
      console.error('Error renovando token:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  };

  /**
   * Login por rol (para botones de login rápido)
   */
  public loginByRole = async (req: Request, res: Response): Promise<void> => {
    try {
      const { role } = req.body;

      if (!role) {
        res.status(400).json({
          success: false,
          message: 'Rol es requerido'
        });
        return;
      }

      // Validar rol
      if (!['head_of_household', 'family_member'].includes(role)) {
        res.status(400).json({
          success: false,
          message: 'Rol inválido'
        });
        return;
      }

      // Buscar un usuario con el rol especificado
      const user = await this.userService.findByRole(role);
      
      if (!user) {
        res.status(404).json({
          success: false,
          message: `No se encontró usuario con rol ${role}`
        });
        return;
      }

      // Generar token JWT
      const token = jwt.sign(
        { 
          userId: user.id, 
          username: user.username,
          role: user.role 
        },
        process.env.JWT_SECRET || 'default-secret',
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' } as jwt.SignOptions
      );

      // Remover password de la respuesta
      const { password: _, ...userWithoutPassword } = user;

      res.json({
        success: true,
        message: `¡Bienvenido ${role === 'head_of_household' ? 'Jefe del Hogar' : 'Miembro'}!`,
        user: userWithoutPassword,
        token,
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
      });

    } catch (error) {
      console.error('Error en login por rol:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  };
}