"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseChatBody = exports.chatBodySchema = void 0;
const zod_1 = require("zod");
exports.chatBodySchema = zod_1.z.object({
    message: zod_1.z.string().min(3),
    connectionId: zod_1.z.string().optional(),
    limit: zod_1.z.number().min(1).max(500).optional()
});
const parseChatBody = (body) => exports.chatBodySchema.safeParse(body);
exports.parseChatBody = parseChatBody;
