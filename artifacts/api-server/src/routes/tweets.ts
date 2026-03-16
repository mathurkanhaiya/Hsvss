import { Router, type IRouter, type Request, type Response } from "express";
import axios from "axios";

const router: IRouter = Router();

const X_API_BASE = "https://api.twitter.com/2";
const RATE_LIMIT_DELAY_MS = 500;

function requireAuth(req: Request, res: Response): string | null {
  const token = (req.session as any).access_token;
  if (!token) {
    res.status(401).json({ error: "unauthorized", message: "Not authenticated. Please login first." });
    return null;
  }
  return token;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

router.get("/list", async (req: Request, res: Response) => {
  const token = requireAuth(req, res);
  if (!token) return;

  const user = (req.session as any).user;
  const { pagination_token } = req.query as { pagination_token?: string };

  try {
    const params: Record<string, string> = {
      max_results: "100",
      "tweet.fields": "created_at,public_metrics",
    };
    if (pagination_token) {
      params["pagination_token"] = pagination_token;
    }

    const response = await axios.get(`${X_API_BASE}/users/${user.id}/tweets`, {
      headers: { Authorization: `Bearer ${token}` },
      params,
    });

    const tweets = response.data.data || [];
    const next_token = response.data.meta?.next_token || null;
    const total_fetched = tweets.length;

    res.json({ tweets, next_token, total_fetched });
  } catch (err: any) {
    console.error("Fetch tweets error:", err?.response?.data || err.message);
    const status = err?.response?.status || 500;
    res.status(status).json({ error: "fetch_failed", message: err?.response?.data?.detail || "Failed to fetch tweets" });
  }
});

async function deleteTweetWithRetry(token: string, tweetId: string, retries = 3): Promise<boolean> {
  for (let i = 0; i < retries; i++) {
    try {
      await axios.delete(`${X_API_BASE}/tweets/${tweetId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return true;
    } catch (err: any) {
      if (err?.response?.status === 429) {
        const retryAfter = parseInt(err.response.headers["x-rate-limit-reset"] || "60") * 1000 - Date.now();
        const waitMs = Math.max(retryAfter, 15000);
        console.log(`Rate limited. Waiting ${waitMs}ms...`);
        await sleep(waitMs);
      } else if (err?.response?.status === 404) {
        return true;
      } else {
        console.error(`Failed to delete tweet ${tweetId}:`, err?.response?.data || err.message);
        return false;
      }
    }
  }
  return false;
}

router.post("/delete", async (req: Request, res: Response) => {
  const token = requireAuth(req, res);
  if (!token) return;

  const { tweet_ids } = req.body as { tweet_ids: string[] };

  if (!tweet_ids || !Array.isArray(tweet_ids) || tweet_ids.length === 0) {
    res.status(400).json({ error: "invalid_request", message: "tweet_ids array is required" });
    return;
  }

  let deleted = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const id of tweet_ids) {
    const success = await deleteTweetWithRetry(token, id);
    if (success) {
      deleted++;
    } else {
      failed++;
      errors.push(id);
    }
    await sleep(RATE_LIMIT_DELAY_MS);
  }

  res.json({ deleted, failed, total: tweet_ids.length, errors });
});

router.post("/delete-all", async (req: Request, res: Response) => {
  const token = requireAuth(req, res);
  if (!token) return;

  const user = (req.session as any).user;
  const { older_than_days, keywords, include_retweets } = req.body as {
    older_than_days?: number;
    keywords?: string[];
    include_retweets?: boolean;
  };

  let deleted = 0;
  let failed = 0;
  const errors: string[] = [];
  let next_token: string | undefined;

  const cutoffDate = older_than_days ? new Date(Date.now() - older_than_days * 24 * 60 * 60 * 1000) : null;

  do {
    try {
      const params: Record<string, string> = {
        max_results: "100",
        "tweet.fields": "created_at,referenced_tweets",
      };
      if (next_token) {
        params["pagination_token"] = next_token;
      }

      const response = await axios.get(`${X_API_BASE}/users/${user.id}/tweets`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });

      const tweets = response.data.data || [];
      next_token = response.data.meta?.next_token;

      for (const tweet of tweets) {
        let shouldDelete = true;

        if (cutoffDate && new Date(tweet.created_at) > cutoffDate) {
          shouldDelete = false;
        }

        if (keywords && keywords.length > 0) {
          const tweetText = tweet.text.toLowerCase();
          const hasKeyword = keywords.some((kw: string) => tweetText.includes(kw.toLowerCase()));
          if (!hasKeyword) {
            shouldDelete = false;
          }
        }

        const isRetweet = tweet.referenced_tweets?.some((ref: any) => ref.type === "retweeted");
        if (!include_retweets && isRetweet && !keywords && !cutoffDate) {
          shouldDelete = false;
        }

        if (shouldDelete) {
          const success = await deleteTweetWithRetry(token, tweet.id);
          if (success) {
            deleted++;
          } else {
            failed++;
            errors.push(tweet.id);
          }
          await sleep(RATE_LIMIT_DELAY_MS);
        }
      }

      if (tweets.length === 0) break;

    } catch (err: any) {
      if (err?.response?.status === 429) {
        const waitMs = 15000;
        console.log(`Rate limited during fetch. Waiting ${waitMs}ms...`);
        await sleep(waitMs);
      } else {
        console.error("Error during delete-all:", err?.response?.data || err.message);
        break;
      }
    }
  } while (next_token);

  res.json({ deleted, failed, total: deleted + failed, errors });
});

router.post("/delete-likes", async (req: Request, res: Response) => {
  const token = requireAuth(req, res);
  if (!token) return;

  const user = (req.session as any).user;
  let deleted = 0;
  let failed = 0;
  const errors: string[] = [];
  let next_token: string | undefined;

  do {
    try {
      const params: Record<string, string> = { max_results: "100" };
      if (next_token) params["pagination_token"] = next_token;

      const response = await axios.get(`${X_API_BASE}/users/${user.id}/liked_tweets`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });

      const tweets = response.data.data || [];
      next_token = response.data.meta?.next_token;

      for (const tweet of tweets) {
        try {
          await axios.delete(`${X_API_BASE}/users/${user.id}/likes/${tweet.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          deleted++;
        } catch {
          failed++;
          errors.push(tweet.id);
        }
        await sleep(RATE_LIMIT_DELAY_MS);
      }

      if (tweets.length === 0) break;
    } catch (err: any) {
      if (err?.response?.status === 429) {
        await sleep(15000);
      } else {
        break;
      }
    }
  } while (next_token);

  res.json({ deleted, failed, total: deleted + failed, errors });
});

export default router;
