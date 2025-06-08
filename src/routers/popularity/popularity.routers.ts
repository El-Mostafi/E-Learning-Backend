import { NextFunction, Router, Request, Response } from "express";
import { PopularityService } from "../../service/popularity/popularity.service";

const router = Router();
const popularityService = new PopularityService();

router.get(
  "/api/popular-courses",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const avgRating = parseFloat(req.query.avgRating as string) || 3.0;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 8;
      const category = (req.query.category as string) || undefined;
    // console.log(category)
      const response = await popularityService.getPopularCourses(
        avgRating,
        page,
        limit,
        category
      );

      res.status(200).json(response);
    } catch (error) {
        // console.log(error)
      next(error);
    }
  }
);


export { router as popularityRouters };
