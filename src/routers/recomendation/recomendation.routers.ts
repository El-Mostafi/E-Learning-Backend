import {
  BadRequestError,
  currentUser,
  requireAuth,
  roleIsAdmin,
  roleIsStudent,
  ValidationRequest,
} from "../../../common";
import { NextFunction, Request, Response, Router } from "express";
import MLRecommendationService from "../../service/recomendation/recommendationSVD.service";
import { body, param, query, validationResult } from "express-validator";
import Enrollment from "../../models/enrollment";
// import rateLimit from 'express-rate-limit';

const router = Router();
const mlService = new MLRecommendationService();

// Rate limiting
// const recommendationLimit = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100, // limit each IP to 100 requests per windowMs
//   message: 'Too many recommendation requests, please try again later.'
// });

// Middleware for error handling

// Middleware to check if model is trained
const checkModelTrained = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!(await mlService.isModelTrained())) {
    res.status(503).json({
      success: false,
      message: "ML model is not trained. Please train the model first.",
      code: "MODEL_NOT_TRAINED",
    });
    return;
  }
  next();
};

// Train the model
router.post(
  "/api/train-model",
  requireAuth,
  currentUser,
  roleIsAdmin,
  async (req: Request, res: Response) => {
    try {
      const enrollment = await Enrollment.find()
        .populate("participant", "_id")
        .populate("course", "_id")
        .lean();
      if (!enrollment) {
        res.status(400).json({
          success: false,
          message: "No enrollment data available for training",
        });
        return;
      }
      const success = await mlService.trainModel();

      if (success) {
        const stats = await mlService.getTrainingStatus();
        res.json({
          success: true,
          message: "Model trained successfully",
          stats,
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Model training failed",
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Internal server error during training",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// Get recommendations for a user
router.get(
  "/api/recommendations/:userId",
  [
    param("userId").isMongoId().withMessage("Invalid user ID format"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage("Limit must be between 1 and 50"),
  ],
  ValidationRequest,
  requireAuth,
  currentUser,
  roleIsStudent,
  checkModelTrained,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const limit = parseInt(req.query.limit as string) || 10;

      const recommendations = await mlService.getRecommendationsForUser(
        userId,
        limit
      );

      res.json({
        success: true,
        data: recommendations,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error generating recommendations",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// Get similar courses
router.get(
  "/api/courses/:courseId/similar",
  [
    param("courseId").isMongoId().withMessage("Invalid course ID format"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 20 })
      .withMessage("Limit must be between 1 and 20"),
  ],
  ValidationRequest,
  checkModelTrained,
  async (req: Request, res: Response) => {
    try {
      const { courseId } = req.params;
      const limit = parseInt(req.query.limit as string) || 5;

      const similarCourses = await mlService.getSimilarCourses(courseId, limit);
      // console.log(" similarCourses from router",similarCourses);

      res.json({
        success: true,
        data: similarCourses,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error finding similar courses",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// Get detailed model training status and check if retraining is needed
router.get(
  "/api/model/training-status",
  requireAuth,
  currentUser,
  roleIsAdmin,
  async (req: Request, res: Response) => {
    try {
      const status = await mlService.getTrainingStatus();

      res.json({
        success: true,
        data: status,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error getting training status",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

router.post("/api/predict", async (req: Request, res: Response) => {
  try {
    const { userId, courseId } = req.body;
    const predict = await mlService.predictRating(userId, courseId);

    res.json({
      success: true,
      data: {
        predict,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error predicting rating",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});
// Clear model from memory
// router.delete('/api/model/clear', (req: Request, res: Response) => {
//   try {
//     mlService.clearModel();

//     res.json({
//       success: true,
//       message: 'Model cleared from memory successfully'
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: 'Error clearing model',
//       error: error instanceof Error ? error.message : 'Unknown error'
//     });
//   }
// });

export default router;

export { router as recomendationRouter };
