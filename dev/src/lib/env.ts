import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  GITLAB_URL: z.string().url().optional(),
  GITLAB_TOKEN: z.string().optional(),
  GITLAB_PROJECT_ID: z.string().optional(),
  GOOGLE_CHAT_WEBHOOK_URL: z.string().url().optional(),
  CDK8S_REPO_PATH: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function getEnv(): Env {
  return envSchema.parse(process.env);
}
