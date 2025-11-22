"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const TaskController_1 = require("../controllers/TaskController");
const router = (0, express_1.Router)();
const taskController = new TaskController_1.TaskController();
// ============= Task Routes =============
router.get('/by-member', (req, res) => taskController.getTasksByMember(req, res));
exports.default = router;
//# sourceMappingURL=taskRoutes.js.map