export type ErrorCategory =
  | "user_action_required" | "hardware_unavailable" | "toolchain_failure"
  | "compile_failure" | "flash_failure" | "runtime_failure"
  | "experiment_failure" | "internal_har_failure";

export interface ErrorEnvelope {
  apiVersion: "har/v1";
  kind: "ErrorEnvelope";
  id: string;
  code: string;
  category: ErrorCategory;
  message: string;
  stage: string;
  retryable: boolean;
  evidence: string[];
  suggested_next_action?: string;
  underlying_tool_error?: string;
}

export class HarError extends Error {
  public readonly envelope: ErrorEnvelope;

  public constructor(envelope: ErrorEnvelope, cause?: unknown) {
    super(envelope.message, cause === undefined ? undefined : { cause });
    this.name = "HarError";
    this.envelope = envelope;
  }
}

export function isHarError(error: unknown): error is HarError { return error instanceof HarError; }
