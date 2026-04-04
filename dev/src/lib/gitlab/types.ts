/**
 * GitLab API v4 回應型別
 */

export interface GitLabBranch {
  name: string;
  commit: {
    id: string;
    web_url: string;
  };
  protected: boolean;
  web_url: string;
}

export interface GitLabCommit {
  id: string;
  short_id: string;
  message: string;
  web_url: string;
}

export interface GitLabCommitAction {
  action: "create" | "update" | "delete" | "move" | "chmod";
  file_path: string;
  content?: string;
  encoding?: "text" | "base64";
}

export interface GitLabMergeRequest {
  id: number;
  iid: number;
  web_url: string;
  state: "opened" | "merged" | "closed";
  source_branch: string;
  target_branch: string;
  title: string;
  description: string;
}

export interface GitLabError {
  message: string | Record<string, string[]>;
  error?: string;
}
