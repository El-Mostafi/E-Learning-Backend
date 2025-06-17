import { Router, Request, Response, NextFunction } from "express";
import { body, param, query } from "express-validator";
import {
  BadRequestError,
  currentUser,
  requireAuth,
  ValidationRequest,
} from "../../../common"; 
import { roleIsAdmin } from "../../../common/src/middllewares/validate-roles";
import mongoose from "mongoose";
import { adminService } from "../../service/admin/admin.service";

const router = Router();


router.get(
  "/api/admin/stats",
  requireAuth,
  currentUser,
  roleIsAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await adminService.getAdminDashboardStats();
      res.status(200).send(stats);
    } catch (err) {
      next(err);
    }
  }
);
router.get(
  "/api/admin/analytics",
  requireAuth,
  currentUser,
  roleIsAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dashboardData = await adminService.getDashboardData();
      
      res.status(200).json(dashboardData);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      next(error);
    }
  }
);





export { router as adminRouters };
