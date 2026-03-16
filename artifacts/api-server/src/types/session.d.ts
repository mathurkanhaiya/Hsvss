import "express-session";

declare module "express-session" {
  interface SessionData {
    oauth_state?: string;
    code_verifier?: string;
    access_token?: string;
    refresh_token?: string;
    user?: {
      id: string;
      name: string;
      username: string;
      profile_image_url?: string;
      public_metrics?: {
        tweet_count: number;
        followers_count: number;
        following_count: number;
        like_count?: number;
      };
    };
  }
}
