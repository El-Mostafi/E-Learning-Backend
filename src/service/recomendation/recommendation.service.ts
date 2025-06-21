// import { Matrix, SVD } from "ml-matrix";
// import mongoose, { Types } from "mongoose";
// import * as tf from "@tensorflow/tfjs-node";
// import Enrollment, { EnrollmentDocument } from "../../models/enrollment";
// import User from "../../models/user";
// import Course from "../../models/course";
// import {
//   ModelData,
//   TrainingOptions,
// } from "src/routers/recomendation/dtos/recomendation.dtos";

// // --- Type Definitions for Mongoose Models ---

// // Base interface for all Mongoose documents
// interface BaseDocument {
//   _id: Types.ObjectId;
// }

// // Interfaces based on schema usage in the code
// interface User extends BaseDocument {
//   fieldOfStudy?: string;
//   educationLevel?:
//     | "high_school"
//     | "associate"
//     | "bachelor"
//     | "master"
//     | "doctorate";
//   // Add other user fields as needed
// }

// interface Category extends BaseDocument {
//   name: string;
// }

// interface Review {
//   rating: number;
// }

// interface Lecture {
//   // Define lecture properties if needed
// }

// interface Section {
//   lectures: Lecture[];
// }

// interface Pricing {
//   isFree: boolean;
//   price?: number;
// }

// interface Course extends BaseDocument {
//   isPublished: boolean;
//   category?: Category;
//   level: "Beginner" | "Intermediate" | "Advanced" | "All Levels";
//   language: string;
//   pricing: Pricing;
//   reviews: Review[];
//   sections: Section[];
// }

// interface Enrollment extends BaseDocument {
//   participant: Types.ObjectId;
//   course: Types.ObjectId;
//   progress: number;
//   completed: boolean;
//   hasPassedQuizze?: boolean;
//   QuizzeScore?: number;
//   startedAt: Date;
//   completedAt?: Date;
// }

// // A specialized type for the result of the aggregation pipeline
// interface EnrichedEnrollment extends Enrollment {
//   user: User;
//   course_data: Course;
// }

// // --- Interfaces for Service Method Return Types ---

// export interface Recommendation {
//   courseId: string;
//   predictedRating: number;
// }

// export interface SimilarUser {
//   userId: string;
//   similarity: number;
// }

// export interface SimilarCourse {
//   courseId: string;
//   similarity: number;
// }

// // --- The Recommendation Service Class ---

// export class MLRecommendationService {
//   private userItemMatrixR: Matrix | null = null;
//   private W: tf.Variable | null = null;
//   private X: tf.Variable | null = null;
//   private b: tf.Variable | null = null;
//   private Ymean: tf.Tensor | null = null;
//   private userItemMatrix: Matrix | null = null;
//   private userFeatures: Matrix | null = null;
//   private itemFeatures: Matrix | null = null;
//   private userToIdx = new Map<string, number>();
//   private courseToIdx = new Map<string, number>();
//   private idxToUser = new Map<number, string>();
//   private idxToCourse = new Map<number, string>();
//   private userSimilarity: Matrix | null = null;
//   private itemSimilarity: Matrix | null = null;
//   private userProfiles = new Map<string, Record<string, number>>();

//   /**
//    * Loads all necessary data from the database.
//    */
//   private async loadData(): Promise<{
//     enrollments: EnrichedEnrollment[];
//     users: User[];
//     courses: Course[];
//   }> {
//     try {
//       const enrollments = (await Enrollment.aggregate([
//         {
//           $lookup: {
//             from: "users",
//             localField: "participant",
//             foreignField: "_id",
//             as: "user",
//           },
//         },
//         {
//           $lookup: {
//             from: "courses",
//             localField: "course",
//             foreignField: "_id",
//             as: "course_data",
//           },
//         },
//         { $unwind: "$user" },
//         { $unwind: "$course_data" },
//       ]).exec()) as EnrichedEnrollment[];

//       const users = (await User.find({ role: "student" }).exec()) as User[];
//       const courses = (await Course.find({
//         isPublished: true,
//       }).exec()) as Course[];

//       return { enrollments, users, courses };
//     } catch (error) {
//       console.error("Error loading data:", error);
//       return { enrollments: [], users: [], courses: [] };
//     }
//   }

//   /**
//    * Generates an implicit rating (0-5) based on user engagement.
//    */
//   private generateImplicitRating(enrollment: Enrollment): number {
//     let rating = 0;

//     // Progress weight (40%)
//     rating += (enrollment.progress / 100) * 4;

//     // Completion bonus (30%)
//     if (enrollment.completed) rating += 3;

//     // Quiz performance (30%)
//     if (enrollment.hasPassedQuizze && enrollment.QuizzeScore) {
//       rating += (enrollment.QuizzeScore / 100) * 3;
//     }

//     // Time engagement bonus
//     const daysEnrolled = enrollment.completedAt
//       ? (new Date(enrollment.completedAt).getTime() -
//           new Date(enrollment.startedAt).getTime()) /
//         (1000 * 60 * 60 * 24)
//       : (new Date().getTime() - new Date(enrollment.startedAt).getTime()) /
//         (1000 * 60 * 60 * 24);

//     if (daysEnrolled > 0 && daysEnrolled < 30) {
//       rating += 0.5; // Bonus for quick completion
//     }

//     return Math.min(Math.max(rating, 0), 5); // Clamp rating to 0-5
//   }
//   private cofiCostFunc(
//     X: tf.Tensor,
//     W: tf.Tensor,
//     b: tf.Tensor,
//     Y: tf.Tensor,
//     R: tf.Tensor,
//     lambda: number
//   ): tf.Scalar {
//     return tf.tidy(() => {
//       const predictions = tf.add(tf.matMul(X, W, false, true), b);
//       const error = tf.mul(tf.sub(predictions, Y), R);
//       const costTerm = tf.mul(0.5, tf.sum(tf.square(error)));
//       const regTerm = tf.mul(
//         lambda / 2,
//         tf.add(tf.sum(tf.square(X)), tf.sum(tf.square(W)))
//       );
//       return tf.add(costTerm, regTerm) as tf.Scalar;
//     });
//   }

//   private initializeParameters(
//     numUsers: number,
//     numItems: number,
//     numFeatures: number
//   ): void {
//     this.W = tf.variable(
//       tf.randomNormal([numUsers, numFeatures], 0, 0.1, "float32", 1234),
//       true,
//       "W"
//     );

//     this.X = tf.variable(
//       tf.randomNormal([numItems, numFeatures], 0, 0.1, "float32", 1234),
//       true,
//       "X"
//     );

//     this.b = tf.variable(
//       tf.randomNormal([1, numUsers], 0, 0.1, "float32", 1234),
//       true,
//       "b"
//     );
//   }
//   private normalizeRatings(
//     Y: tf.Tensor,
//     R: tf.Tensor
//   ): { Ynorm: tf.Tensor; Ymean: tf.Tensor } {
//     return tf.tidy(() => {
//       const sumRatings = tf.sum(tf.mul(Y, R), 1, true);
//       const numRatings = tf.sum(R, 1, true);
//       const Ymean = tf.div(sumRatings, tf.add(numRatings, 1e-12));
//       const Ynorm = tf.sub(Y, Ymean);

//       return {
//         Ynorm: tf.mul(Ynorm, R),
//         Ymean,
//       };
//     });
//   }

//   //   public async trainModel(ratingsData: RatingData[], options: TrainingOptions = {}): Promise<void> {
//   //     const {
//   //       numFeatures = 50,
//   //       learningRate = 0.1,
//   //       iterations = 600,
//   //       lambda = 1.0,
//   //       logInterval = 20
//   //     } = options;

//   //     if (this.isTraining) {
//   //       throw new Error('Model is already training');
//   //     }

//   //     this.isTraining = true;

//   //     try {
//   //       // Extract unique users and items
//   //       const userIds = [...new Set(ratingsData.map(r => r.userId))];
//   //       const courseIds = [...new Set(ratingsData.map(r => r.courseId))];

//   //       const numUsers = userIds.length;
//   //       const numItems = courseIds.length;

//   //       // Create mappings
//   //       const userIndexMap = new Map(userIds.map((id, idx) => [id, idx]));
//   //       const itemIndexMap = new Map(courseIds.map((id, idx) => [id, idx]));

//   //       console.log(`Training model with ${numUsers} users, ${numItems} courses, ${numFeatures} features`);

//   //       // Build ratings matrix Y and mask matrix R
//   //       const YArray = Array(numItems).fill(null).map(() => Array(numUsers).fill(0));
//   //       const RArray = Array(numItems).fill(null).map(() => Array(numUsers).fill(0));

//   //       ratingsData.forEach(({ userId, courseId, rating }) => {
//   //         const userIdx = userIndexMap.get(userId);
//   //         const itemIdx = itemIndexMap.get(courseId);
//   //         if (userIdx !== undefined && itemIdx !== undefined) {
//   //           YArray[itemIdx][userIdx] = rating;
//   //           RArray[itemIdx][userIdx] = 1;
//   //         }
//   //       });

//   //       const Y = tf.tensor2d(YArray, [numItems, numUsers], 'float32');
//   //       const R = tf.tensor2d(RArray, [numItems, numUsers], 'float32');

//   //       // Normalize ratings
//   //       const { Ynorm, Ymean } = this.normalizeRatings(Y, R);

//   //       // Initialize parameters
//   //       this.initializeParameters(numUsers, numItems, numFeatures);

//   //       // Create optimizer
//   //       const optimizer = tf.train.adam(learningRate);

//   //       // Training loop
//   //       for (let iter = 0; iter < iterations; iter++) {
//   //         const cost = optimizer.minimize(() => {
//   //           return this.cofiCostFunc(this.X!, this.W!, this.b!, Ynorm, R, lambda);
//   //         }, false, [this.X, this.W, this.b]);

//   //         if (iter % logInterval === 0) {
//   //           const costValue = await cost.data();
//   //           console.log(`Training loss at iteration ${iter}: ${costValue[0].toFixed(1)}`);
//   //         }

//   //         cost.dispose();
//   //       }

//   //       // Store metadata for predictions
//   //       this.userIndexMap = userIndexMap;
//   //       this.itemIndexMap = itemIndexMap;
//   //       this.userIds = userIds;
//   //       this.courseIds = courseIds;
//   //       this.Ymean = Ymean;

//   //       console.log('Training completed successfully');

//   //       // Cleanup
//   //       Y.dispose();
//   //       R.dispose();
//   //       Ynorm.dispose();

//   //     } catch (error) {
//   //       console.error('Training failed:', error);
//   //       throw error;
//   //     } finally {
//   //       this.isTraining = false;
//   //     }
//   //   }
//   /**
//    * Creates the user-item interaction matrix from enrollment data.
//    */
//   private createUserItemMatrix(
//     enrollments: EnrichedEnrollment[],
//     users: User[],
//     courses: Course[]
//   ): void {
//     users.forEach((user, idx) => {
//       const userId = user._id.toString();
//       this.userToIdx.set(userId, idx);
//       this.idxToUser.set(idx, userId);
//     });

//     courses.forEach((course, idx) => {
//       const courseId = course._id.toString();
//       this.courseToIdx.set(courseId, idx);
//       this.idxToCourse.set(idx, courseId);
//     });

//     const matrix = Array(courses.length)
//       .fill(0)
//       .map(() => Array(users.length).fill(0));
//     const R = Array(courses.length)
//       .fill(0)
//       .map(() => Array(users.length).fill(0));

//     enrollments.forEach((enrollment) => {
//       const userId = enrollment.participant.toString();
//       const courseId = enrollment.course.toString();

//       if (this.userToIdx.has(userId) && this.courseToIdx.has(courseId)) {
//         const userIdx = this.userToIdx.get(userId)!;
//         const courseIdx = this.courseToIdx.get(courseId)!;
//         // Assign the rating to the Y matrix
//         matrix[courseIdx][userIdx] = this.generateImplicitRating(enrollment);

//         // Mark this course-user pair as "rated" in the R matrix
//         R[courseIdx][userIdx] = 1;
//       }
//     });

//     this.userItemMatrix = new Matrix(matrix);
//     this.userItemMatrixR = new Matrix(R);
//   }

//   /**
//    * Performs matrix factorization using SVD to get user and item feature vectors.
//    */
//   //   private performMatrixFactorization(k = 50): boolean {
//   //     if (!this.userItemMatrix) {
//   //       console.error(
//   //         "Matrix factorization failed: User-item matrix is not initialized."
//   //       );
//   //       return false;
//   //     }
//   //     try {
//   //       const svd = new SVD(this.userItemMatrix, {
//   //         computeLeftSingularVectors: true,
//   //         computeRightSingularVectors: true,
//   //       });

//   //       const reducedK = Math.min(k, svd.diagonal.length);

//   //       const userFeatures = svd.leftSingularVectors.subMatrix(
//   //         0,
//   //         svd.leftSingularVectors.rows - 1,
//   //         0,
//   //         reducedK - 1
//   //       );
//   //       const sqrtS = Matrix.diag(svd.diagonal.slice(0, reducedK).map(Math.sqrt));
//   //       this.userFeatures = userFeatures.mmul(sqrtS);

//   //       const itemFeatures = svd.rightSingularVectors.subMatrix(
//   //         0,
//   //         svd.rightSingularVectors.rows - 1,
//   //         0,
//   //         reducedK - 1
//   //       );
//   //       this.itemFeatures = itemFeatures.mmul(sqrtS);

//   //       console.log("Matrix factorization completed successfully.");
//   //       return true;
//   //     } catch (error) {
//   //       console.error("Matrix factorization failed:", error);
//   //       return false;
//   //     }
//   //   }

//   /**
//    * Calculates the cosine similarity between two vectors.
//    */
//   //   private cosineSimilarity(vecA: number[], vecB: number[]): number {
//   //     const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
//   //     const normA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
//   //     const normB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));

//   //     if (normA === 0 || normB === 0) return 0;
//   //     return dotProduct / (normA * normB);
//   //   }

//   /**
//    * Computes and stores user-user and item-item similarity matrices.
//    */
//   //   private computeSimilarities(): void {
//   //     if (!this.userFeatures || !this.itemFeatures) {
//   //       console.error(
//   //         "Cannot compute similarities: Feature matrices are not available."
//   //       );
//   //       return;
//   //     }

//   //     const numUsers = this.userFeatures.rows;
//   //     this.userSimilarity = new Matrix(numUsers, numUsers);
//   //     for (let i = 0; i < numUsers; i++) {
//   //       for (let j = i; j < numUsers; j++) {
//   //         const similarity = this.cosineSimilarity(
//   //           this.userFeatures.getRow(i),
//   //           this.userFeatures.getRow(j)
//   //         );
//   //         this.userSimilarity.set(i, j, similarity);
//   //         this.userSimilarity.set(j, i, similarity);
//   //       }
//   //     }

//   //     const numItems = this.itemFeatures.rows;
//   //     this.itemSimilarity = new Matrix(numItems, numItems);
//   //     for (let i = 0; i < numItems; i++) {
//   //       for (let j = i; j < numItems; j++) {
//   //         const similarity = this.cosineSimilarity(
//   //           this.itemFeatures.getRow(i),
//   //           this.itemFeatures.getRow(j)
//   //         );
//   //         this.itemSimilarity.set(i, j, similarity);
//   //         this.itemSimilarity.set(j, i, similarity);
//   //       }
//   //     }
//   //   }

//   /**
//    * Extracts a feature vector for each course based on its metadata.
//    */
//   //   private async extractCourseFeatures(
//   //     courses: Course[]
//   //   ): Promise<Map<string, Record<string, number>>> {
//   //     const features = new Map<string, Record<string, number>>();

//   //     const categories = [
//   //       ...new Set(courses.map((c) => c.category?.name || "Other")),
//   //     ];
//   //     const levels = [...new Set(courses.map((c) => c.level))];
//   //     const languages = [...new Set(courses.map((c) => c.language))];

//   //     courses.forEach((course) => {
//   //       const courseId = course._id.toString();
//   //       const featureVector: Record<string, number> = {
//   //         ...categories.reduce((acc: Record<string, number>, cat) => {
//   //           acc[`category_${cat}`] = course.category?.name === cat ? 1 : 0;
//   //           return acc;
//   //         }, {}),
//   //         ...levels.reduce((acc: Record<string, number>, level) => {
//   //           acc[`level_${level}`] = course.level === level ? 1 : 0;
//   //           return acc;
//   //         }, {}),
//   //         ...languages.reduce((acc: Record<string, number>, lang) => {
//   //           acc[`language_${lang}`] = course.language === lang ? 1 : 0;
//   //           return acc;
//   //         }, {}),
//   //         price: course.pricing.isFree ? 0 : course.pricing.price || 0,
//   //         isFree: course.pricing.isFree ? 1 : 0,
//   //         avgRating:
//   //           course.reviews.length > 0
//   //             ? course.reviews.reduce((sum, r) => sum + r.rating, 0) /
//   //               course.reviews.length
//   //             : 0,
//   //         numReviews: course.reviews.length,
//   //         numSections: course.sections.length,
//   //         totalLectures: course.sections.reduce(
//   //           (sum, s) => sum + s.lectures.length,
//   //           0
//   //         ),
//   //       };

//   //       features.set(courseId, featureVector);
//   //     });

//   //     return features;
//   //   }

//   /**
//    * Builds a feature profile for each user based on the courses they've interacted with.
//    */
//   //   private async buildUserProfiles(
//   //     enrollments: EnrichedEnrollment[],
//   //     courseFeatures: Map<string, Record<string, number>>
//   //   ): Promise<void> {
//   //     const userEnrollments = new Map<string, EnrichedEnrollment[]>();
//   //     enrollments.forEach((enrollment) => {
//   //       const userId = enrollment.participant.toString();
//   //       if (!userEnrollments.has(userId)) {
//   //         userEnrollments.set(userId, []);
//   //       }
//   //       userEnrollments.get(userId)!.push(enrollment);
//   //     });

//   //     userEnrollments.forEach((enrolls, userId) => {
//   //       const profile: Record<string, number> = {};
//   //       let totalWeight = 0;

//   //       enrolls.forEach((enrollment) => {
//   //         const courseId = enrollment.course.toString();
//   //         const courseFeature = courseFeatures.get(courseId);
//   //         if (courseFeature) {
//   //           const weight = this.generateImplicitRating(enrollment);
//   //           totalWeight += weight;

//   //           Object.keys(courseFeature).forEach((key) => {
//   //             if (!profile[key]) profile[key] = 0;
//   //             profile[key] += courseFeature[key] * weight;
//   //           });
//   //         }
//   //       });

//   //       if (totalWeight > 0) {
//   //         Object.keys(profile).forEach((key) => {
//   //           profile[key] /= totalWeight;
//   //         });
//   //       }

//   //       this.userProfiles.set(userId, profile);
//   //     });
//   //   }

//   /**
//    * Predicts a rating for a user-course pair using a hybrid approach.
//    */
//   //   public async predictRating(
//   //     userId: string,
//   //     courseId: string
//   //   ): Promise<number> {
//   //     if (!this.userToIdx.has(userId) || !this.courseToIdx.has(courseId)) {
//   //       return this.contentBasedRating(userId, courseId);
//   //     }

//   //     const userIdx = this.userToIdx.get(userId)!;
//   //     const courseIdx = this.courseToIdx.get(courseId)!;

//   //     let collabRating = 2.5; // Default to average rating
//   //     if (this.userFeatures && this.itemFeatures) {
//   //       const userFeature = this.userFeatures.getRow(userIdx);
//   //       const itemFeature = this.itemFeatures.getRow(courseIdx);
//   //       const prediction = userFeature.reduce(
//   //         (sum, val, i) => sum + val * itemFeature[i],
//   //         0
//   //       );
//   //       collabRating = Math.max(0, Math.min(5, prediction)); // Clamp to 0-5
//   //     }

//   //     const contentRating = await this.contentBasedRating(userId, courseId);

//   //     return collabRating * 0.7 + contentRating * 0.3; // Weighted hybrid
//   //   }

//   /**
//    * Predicts a rating based on content similarity between user profile and course features.
//    */
//   //   private async contentBasedRating(
//   //     userId: string,
//   //     courseId: string
//   //   ): Promise<number> {
//   //     if (!this.userProfiles.has(userId)) return 2.5; // Default rating for new users

//   //     const userProfile = this.userProfiles.get(userId)!;
//   //     const course = (await Course.findOne({
//   //       _id: new Types.ObjectId(courseId),
//   //     })) as Course | null;

//   //     if (!course) return 2.5;

//   //     const courseFeatureSet = await this.extractCourseFeatures([course]);
//   //     const courseFeature = courseFeatureSet.get(courseId);

//   //     if (!courseFeature) return 2.5;

//   //     let dotProduct = 0;
//   //     let normUser = 0;
//   //     let normCourse = 0;

//   //     const allKeys = new Set([
//   //       ...Object.keys(userProfile),
//   //       ...Object.keys(courseFeature),
//   //     ]);

//   //     allKeys.forEach((key) => {
//   //       const userVal = userProfile[key] || 0;
//   //       const courseVal = courseFeature[key] || 0;
//   //       dotProduct += userVal * courseVal;
//   //       normUser += userVal * userVal;
//   //       normCourse += courseVal * courseVal;
//   //     });

//   //     if (normUser === 0 || normCourse === 0) return 2.5;

//   //     const cosineSim =
//   //       dotProduct / (Math.sqrt(normUser) * Math.sqrt(normCourse));
//   //     return 2.5 + cosineSim * 2.5; // Scale similarity [-1, 1] to a rating [0, 5]
//   //   }

//   /**
//    * Main training method to orchestrate the model building process.
//    */
//   public async trainModel(): Promise<boolean> {
//     const numFeatures = 50;
//     const learningRate = 0.1;
//     const iterations = 600;
//     const lambda = 1.0;
//     const logInterval = 20;
//     try {
//       console.log("Loading data...");
//       const { enrollments, users, courses } = await this.loadData();

//       if (
//         enrollments.length === 0 ||
//         users.length === 0 ||
//         courses.length === 0
//       ) {
//         console.log("Not enough data available to train the model.");
//         return false;
//       }

//       console.log("Creating user-item matrix...");
//       this.createUserItemMatrix(enrollments, users, courses);

//       console.log("Normalizing matrix...");
//       if (!this.userItemMatrix || !this.userItemMatrixR) return false;
//       const Y = tf.tensor2d(
//         this.userItemMatrix!.to2DArray(),
//         [this.courseToIdx.size, this.userToIdx.size],
//         "float32"
//       );
//       const R = tf.tensor2d(
//         this.userItemMatrixR!.to2DArray(),
//         [this.courseToIdx.size, this.userToIdx.size],
//         "float32"
//       );

//       // Normalize ratings
//       const { Ynorm, Ymean } = this.normalizeRatings(Y, R);
//       this.Ymean = Ymean;

//       // Initialize parameters
//       this.initializeParameters(
//         this.userToIdx.size,
//         this.courseToIdx.size,
//         numFeatures
//       );

//       // Create optimizer
//       const optimizer = tf.train.adam(learningRate);

//       if (!this.X || !this.W || !this.b) return false;
//       // Training loop
//       for (let iter = 0; iter < iterations; iter++) {
//         const cost = optimizer.minimize(
//           () => {
//             return this.cofiCostFunc(
//               this.X!,
//               this.W!,
//               this.b!,
//               Ynorm,
//               R,
//               lambda
//             );
//           },
//           false,
//           [this.X, this.W, this.b]
//         );

//         if (iter % logInterval === 0) {
//           const costValue = await cost!.data();
//           console.log(
//             `Training loss at iteration ${iter}: ${costValue[0].toFixed(1)}`
//           );
//         }

//         cost!.dispose();
//       }
//       await this.saveModel().then(()=>{
//           this.dispose();
//       });
      

//       //   console.log("Performing matrix factorization...");
//       //   if (!this.performMatrixFactorization(50)) return false;

//       //   console.log("Computing similarities...");
//       //   this.computeSimilarities();

//       //   console.log("Extracting course features...");
//       //   const courseFeatures = await this.extractCourseFeatures(courses);

//       //   console.log("Building user profiles...");
//       //   await this.buildUserProfiles(enrollments, courseFeatures);

//       //   console.log("ML Recommendation model trained successfully!");
//       return true;
//     } catch (error) {
//       console.error("Training failed:", error);
//       return false;
//     }
//   }

//   /**
//    * Get recommendations for a user
//    */
//   public async getRecommendations(
//     userId: string,
//     topK: number = 10
//   ): Promise<Recommendation[]> {
//     if (!this.X || !this.W || !this.b) {
//       throw new Error("Model not trained yet");
//     }

//     const userIdx = this.userToIdx.get(userId);
//     if (userIdx === undefined) {
//       throw new Error(`User ${userId} not found in training data`);
//     }

//     return tf.tidy(() => {
//       const predictions = tf.add(
//         tf.matMul(this.X!, this.W!, false, true),
//         this.b!
//       );
//       const finalPredictions = tf.add(predictions, this.Ymean!);
//       const userPredictions = finalPredictions.slice([0, userIdx], [-1, 1]);
//       const predictionsArray = userPredictions
//         .squeeze()
//         .arraySync() as number[];

//       const recommendations = Array.from(this.courseToIdx.keys())
//         .map((courseId, idx) => ({
//           courseId,
//           predictedRating: predictionsArray[idx],
//         }))
//         .sort((a, b) => b.predictedRating - a.predictedRating)
//         .slice(0, topK);

//       return recommendations;
//     });
//   }

//   /**
//    * Predict rating for a specific user-course pair
//    */
//   public async predictRating(
//     userId: string,
//     courseId: string
//   ): Promise<number> {
//     if (!this.X || !this.W || !this.b) {
//       throw new Error("Model not trained yet");
//     }

//     const userIdx = this.userToIdx.get(userId);
//     const itemIdx = this.courseToIdx.get(courseId);

//     if (userIdx === undefined || itemIdx === undefined) {
//       throw new Error("User or course not found in training data");
//     }

//     return tf.tidy(() => {
//       const userFeatures = this.W!.slice([userIdx, 0], [1, -1]);
//       const itemFeatures = this.X!.slice([itemIdx, 0], [1, -1]);
//       const userBias = this.b!.slice([0, userIdx], [1, 1]);
//       const itemMean = this.Ymean!.slice([itemIdx, 0], [1, 1]);

//       const prediction = tf.add(
//         tf.add(tf.matMul(itemFeatures, userFeatures, false, true), userBias),
//         itemMean
//       );

//       return prediction.dataSync()[0];
//     });
//   }

//   /**
//    * Save model to file
//    */
//   public async saveModel(): Promise<void> {
//     if (!this.X || !this.W || !this.b) {
//       throw new Error("No trained model to save");
//     }

//     const modelData: ModelData = {
//       X: Array.from(await this.X.data()),
//       W: Array.from(await this.W.data()),
//       b: Array.from(await this.b.data()),
//       Ymean: Array.from(await this.Ymean!.data()),
//       XShape: this.X.shape,
//       WShape: this.W.shape,
//       bShape: this.b.shape,
//       YmeanShape: this.Ymean!.shape,
//       userToIdx: Array.from(this.userToIdx.entries()),
//       courseToIdx: Array.from(this.courseToIdx.entries()),
//       idxToUser: Array.from(this.idxToUser.entries()),
//       idxToCourse: Array.from(this.idxToCourse.entries()),
//     };

//     const fs = require("fs");
//     fs.writeFileSync("./trainedModel.json", JSON.stringify(modelData));
//     console.log(`Model saved to ./trainedModel.json`);
//   }

//   /**
//    * Load model from file
//    */
//   public async loadModel(): Promise<void> {
//     const fs = require("fs");
//     const modelData: ModelData = JSON.parse(
//       fs.readFileSync("./trainedModel.json", "utf8")
//     );

//     this.X = tf.variable(tf.tensor(modelData.X, modelData.XShape), true, "X");
//     this.W = tf.variable(tf.tensor(modelData.W, modelData.WShape), true, "W");
//     this.b = tf.variable(tf.tensor(modelData.b, modelData.bShape), true, "b");
//     this.Ymean = tf.tensor(modelData.Ymean, modelData.YmeanShape);

//     this.userToIdx = new Map(modelData.userToIdx);
//     this.courseToIdx = new Map(modelData.courseToIdx);
//     this.idxToUser = new Map(modelData.idxToUser);
//     this.idxToCourse = new Map(modelData.idxToCourse);

//     console.log(`Model loaded from ./trainedModel.json`);
//   }

//   /**
//    * Clean up resources
//    */
//   public dispose(): void {
//     if (this.X) this.X.dispose();
//     if (this.W) this.W.dispose();
//     if (this.b) this.b.dispose();
//     if (this.Ymean) this.Ymean.dispose();
//     if (this.userToIdx) this.userToIdx.clear();
//     if (this.courseToIdx) this.courseToIdx.clear();
//     if (this.idxToUser) this.idxToUser.clear();
//     if (this.idxToCourse) this.idxToCourse.clear();
//     if (this.userItemMatrix) this.userItemMatrix = null;
//     if (this.userItemMatrixR) this.userItemMatrixR = null;
//   }
//   /**
//    * Gets a list of recommended courses for a given user.
//    */
//   //   public async getRecommendations(
//   //     userId: string,
//   //     limit = 10
//   //   ): Promise<Recommendation[]> {
//   //     try {
//   //       const allCourses = (await Course.find({
//   //         isPublished: true,
//   //       }).exec()) as Course[];
//   //       const userEnrollments = (await Enrollment.find({
//   //         participant: new Types.ObjectId(userId),
//   //       }).exec()) as Enrollment[];
//   //       const enrolledCourseIds = new Set(
//   //         userEnrollments.map((e) => e.course.toString())
//   //       );
//   //       const user = (await User.findOne({
//   //         _id: new Types.ObjectId(userId),
//   //       })) as User | null;

//   //       const predictions: Omit<Recommendation, "course">[] = [];
//   //       for (const course of allCourses) {
//   //         const courseId = course._id.toString();
//   //         if (!enrolledCourseIds.has(courseId)) {
//   //           const rating = await this.predictRating(userId, courseId);

//   //           let bonusScore = 0;
//   //           if (user) {
//   //             if (
//   //               user.fieldOfStudy &&
//   //               course.category?.name
//   //                 ?.toLowerCase()
//   //                 .includes(user.fieldOfStudy.toLowerCase())
//   //             ) {
//   //               bonusScore += 0.5;
//   //             }
//   //             if (
//   //               user.educationLevel &&
//   //               course.level &&
//   //               this.levelMatches(user.educationLevel, course.level)
//   //             ) {
//   //               bonusScore += 0.3;
//   //             }
//   //           }

//   //           predictions.push({
//   //             courseId: courseId,
//   //             predictedRating: rating + bonusScore,
//   //             confidence: this.calculateConfidence(userId, courseId),
//   //           });
//   //         }
//   //       }

//   //       predictions.sort((a, b) => {
//   //         const scoreA = a.predictedRating * a.confidence;
//   //         const scoreB = b.predictedRating * b.confidence;
//   //         return scoreB - scoreA;
//   //       });

//   //       const courseMap = new Map(allCourses.map((c) => [c._id.toString(), c]));
//   //       return predictions.slice(0, limit).map((p) => ({
//   //         courseId: p.courseId,
//   //         predictedRating: p.predictedRating,
//   //         confidence: p.confidence,
//   //       }));
//   //     } catch (error) {
//   //       console.error("Error generating recommendations:", error);
//   //       return [];
//   //     }
//   //   }

//   /**
//    * Checks if a course level is appropriate for a user's education level.
//    */
//   //   private levelMatches(
//   //     userLevel: NonNullable<User["educationLevel"]>,
//   //     courseLevel: Course["level"]
//   //   ): boolean {
//   //     const levelMap: Record<typeof userLevel, Course["level"][]> = {
//   //       high_school: ["Beginner"],
//   //       associate: ["Beginner", "Intermediate"],
//   //       bachelor: ["Intermediate", "Advanced"],
//   //       master: ["Advanced"],
//   //       doctorate: ["Advanced"],
//   //     };

//   //     return (
//   //       levelMap[userLevel]?.includes(courseLevel) || courseLevel === "All Levels"
//   //     );
//   //   }

//   /**
//    * Calculates a confidence score for a prediction.
//    */
//   //   private calculateConfidence(userId: string, courseId: string): number {
//   //     let confidence = 0.5;

//   //     if (this.userItemMatrix && this.userToIdx.has(userId)) {
//   //       const userIdx = this.userToIdx.get(userId)!;
//   //       const userRow = this.userItemMatrix.getRow(userIdx);
//   //       const nonZeroInteractions = userRow.filter((val) => val > 0).length;
//   //       confidence += Math.min(nonZeroInteractions / 10, 0.4);
//   //     }

//   //     if (this.courseToIdx.has(courseId)) {
//   //       confidence += 0.1;
//   //     }

//   //     return Math.min(confidence, 1.0);
//   //   }

//   /**
//    * Gets a list of similar users for a given user.
//    */
//   public getSimilarUsers(userId: string, limit = 5): SimilarUser[] {
//     if (!this.userToIdx.has(userId) || !this.userSimilarity) {
//       return [];
//     }

//     const userIdx = this.userToIdx.get(userId)!;
//     const similarities: SimilarUser[] = [];

//     for (let i = 0; i < this.userSimilarity.rows; i++) {
//       if (i !== userIdx) {
//         similarities.push({
//           userId: this.idxToUser.get(i)!,
//           similarity: this.userSimilarity.get(userIdx, i),
//         });
//       }
//     }

//     similarities.sort((a, b) => b.similarity - a.similarity);
//     return similarities.slice(0, limit);
//   }

//   /**
//    * Gets a list of similar courses for a given course.
//    */
//   public getSimilarCourses(courseId: string, limit = 5): SimilarCourse[] {
//     if (!this.courseToIdx.has(courseId) || !this.itemSimilarity) {
//       return [];
//     }

//     const courseIdx = this.courseToIdx.get(courseId)!;
//     const similarities: SimilarCourse[] = [];

//     for (let i = 0; i < this.itemSimilarity.rows; i++) {
//       if (i !== courseIdx) {
//         similarities.push({
//           courseId: this.idxToCourse.get(i)!,
//           similarity: this.itemSimilarity.get(courseIdx, i),
//         });
//       }
//     }

//     similarities.sort((a, b) => b.similarity - a.similarity);
//     return similarities.slice(0, limit);
//   }
// }
