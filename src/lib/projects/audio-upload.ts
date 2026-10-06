export type AudioContainer =
  | "mp3"
  | "wav"
  | "flac"
  | "ogg"
  | "aiff"
  | "m4a"
  | "aac";

const contentTypes: Record<AudioContainer, string> = {
  mp3: "audio/mpeg",
  wav: "audio/wav",
  flac: "audio/flac",
  ogg: "audio/ogg",
  aiff: "audio/aiff",
  m4a: "audio/mp4",
  aac: "audio/aac"
};

function ascii(bytes: Uint8Array, start: number, length: number): string {
  return String.fromCharCode(...bytes.slice(start, start + length));
}

export function detectAudioContainer(
  bytes: Uint8Array
): AudioContainer | null {
  if (bytes.byteLength < 4) return null;

  if (ascii(bytes, 0, 3) === "ID3") return "mp3";
  if (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) return "mp3";

  if (
    bytes.byteLength >= 12 &&
    (ascii(bytes, 0, 4) === "RIFF" || ascii(bytes, 0, 4) === "RF64") &&
    ascii(bytes, 8, 4) === "WAVE"
  ) {
    return "wav";
  }

  if (ascii(bytes, 0, 4) === "fLaC") return "flac";
  if (ascii(bytes, 0, 4) === "OggS") return "ogg";

  if (
    bytes.byteLength >= 12 &&
    ascii(bytes, 0, 4) === "FORM" &&
    ["AIFF", "AIFC"].includes(ascii(bytes, 8, 4))
  ) {
    return "aiff";
  }

  if (bytes.byteLength >= 12 && ascii(bytes, 4, 4) === "ftyp") {
    return "m4a";
  }

  if (bytes[0] === 0xff && (bytes[1] & 0xf6) === 0xf0) {
    return "aac";
  }

  return null;
}

export interface ValidatedAudioUpload {
  container: AudioContainer;
  contentType: string;
  extension: string;
}

export function validateAudioBytes(
  bytes: Uint8Array,
  maxBytes: number
): ValidatedAudioUpload {
  if (bytes.byteLength === 0) {
    throw new Error("The audio file is empty.");
  }

  if (bytes.byteLength > maxBytes) {
    throw new Error(
      `The audio file exceeds the maximum upload size of ${maxBytes} bytes.`
    );
  }

  const container = detectAudioContainer(bytes);
  if (!container) {
    throw new Error(
      "Unsupported audio file. Upload MP3, WAV, FLAC, OGG/Opus, AIFF, M4A, or AAC."
    );
  }

  return {
    container,
    contentType: contentTypes[container],
    extension: container
  };
}
