export type ChangeType = "CREATE" | "UPDATE" | "DELETE";

export type MergeRequestStatus = "PENDING" | "OPEN" | "MERGED" | "CLOSED";

export type ModelType =
  | "LLM"
  | "VLM"
  | "ASR"
  | "TTS"
  | "Retriever"
  | "Reranker"
  | "ObjectDetection"
  | "ObjectRecognition"
  | "Face"
  | "Guardian";
