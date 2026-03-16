import { useState, useCallback } from "react";
import { useTweetsDelete, useTweetsList } from "@workspace/api-client-react";
import type { Tweet } from "@workspace/api-client-react/src/generated/api.schemas";

export type DeletionStatus = "idle" | "fetching" | "deleting" | "success" | "error";

interface DeletionState {
  status: DeletionStatus;
  progress: number;
  total: number;
  deleted: number;
  failed: number;
  message: string;
}

export function useDeletionOrchestrator() {
  const [state, setState] = useState<DeletionState>({
    status: "idle",
    progress: 0,
    total: 0,
    deleted: 0,
    failed: 0,
    message: "",
  });

  const { mutateAsync: deleteBatch } = useTweetsDelete();

  const startDeletion = useCallback(async (
    tweetsToDelete: Tweet[],
    batchSize: number = 50,
    delayMs: number = 1000
  ) => {
    setState({
      status: "deleting",
      progress: 0,
      total: tweetsToDelete.length,
      deleted: 0,
      failed: 0,
      message: "Starting deletion process...",
    });

    if (tweetsToDelete.length === 0) {
      setState(prev => ({ ...prev, status: "success", message: "No tweets matched your criteria." }));
      return;
    }

    let deletedCount = 0;
    let failedCount = 0;

    // Process in batches to handle rate limits
    for (let i = 0; i < tweetsToDelete.length; i += batchSize) {
      const batch = tweetsToDelete.slice(i, i + batchSize);
      const batchIds = batch.map(t => t.id);

      try {
        setState(prev => ({
          ...prev,
          message: `Deleting batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(tweetsToDelete.length / batchSize)}...`
        }));

        const result = await deleteBatch({ data: { tweet_ids: batchIds } });
        
        deletedCount += result.deleted;
        failedCount += result.failed;

        setState(prev => ({
          ...prev,
          deleted: deletedCount,
          failed: failedCount,
          progress: Math.round(((deletedCount + failedCount) / tweetsToDelete.length) * 100),
        }));

        // Wait between batches to respect rate limits
        if (i + batchSize < tweetsToDelete.length) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      } catch (error) {
        console.error("Batch deletion failed", error);
        failedCount += batchIds.length;
        setState(prev => ({
          ...prev,
          failed: failedCount,
          progress: Math.round(((deletedCount + failedCount) / tweetsToDelete.length) * 100),
        }));
      }
    }

    setState(prev => ({
      ...prev,
      status: "success",
      progress: 100,
      message: "Deletion process complete.",
    }));
  }, [deleteBatch]);

  const reset = useCallback(() => {
    setState({
      status: "idle",
      progress: 0,
      total: 0,
      deleted: 0,
      failed: 0,
      message: "",
    });
  }, []);

  return {
    ...state,
    startDeletion,
    reset,
  };
}
