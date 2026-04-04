/**
 * cho.routes.js
 * User routes: /api/cho/*
 * Admin routes: /api/admin/cho/*  (registered in admin.routes.js via this file)
 */

const express = require('express');
const multer  = require('multer');
const authMiddleware = require('../middleware/auth.middleware');
const isAdmin        = require('../middleware/isAdmin');
const choController  = require('../controllers/cho.controller');

// ── User router ──────────────────────────────────────────────────────────────
const userRouter = express.Router();

// Optional image upload (memory storage — never persisted)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
});

// All user routes require auth
userRouter.use(authMiddleware);

userRouter.post(
  '/ask',
  upload.single('image'), // optional multipart image field
  choController.ask
);

userRouter.get('/usage', choController.getUsage);

// ── Admin router ─────────────────────────────────────────────────────────────
const adminRouter = express.Router();

// All admin routes require auth + admin role
adminRouter.use(authMiddleware, isAdmin);

adminRouter.get  ('/config', choController.adminGetConfig);
adminRouter.patch('/config', choController.adminUpdateConfig);
adminRouter.get  ('/logs',   choController.adminGetLogs);
adminRouter.get  ('/stats',  choController.adminGetStats);

module.exports = { userRouter, adminRouter };
