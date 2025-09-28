import { Router } from 'express';
import { UserController } from '../controllers/userController';

const router = Router();
const userController = new UserController();

/**
 * @route GET /users
 * @description Obtiene todos los miembros de la familia
 * @access Public
 */
router.get('/', userController.getAllUsers);

/**
 * @route GET /users/leaders
 * @description Obtiene los líderes del hogar
 * @access Public
 */
router.get('/leaders', userController.getFamilyLeaders);

/**
 * @route GET /users/members
 * @description Obtiene los miembros del hogar (hijos)
 * @access Public
 */
router.get('/members', userController.getFamilyMembers);

/**
 * @route GET /users/stats
 * @description Obtiene estadísticas de la familia
 * @access Public
 */
router.get('/stats', userController.getFamilyStats);

/**
 * @route GET /users/:id
 * @description Obtiene un miembro de la familia por su ID
 * @access Public
 * @param {string} id - ID del miembro de la familia
 */
router.get('/:id', userController.getUserById);

/**
 * @route POST /users
 * @description Agrega un nuevo miembro a la familia
 * @access Public
 * @body {string} name - Nombre del miembro
 * @body {string} role - Rol (leader o member)
 * @body {string} familyRole - Rol familiar (padre, madre, hijo, etc.)
 * @body {number} age - Edad del miembro
 * @body {string} avatar - Avatar del miembro
 */
router.post('/', userController.addFamilyMember);

/**
 * @route PUT /users/:id
 * @description Actualiza un miembro de la familia
 * @access Public
 * @param {string} id - ID del miembro de la familia
 */
router.put('/:id', userController.updateFamilyMember);

/**
 * @route DELETE /users/:id
 * @description Desactiva un miembro de la familia
 * @access Public
 * @param {string} id - ID del miembro de la familia
 */
router.delete('/:id', userController.deactivateFamilyMember);

export default router;