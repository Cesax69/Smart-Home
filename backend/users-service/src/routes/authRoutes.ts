import { Router } from 'express';
import { AuthController } from '../controllers/authController';

const router = Router();
const authController = new AuthController();

/**
 * @route POST /auth/login
 * @description Iniciar sesión de usuario
 * @access Public
 * @body {string} username - Nombre de usuario o email
 * @body {string} password - Contraseña del usuario
 */
router.post('/login', authController.login);

/**
 * @route POST /auth/register
 * @description Registrar nuevo usuario
 * @access Public
 * @body {string} username - Nombre de usuario
 * @body {string} email - Email del usuario
 * @body {string} password - Contraseña del usuario
 * @body {string} firstName - Nombre del usuario
 * @body {string} lastName - Apellido del usuario
 * @body {string} role - Rol del usuario (head_of_household o family_member)
 */
router.post('/register', authController.register);

/**
 * @route POST /auth/logout
 * @description Cerrar sesión de usuario
 * @access Private
 */
router.post('/logout', authController.logout);

/**
 * @route GET /auth/me
 * @description Obtener información del usuario autenticado
 * @access Private
 */
router.get('/me', authController.getCurrentUser);

/**
 * @route POST /auth/refresh
 * @description Renovar token de acceso
 * @access Private
 */
router.post('/refresh', authController.refreshToken);

export default router;