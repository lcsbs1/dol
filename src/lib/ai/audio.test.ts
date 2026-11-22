import { describe, expect, it } from "vitest";
import { normalizeAudioMimeType } from "./audio";

describe("normalizeAudioMimeType", () => {
  it("normalizes Safari iOS audio/mp4 with codecs to audio/m4a", () => {
    expect(normalizeAudioMimeType("audio/mp4;codecs=mp4a.40.2")).toBe("audio/m4a");
    expect(normalizeAudioMimeType("audio/mp4")).toBe("audio/m4a");
  });

  it("normalizes Chrome audio/webm;codecs=opus to audio/webm", () => {
    expect(normalizeAudioMimeType("audio/webm;codecs=opus")).toBe("audio/webm");
  });

  it("rejects unsupported mime types", () => {
    expect(normalizeAudioMimeType("video/mp4")).toBeNull();
    expect(normalizeAudioMimeType("application/octet-stream")).toBeNull();
  });
});
