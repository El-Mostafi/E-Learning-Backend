import cron from "node-cron";
import cloudinary from "../../routers/cloudinary/cloud.routers";

interface CloudinaryResource {
  public_id: string;
  created_at: string;
}
const cleanupTemporaryVideos = async (): Promise<void> => {
  try {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    let nextCursor: string | undefined;

    do {
      const result = (await cloudinary.api.resources_by_tag("temporary", {
        resource_type: "video",
        max_results: 500,
        next_cursor: nextCursor,
      })) as { resources: CloudinaryResource[]; next_cursor?: string };

      const oldVideos = result.resources.filter(
        (video) => new Date(video.created_at) < cutoff
      );

      await Promise.all(
        oldVideos.map(async (video) => {
          await cloudinary.uploader.destroy(video.public_id, {
            resource_type: "video",
          });
        })
      );

      nextCursor = result.next_cursor;
    } while (nextCursor);

    console.log(`Cleaned up temporary videos at ${new Date().toISOString()}`);
  } catch (error) {
    console.error(
      "Cleanup error:",
      error instanceof Error ? error.message : "Unknown error"
    );
  }
};

cron.schedule("0 0 * * *", () => {
  console.log("⏰ Running scheduled Cloudinary cleanup...");
  cleanupTemporaryVideos().catch(console.error);
});
