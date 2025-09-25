import * as TaskManager from "expo-task-manager";
import * as BackgroundFetch from "expo-background-fetch";
import { resetDailyStatuses } from "../Services/storage";

export const RESET_TASK = "reset-daily-statuses";

TaskManager.defineTask(RESET_TASK, async () => {
  try {
    console.log("🔄 Running daily reset background task...");
    await resetDailyStatuses();
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (err) {
    console.error("❌ Failed in daily reset task:", err);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});
