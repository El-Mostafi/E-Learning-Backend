import { NextFunction, Router, Request, Response } from "express";
import TrendingService from "../../service/popularity/trending.service";
const router = Router();

const trendingService = new TrendingService();

router.get(
  "/api/trending-courses",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = parseInt(req.query.limit as string) || 8;
      const page = parseInt(req.query.page as string) || 1;
      const category = (req.query.category as string) || undefined;
      // console.log(category);
      const response = await trendingService.getHybridTrending(
        limit,
        page,
        category
      );

      res.status(200).json(response);
    } catch (error) {
      // console.log(error);
      next(error);
    }
  }
);

export { router as trendingRouters };
