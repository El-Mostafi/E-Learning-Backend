import { Matrix, SVD } from "ml-matrix";
import mongoose, { Types } from "mongoose";
import Enrollment from "../../models/enrollment";
import User from "../../models/user";
import Course, { CourseDocument, Lecture, Section } from "../../models/course";
import { courseDataGenerale } from "../../../Helpers/course/course.data";
import * as fs from "fs";
import * as path from "path";
import {
  LoadDataResult,
  UserProfile,
  Prediction,
  EnrollmentType,
  UserType,
  CourseType,
  CourseFeature,
  SimilarCourse,
  SimilarUser,
  ModelData,
  ModelMetadata,
  TrainingStatus,
  EnhancedModelData,
} from "src/routers/recomendation/dtos/recomendation.dtos";
import { isFloat64Array } from "util/types";
// Type definitions
interface ImplicitRatingConfig {
  enrollmentWeight: number;
  progressWeight: number;
  completionWeight: number;
  timeWeight: number;
  quizWeight: number;
  reviewWeight: number;
  categoryWeight?: number;
}
class MLRecommendationService {
  private userItemMatrix: Matrix | null = null;
  private userFeatures: Matrix | null = null;
  private itemFeatures: Matrix | null = null;
  private userRatings: Map<string, Map<string, number>> = new Map();
  private userToIdx: Map<string, number> = new Map();
  private courseToIdx: Map<string, number> = new Map();
  private idxToUser: Map<number, string> = new Map();
  private idxToCourse: Map<number, string> = new Map();
  private userSimilarity: Matrix | null = null;
  private itemSimilarity: Matrix | null = null;
  private courseClusters: Map<string, any> = new Map();
  private userProfiles: Map<string, UserProfile> = new Map();
  private usersRecommendations: Map<string, string[]> = new Map();
  private modelMetadata: ModelMetadata | null = null;

  // Enhanced rating configuration
  private ratingConfig: ImplicitRatingConfig = {
    enrollmentWeight: 1.0, // Base interest
    progressWeight: 2.0, // Most important - actual engagement
    completionWeight: 1.5, // Strong positive signal
    timeWeight: 0.3, // Recency factor
    quizWeight: 0.5, // Skill mastery
    reviewWeight: 0.5, // Explicit feedback
  };

  private readonly RETRAIN_THRESHOLD_DAYS = 7; // Retrain every week
  private readonly CRITICAL_THRESHOLD_DAYS = 30; // Critical if not trained for a month
  private readonly MIN_NEW_DATA_THRESHOLD = 10; // Minimum new data points to trigger retraining

  async loadData(): Promise<LoadDataResult> {
    try {
      // Load enrollment data with user and course information
      const enrollments = (await Enrollment.aggregate([
        {
          $lookup: {
            from: "users",
            localField: "participant",
            foreignField: "_id",
            as: "user",
          },
        },
        {
          $lookup: {
            from: "courses",
            localField: "course",
            foreignField: "_id",
            as: "course_data",
          },
        },
        { $unwind: "$user" },
        { $unwind: "$course_data" },
      ]).exec()) as EnrollmentType[];

      const users = (await User.find({
        role: "student",
        status: "active",
        emailConfirmed: true,
      }).exec()) as UserType[];
      const courses = await Course.find({
        isPublished: true,
      }).exec();

      return { enrollments, users, courses };
    } catch (error) {
      console.error("Error loading data:", error);
      return { enrollments: [], users: [], courses: [] };
    }
  }

  public async getTrainingStatus(): Promise<TrainingStatus> {
    try {
      const modelPath = path.resolve(process.cwd(), "trainedModel.json");
      const modelExists = fs.existsSync(modelPath);
      const currentData = await this.loadData();

      let status: TrainingStatus = {
        needsRetraining: false,
        lastTrainedAt: null,
        daysSinceLastTraining: Infinity,
        newUsersCount: 0,
        newCoursesCount: 0,
        newEnrollmentsCount: 0,
        recommendedAction: "train",
        trainingUrgency: "high",
      };

      if (!modelExists) {
        status.recommendedAction = "train";
        status.trainingUrgency = "critical";
        status.needsRetraining = true;
        status.newUsersCount = currentData.users.length;
        status.newCoursesCount = currentData.courses.length;
        status.newEnrollmentsCount = currentData.enrollments.length;
        return status;
      }

      // Load existing model metadata
      const modelLoaded = await this.loadModel();
      if (!modelLoaded || !this.modelMetadata) {
        status.recommendedAction = "train";
        status.trainingUrgency = "critical";
        status.needsRetraining = true;
        return status;
      }

      const metadata = this.modelMetadata;
      status.lastTrainedAt = metadata.lastTrainedAt;
      status.daysSinceLastTraining = Math.floor(
        (Date.now() - metadata.lastTrainedAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Calculate new data counts
      if (currentData.users.length !== metadata.trainingDataStats.totalUsers) {
        status.newUsersCount =
          currentData.users.length - metadata.trainingDataStats.totalUsers;
      }
      if (
        currentData.courses.length !== metadata.trainingDataStats.totalCourses
      ) {
        status.newCoursesCount =
          currentData.courses.length - metadata.trainingDataStats.totalCourses;
      }
      if (
        currentData.enrollments.length !==
        metadata.trainingDataStats.totalEnrollments
      ) {
        status.newEnrollmentsCount =
          currentData.enrollments.length -
          metadata.trainingDataStats.totalEnrollments;
      }

      // Determine if retraining is needed
      const hasSignificantChanges =
        status.newUsersCount >= this.MIN_NEW_DATA_THRESHOLD ||
        status.newCoursesCount >= this.MIN_NEW_DATA_THRESHOLD ||
        status.newEnrollmentsCount >= this.MIN_NEW_DATA_THRESHOLD;

      const isStale =
        status.daysSinceLastTraining >= this.RETRAIN_THRESHOLD_DAYS;
      const isCritical =
        status.daysSinceLastTraining >= this.CRITICAL_THRESHOLD_DAYS;

      status.needsRetraining = hasSignificantChanges || isStale;

      // Determine recommended action and urgency
      if (isCritical) {
        status.recommendedAction = "retrain";
        status.trainingUrgency = "critical";
      } else if (hasSignificantChanges && isStale) {
        status.recommendedAction = "retrain";
        status.trainingUrgency = "high";
      } else if (hasSignificantChanges) {
        status.recommendedAction = "retrain";
        status.trainingUrgency = "medium";
      } else if (isStale) {
        status.recommendedAction = "retrain";
        status.trainingUrgency = "low";
      } else {
        status.recommendedAction = "up_to_date";
        status.trainingUrgency = "low";
        status.needsRetraining = false;
      }

      return status;
    } catch (error) {
      console.error("Error getting training status:", error);
      return {
        needsRetraining: true,
        lastTrainedAt: null,
        daysSinceLastTraining: Infinity,
        newUsersCount: 0,
        newCoursesCount: 0,
        newEnrollmentsCount: 0,
        recommendedAction: "train",
        trainingUrgency: "critical",
      };
    }
  }

  private generateImplicitRating(
    enrollment: EnrollmentType,
    userReview?: number
  ): number {
    let rating = 0;
    // 1. Base enrollment indicates interest
    rating += this.ratingConfig.enrollmentWeight;
    // console.log("rating enrollmentWeight", rating);

    // 2. Progress indicates engagement (most important factor)
    const progressScore = this.normalizeProgress(enrollment.progress);
    rating += progressScore * this.ratingConfig.progressWeight;
    // console.log("rating progressWeight", rating);

    // 3. Completion indicates satisfaction
    if (enrollment.completed) {
      rating += this.ratingConfig.completionWeight;
      // console.log("rating completionWeight", rating);

      // 4. Quiz performance indicates mastery
      if (enrollment.hasPassedQuizze) {
        const quizScore =
          (enrollment.QuizzeScore / 100) * this.ratingConfig.quizWeight;
        rating += quizScore;
        // console.log("rating quizWeight", rating);
      }

      // Bonus for quick completion (indicates high engagement)
      if (enrollment.completedAt && enrollment.startedAt) {
        const completionTime =
          new Date(enrollment.completedAt).getTime() -
          new Date(enrollment.startedAt).getTime();
        const daysToComplete = completionTime / (1000 * 60 * 60 * 24);

        if (daysToComplete > 0 && daysToComplete <= 30) {
          rating += 0.5; // Quick completion bonus
        }
        // console.log("rating completionTime", rating);
      }
    }

    // 5. Review indicates explicit satisfaction
    if (userReview) {
      rating += (userReview / 5) * this.ratingConfig.reviewWeight;
      // console.log("rating reviewWeight", rating);
    }

    // 6. Time-based decay for relevance
    const daysSinceStart =
      (Date.now() - new Date(enrollment.startedAt).getTime()) /
      (1000 * 60 * 60 * 24);
    const timeDecay = Math.max(0.1, 1 - daysSinceStart / 365); // Decay over a year
    rating *= 0.8 + 0.2 * timeDecay; // Apply 20% time-based adjustment
    // console.log("rating timeDecay", rating);

    // console.log("rating final", rating);

    return Math.min(Math.max(rating, 0.5), 5.0); // Scale 0.5-5.0 (avoid zero ratings)
  }

  // Helper method to normalize progress with non-linear scaling
  private normalizeProgress(progress: number): number {
    // Non-linear scaling to emphasize higher completion rates
    const normalized = progress / 100;
    return Math.pow(normalized, 0.7); // Gives more weight to higher progress
  }

  private createUserItemMatrix(
    enrollments: EnrollmentType[],
    users: UserType[],
    courses: CourseDocument[]
  ): Matrix {
    // Create user and course mappings
    users.forEach((user, idx) => {
      const userId = user._id.toString();
      this.userToIdx.set(userId, idx);
      this.idxToUser.set(idx, userId);
      this.userRatings.set(userId, new Map());

      const courseRatings = new Map<string, number>();

      if (user.reviews && user.reviews.length > 0) {
        user.reviews.forEach((review) => {
          const courseId = review.course.toString();
          const rating = review.rating;
          courseRatings.set(courseId, rating);
        });
      }

      this.userRatings.set(userId, courseRatings);
    });

    courses.forEach((course, idx) => {
      const courseId = course.id;
      this.courseToIdx.set(courseId, idx);
      this.idxToCourse.set(idx, courseId);
    });

    // Initialize matrix with zeros
    const matrix: number[][] = Array(users.length)
      .fill(null)
      .map(() => Array(courses.length).fill(0));

    // Fill matrix with ratings
    enrollments.forEach((enrollment) => {
      const userId = enrollment.participant.toString();
      const courseId = enrollment.course.toString();

      if (this.userToIdx.has(userId) && this.courseToIdx.has(courseId)) {
        const userIdx = this.userToIdx.get(userId)!;
        const courseIdx = this.courseToIdx.get(courseId)!;
        const rating = this.generateImplicitRating(
          enrollment,
          this.userRatings.get(userId)?.get(courseId)
        );
        matrix[userIdx][courseIdx] = rating;
      }
    });

    this.userItemMatrix = new Matrix(matrix);
    return this.userItemMatrix;
  }

  // Matrix Factorization using SVD
  private performMatrixFactorization(k: number = 50): boolean {
    try {
      if (!this.userItemMatrix) {
        throw new Error("User-item matrix not initialized");
      }

      const svd = new SVD(this.userItemMatrix, {
        computeLeftSingularVectors: true,
        computeRightSingularVectors: true,
        autoTranspose: true,
      });
      // console.log("Singular values:", svd);

      // Reduce dimensionality
      const reducedK = Math.min(k, svd.diagonal.length);
      // console.log("Reduced K:", svd.diagonal, reducedK);

      const sqrtS = Matrix.diag(svd.diagonal.slice(0, reducedK).map(Math.sqrt));
      // console.log("sqrtS", sqrtS);
      // User features: U * S^(1/2)
      const userFeatures = svd.leftSingularVectors.subMatrix(
        0,
        svd.leftSingularVectors.rows - 1,
        0,
        reducedK - 1
      );
      // console.log("userFeatures", userFeatures);
      this.userFeatures = userFeatures.mmul(sqrtS);

      // Item features: V * S^(1/2)
      const itemFeatures = svd.rightSingularVectors.subMatrix(
        0,
        svd.rightSingularVectors.rows - 1,
        0,
        reducedK - 1
      );
      // console.log("itemFeatures", itemFeatures);
      this.itemFeatures = itemFeatures.mmul(sqrtS);

      // console.log("Matrix factorization completed successfully");
      return true;
    } catch (error) {
      // console.error("Matrix factorization failed:", error);
      return false;
    }
  }

  // Calculate cosine similarity between vectors
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const normA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const normB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (normA * normB);
  }

  // Compute user-user and item-item similarities
  private computeSimilarities(): void {
    if (!this.userFeatures || !this.itemFeatures) {
      throw new Error("Features not computed");
    }

    const numUsers = this.userFeatures.rows;
    const numItems = this.itemFeatures.rows;

    // User similarity matrix
    this.userSimilarity = new Matrix(numUsers, numUsers);
    for (let i = 0; i < numUsers; i++) {
      for (let j = i; j < numUsers; j++) {
        const userA = this.userFeatures.getRow(i);
        const userB = this.userFeatures.getRow(j);
        const similarity = this.cosineSimilarity(userA, userB);
        this.userSimilarity.set(i, j, similarity);
        this.userSimilarity.set(j, i, similarity);
      }
    }

    // Item similarity matrix
    this.itemSimilarity = new Matrix(numItems, numItems);
    for (let i = 0; i < numItems; i++) {
      for (let j = i; j < numItems; j++) {
        const itemA = this.itemFeatures.getRow(i);
        const itemB = this.itemFeatures.getRow(j);
        const similarity = this.cosineSimilarity(itemA, itemB);
        this.itemSimilarity.set(i, j, similarity);
        this.itemSimilarity.set(j, i, similarity);
      }
    }
  }

  // Content-based filtering features
  private async extractCourseFeatures(
    courses: CourseDocument[]
  ): Promise<Map<string, CourseFeature>> {
    const features = new Map<string, CourseFeature>();

    // Get all unique categories, levels, and languages
    const categories = [
      ...new Set(courses.map((c) => c.category?.name || "Other")),
    ];
    const levels = [...new Set(courses.map((c) => c.level))];
    const languages = [...new Set(courses.map((c) => c.language))];

    courses.forEach((course) => {
      const courseId = course.id;
      const feature: CourseFeature = {
        // One-hot encode categories
        ...categories.reduce((acc, cat) => {
          acc[`category_${cat}`] = course.category?.name === cat ? 1 : 0;
          return acc;
        }, {} as Record<string, number>),

        // One-hot encode levels
        ...levels.reduce((acc, level) => {
          acc[`level_${level}`] = course.level === level ? 1 : 0;
          return acc;
        }, {} as Record<string, number>),

        // One-hot encode languages
        ...languages.reduce((acc, lang) => {
          acc[`language_${lang}`] = course.language === lang ? 1 : 0;
          return acc;
        }, {} as Record<string, number>),

        // Numerical features
        price: course.pricing.isFree ? 0 : course.pricing.price || 0,
        isFree: course.pricing.isFree ? 1 : 0,
        avgRating:
          course.reviews.length > 0
            ? course.reviews.reduce((sum, r) => sum + r.rating, 0) /
              course.reviews.length
            : 0,
        numReviews: course.reviews.length,
        numSections: course.sections.length,
        totalLectures: course.sections.reduce(
          (sum, s) => sum + s.lectures.length,
          0
        ),
      };

      features.set(courseId, feature);
    });

    return features;
  }

  // Build user profiles based on their enrolled courses
  private async buildUserProfiles(
    enrollments: EnrollmentType[],
    courseFeatures: Map<string, CourseFeature>
  ): Promise<Map<string, UserProfile>> {
    const userProfiles = new Map<string, UserProfile>();

    // Group enrollments by user
    const userEnrollments = new Map<string, EnrollmentType[]>();
    enrollments.forEach((enrollment) => {
      const userId = enrollment.participant.toString();
      if (!userEnrollments.has(userId)) {
        userEnrollments.set(userId, []);
      }
      userEnrollments.get(userId)!.push(enrollment);
    });

    // Build profile for each user
    userEnrollments.forEach((enrolls, userId) => {
      const profile: UserProfile = {};
      let totalWeight = 0;

      enrolls.forEach((enrollment) => {
        const courseId = enrollment.course.toString();
        const courseFeature = courseFeatures.get(courseId);
        if (courseFeature) {
          const weight = this.generateImplicitRating(enrollment,this.userRatings.get(userId)?.get(courseId));
          totalWeight += weight;

          Object.keys(courseFeature).forEach((key) => {
            if (!profile[key]) profile[key] = 0;
            profile[key] += courseFeature[key] * weight;
          });
        }
      });

      // Normalize by total weight
      if (totalWeight > 0) {
        Object.keys(profile).forEach((key) => {
          profile[key] /= totalWeight;
        });
      }

      userProfiles.set(userId, profile);
    });

    this.userProfiles = userProfiles;
    return userProfiles;
  }

  // Hybrid recommendation combining collaborative and content-based filtering
  public async predictRating(
    userId: string,
    courseId: string
  ): Promise<number> {
    if (!this.userToIdx.has(userId) || !this.courseToIdx.has(courseId)) {
      return await this.contentBasedRating(userId, courseId);
    }

    const userIdx = this.userToIdx.get(userId)!;
    const courseIdx = this.courseToIdx.get(courseId)!;

    // Collaborative filtering prediction
    let collabRating = 0;
    if (this.userFeatures && this.itemFeatures) {
      const userFeature = this.userFeatures.getRowVector(userIdx);
      const itemFeature = this.itemFeatures.getRowVector(courseIdx);
      collabRating = userFeature.dot(itemFeature);
      collabRating = Math.max(0, Math.min(5, collabRating)); // Clamp to 0-5
    }

    // Content-based prediction
    const contentRating = await this.contentBasedRating(userId, courseId);

    // Hybrid: weighted average (70% collaborative, 30% content-based)
    return collabRating * 0.7 + contentRating * 0.3;
  }

  private async contentBasedRating(
    userId: string,
    courseId: string
  ): Promise<number> {
    if (!this.userProfiles.has(userId)) return 2.5; // Default rating

    const userProfile = this.userProfiles.get(userId)!;
    const course = (await Course.findOne({
      _id: new Types.ObjectId(courseId),
      isPublished: true,
    }).exec()) as CourseType | null;

    if (!course) return 2.5;

    // Extract course features
    const courseFeature: Record<string, number> = {
      [`category_${course.category?.name || "Other"}`]: 1,
      [`level_${course.level}`]: 1,
      [`language_${course.language}`]: 1,
      price: course.pricing.isFree ? 0 : course.pricing.price || 0,
      isFree: course.pricing.isFree ? 1 : 0,
      avgRating:
        course.reviews.length > 0
          ? course.reviews.reduce((sum, r) => sum + r.rating, 0) /
            course.reviews.length
          : 0,
      numReviews: course.reviews.length,
      numSections: course.sections.length,
      totalLectures: course.sections.reduce(
        (sum, s) => sum + s.lectures.length,
        0
      ),
    };

    // Calculate similarity between user profile and course
    let similarity = 0;
    let norm1 = 0,
      norm2 = 0;

    const allKeys = new Set([
      ...Object.keys(userProfile),
      ...Object.keys(courseFeature),
    ]);

    allKeys.forEach((key) => {
      const userVal = userProfile[key] || 0;
      const courseVal = courseFeature[key] || 0;
      similarity += userVal * courseVal;
      norm1 += userVal * userVal;
      norm2 += courseVal * courseVal;
    });

    if (norm1 === 0 || norm2 === 0) return 2.5;

    const cosineSim = similarity / (Math.sqrt(norm1) * Math.sqrt(norm2));
    return 2.5 + cosineSim * 2.5; // Scale to 0-5 range
  }

  async trainModel(): Promise<boolean> {
    try {
      // console.log("Loading data...");
      const { enrollments, users, courses } = await this.loadData();

      if (enrollments.length === 0) {
        // console.log("No training data available");
        return false;
      }

      // console.log("Creating user-item matrix...");
      this.createUserItemMatrix(enrollments, users, courses);
      // console.log("users", this.userToIdx);
      // console.log("courses", this.courseToIdx.keys());
      // console.log("Performing matrix factorization...");
      const success = this.performMatrixFactorization(50);
      if (!success) return false;

      // console.log("Computing similarities...");
      this.computeSimilarities();

      // console.log("Extracting course features...");
      const courseFeatures = await this.extractCourseFeatures(courses);

      // console.log("Building user profiles...");
      await this.buildUserProfiles(enrollments, courseFeatures);

      // Create metadata for the trained model
      this.modelMetadata = {
        lastTrainedAt: new Date(),
        version: "1.0.0",
        trainingDataStats: {
          totalUsers: users.length,
          totalCourses: courses.length,
          totalEnrollments: enrollments.length,
        },
        modelMetrics: {
          matrixDensity: this.calculateMatrixDensity(),
          factorizationDimensions: this.userFeatures?.columns || 0,
        },
      };
      const recommendationPromises = Array.from(this.userToIdx.entries()).map(
        async ([userId]) => {
          try {
            const userPrediction = await this.getRecommendations(
              userId,
              10,
              courses
            );
            this.usersRecommendations.set(
              userId,
              userPrediction.map((p) => p.course.id)
            );
          } catch (err) {
            console.warn(`Erreur pour l'utilisateur ${userId} :`, err);
          }
        }
      );

      await Promise.all(recommendationPromises);

      // console.log("Saving model...");
      await this.saveModel();
      this.clearData();

      // console.log("ML Recommendation model trained successfully!");
      return true;
    } catch (error) {
      console.error("Training failed:", error);
      return false;
    }
  }
  private calculateMatrixDensity(): number {
    if (!this.userItemMatrix) return 0;

    const totalEntries = this.userItemMatrix.rows * this.userItemMatrix.columns;
    const nonZeroEntries = this.userItemMatrix
      .to2DArray()
      .flat()
      .filter((val) => val > 0).length;

    return nonZeroEntries / totalEntries;
  }

  private async getRecommendations(
    userId: string,
    limit: number = 10,
    courses: CourseDocument[]
  ): Promise<Prediction[]> {
    try {
      const enrollments = await Enrollment.find({
        participant: new Types.ObjectId(userId),
      }).exec();
      const enrolledCourseIds = new Set(
        enrollments.map((e) => e.course.toString())
      );

      const user = await User.findById(userId).exec();
      const userField = user?.fieldOfStudy?.toLowerCase();
      const userLevel = user?.educationLevel;

      const predictionPromises = courses
        .filter((course) => !enrolledCourseIds.has(course.id))
        .map(async (course) => {
          const rating = await this.predictRating(userId, course.id);
          // console.log("rating", rating, "course", course.id);

          let bonusScore = 0;
          if (
            userField &&
            course.category?.name?.toLowerCase().includes(userField)
          ) {
            bonusScore += 0.5;
          }
          if (userLevel && this.levelMatches(userLevel, course.level)) {
            bonusScore += 0.3;
          }

          return {
            course,
            predictedRating: rating + bonusScore,
          };
        });

      const predictions = await Promise.all(predictionPromises);

      return predictions
        .sort((a, b) => b.predictedRating - a.predictedRating)
        .slice(0, limit);
    } catch (error) {
      console.error("Error generating recommendations:", error);
      return [];
    }
  }

  async getRecommendationsForUser(
    userId: string,
    limit: number = 10
  ): Promise<courseDataGenerale[]> {
    try {
      // Ensure model is loaded
      if (!this.modelMetadata) {
        const loaded = await this.loadModel();
        if (!loaded) {
          throw new Error("Failed to load recommendation model");
        }
      }

      // Try to get precomputed recommendations first (FAST PATH)
      const precomputed = this.usersRecommendations.get(userId);
      // console.log("precomputed recommendations", precomputed);
      // console.log("usersRecommendations", this.usersRecommendations);

      if (precomputed && precomputed.length > 0) {
        // console.log(`Using precomputed recommendations for user ${userId}`);

        // Get course details for the recommended course IDs
        const courseIds = precomputed
          .slice(0, limit)
          .map((rec) => new Types.ObjectId(rec));

        const courses = await Course.find({
          _id: { $in: courseIds },
          isPublished: true,
        })
          .populate("instructor", [
            "userName",
            "profileImg",
            "AboutMe",
            "speciality",
          ])
          .exec();

        if (!courses) {
          return [];
        }

        const predictions = await Promise.all(
          courses.map(async (course: CourseDocument) => {
            return this.transformCourseGenerale(course);
          })
        );

        return predictions;
      }

      // Fallback to real-time computation (SLOW PATH)
      // console.log(
      //   `No precomputed recommendations found for user ${userId}, computing real-time...`
      // );
      const preCourses = await Course.find({
        isPublished: true,
      }).exec();

      const courses = await Promise.all(
        (
          await this.getRecommendations(userId, limit, preCourses)
        ).map(async (rec) => {
          const course = rec.course;
          await course.populate("instructor", [
            "userName",
            "profileImg",
            "AboutMe",
            "speciality",
          ]);
          return course;
        })
      );

      if (!courses) {
        return [];
      }

      const predictions = await Promise.all(
        courses.map(async (course: CourseDocument) => {
          return this.transformCourseGenerale(course);
        })
      );

      return predictions;
    } catch (error) {
      console.error("Error generating recommendations:", error);
      return [];
    }
  }

  private levelMatches(userLevel: string, courseLevel: string): boolean {
    const levelMap: Record<string, string[]> = {
      high_school: ["Beginner"],
      associate: ["Beginner", "Intermediate"],
      bachelor: ["Intermediate", "Advanced"],
      master: ["Advanced"],
      doctorate: ["Advanced"],
    };

    return (
      levelMap[userLevel]?.includes(courseLevel) || courseLevel === "All Levels"
    );
  }

  /**
   * Save trained model to file
   */
  public async saveModel(
    filePath: string = path.resolve(process.cwd(), "trainedModel.json")
  ): Promise<void> {
    if (!this.userItemMatrix || !this.userFeatures || !this.itemFeatures) {
      throw new Error(
        "No trained model to save. Please train the model first."
      );
    }
    if (!this.modelMetadata) {
      throw new Error(
        "Model metadata not available. Please train the model first."
      );
    }
    try {
      const modelData: EnhancedModelData = {
        userItemMatrix: this.userItemMatrix.to2DArray(),
        userFeatures: this.userFeatures.to2DArray(),
        itemFeatures: this.itemFeatures.to2DArray(),
        userSimilarity: this.userSimilarity?.to2DArray() || [],
        itemSimilarity: this.itemSimilarity?.to2DArray() || [],
        userToIdx: Array.from(this.userToIdx.entries()),
        courseToIdx: Array.from(this.courseToIdx.entries()),
        idxToUser: Array.from(this.idxToUser.entries()),
        idxToCourse: Array.from(this.idxToCourse.entries()),
        userProfiles: Array.from(this.userProfiles.entries()),
        usersRecommendations: Array.from(this.usersRecommendations.entries()),
        matrixShape: {
          userItemRows: this.userItemMatrix.rows,
          userItemCols: this.userItemMatrix.columns,
          userFeaturesRows: this.userFeatures.rows,
          userFeaturesCols: this.userFeatures.columns,
          itemFeaturesRows: this.itemFeatures.rows,
          itemFeaturesCols: this.itemFeatures.columns,
        },
        metadata: this.modelMetadata,
      };

      // Ensure directory exists
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(filePath, JSON.stringify(modelData, null, 2));
      // console.log(`Model saved successfully to ${filePath}`);
    } catch (error) {
      console.error("Error saving model:", error);
      throw new Error(`Failed to save model: ${error}`);
    }
  }

  /**
   * Load trained model from file
   */
  public async loadModel(
    filePath: string = path.resolve(process.cwd(), "trainedModel.json")
  ): Promise<boolean> {
    try {
      if (!fs.existsSync(filePath)) {
        console.error(`Model file not found: ${filePath}`);
        return false;
      }

      const modelData: EnhancedModelData = JSON.parse(
        fs.readFileSync(filePath, "utf8")
      );
      // console.log(" modelData", modelData);
      // Restore matrices
      this.userItemMatrix = new Matrix(modelData.userItemMatrix);
      this.userFeatures = new Matrix(modelData.userFeatures);
      this.itemFeatures = new Matrix(modelData.itemFeatures);

      // Restore similarity matrices if they exist
      if (modelData.userSimilarity && modelData.userSimilarity.length > 0) {
        this.userSimilarity = new Matrix(modelData.userSimilarity);
      }
      if (modelData.itemSimilarity && modelData.itemSimilarity.length > 0) {
        this.itemSimilarity = new Matrix(modelData.itemSimilarity);
      }

      // Restore mappings
      this.usersRecommendations = new Map(modelData.usersRecommendations);
      this.userToIdx = new Map(modelData.userToIdx);
      this.courseToIdx = new Map(modelData.courseToIdx);
      this.idxToUser = new Map(modelData.idxToUser);
      this.idxToCourse = new Map(modelData.idxToCourse);
      this.userProfiles = new Map(modelData.userProfiles);

      // Restore metadata
      this.modelMetadata = {
        ...modelData.metadata,
        lastTrainedAt: new Date(modelData.metadata.lastTrainedAt),
      };

      return true;
    } catch (error) {
      console.error("Error loading model:", error);
      return false;
    }
  }

  /**
   * Check if model is trained and ready for predictions
   */
  public async isModelTrained(): Promise<boolean> {
    await this.loadModel();
    return !!(
      this.userItemMatrix &&
      this.userFeatures &&
      this.itemFeatures &&
      this.userToIdx.size > 0 &&
      this.courseToIdx.size > 0
    );
  }

  /**
   * Clear model data (useful for memory management)
   */
  public clearData(): void {
    this.userItemMatrix = null;
    this.userFeatures = null;
    this.itemFeatures = null;
    this.userSimilarity = null;
    this.itemSimilarity = null;
    this.userToIdx.clear();
    this.courseToIdx.clear();
    this.idxToUser.clear();
    this.idxToCourse.clear();
    this.userProfiles.clear();
    this.courseClusters.clear();
    this.modelMetadata = null;

    // console.log("Model data cleared from memory");
  }

  // Get similar users for a given user
  getSimilarUsers(userId: string, limit: number = 5): SimilarUser[] {
    if (!this.userToIdx.has(userId) || !this.userSimilarity) {
      return [];
    }

    const userIdx = this.userToIdx.get(userId)!;
    const similarities: SimilarUser[] = [];

    for (let i = 0; i < this.userSimilarity.rows; i++) {
      if (i !== userIdx) {
        const similarUserId = this.idxToUser.get(i);
        if (similarUserId) {
          similarities.push({
            userId: similarUserId,
            similarity: this.userSimilarity.get(userIdx, i),
          });
        }
      }
    }

    similarities.sort((a, b) => b.similarity - a.similarity);
    return similarities.slice(0, limit);
  }

  // Get similar courses for a given course
  public async getSimilarCourses(
    courseId: string,
    limit: number = 5
  ): Promise<courseDataGenerale[]> {
    if (!this.courseToIdx.has(courseId) || !this.itemSimilarity) {
      return [];
    }

    const courseIdx = this.courseToIdx.get(courseId)!;
    const similarities: SimilarCourse[] = [];

    for (let i = 0; i < this.itemSimilarity.rows; i++) {
      if (i !== courseIdx) {
        const similarCourseId = this.idxToCourse.get(i);
        if (similarCourseId) {
          similarities.push({
            courseId: similarCourseId,
            similarity: this.itemSimilarity.get(courseIdx, i),
          });
        }
      }
    }

    similarities.sort((a, b) => b.similarity - a.similarity);
    const courseIds = similarities.map((similarity) =>  new Types.ObjectId(similarity.courseId)).slice(0, limit);
    // console.log("courseIds", courseIds);
    const courses = await Course.find({
      _id: { $in: courseIds },
      isPublished: true,
    })
      .populate("instructor", [
        "userName",
        "profileImg",
        "AboutMe",
        "speciality",
      ])
      .exec();
    // console.log("courses", courses);

    if (!courses) {
      return [];
    }
    const SimilarCourses = await Promise.all(
      courses.map(async (course: CourseDocument) => {
        return this.transformCourseGenerale(course);
      })
    );
    // console.log("SimilarCourses", SimilarCourses);
    return SimilarCourses;
  }
  private transformCourseGenerale(course: CourseDocument): courseDataGenerale {
    const totalRating = course.reviews.reduce(
      (sum, review) => sum + review.rating,
      0
    );
    const averageRating = course.reviews.length
      ? totalRating / course.reviews.length
      : 0;
    const totaleDuration = course.sections.reduce(
      (total: number, section: Section) => {
        return (
          total +
          section.lectures.reduce((sectionTotal: number, lecture: Lecture) => {
            return sectionTotal + lecture.duration;
          }, 0)
        );
      },
      0
    );
    return {
      id: (course._id as mongoose.Types.ObjectId).toString(),
      title: course.title,
      description: course.description,
      language: course.language,
      thumbnailPreview: course.thumbnailPreview,
      category: course.category.name,
      level: course.level,
      price: course.pricing.price,
      reviews: averageRating,
      duration: totaleDuration,
      students: course.students.length,
      instructorName:
        (course.instructor as any).userName || "Unknown Instructor",
      instructorImg: (course.instructor as any).profileImg || "",
      InstructorId: (course.instructor as any).id || "",
      createdAt: course.createdAt,
    };
  }
}

export default MLRecommendationService;
