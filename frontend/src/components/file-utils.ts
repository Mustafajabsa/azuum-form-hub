export type FileKind =
  | "folder"
  | "image"
  | "doc"
  | "code"
  | "video"
  | "audio"
  | "archive"
  | "pdf"
  | "other";

export interface FileNode {
  id: string;
  name: string;
  kind: FileKind;
  size?: number; // bytes
  modified: string; // ISO date
  children?: FileNode[];
  parentId?: string;
}

export const formatBytes = (bytes?: number): string => {
  if (bytes === undefined) return "—";
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

export const formatDate = (iso: string): string => {
  const date = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export const getFileKind = (
  fileName: string,
  isFolder: boolean = false,
): FileKind => {
  if (isFolder) return "folder";

  const ext = fileName.split(".").pop()?.toLowerCase();

  if (!ext) return "other";

  const imageExts = ["jpg", "jpeg", "png", "gif", "bmp", "svg", "webp", "heic"];
  const docExts = ["doc", "docx", "txt", "md", "rtf"];
  const pdfExts = ["pdf"];
  const codeExts = [
    "js",
    "jsx",
    "ts",
    "tsx",
    "html",
    "css",
    "py",
    "java",
    "cpp",
    "c",
    "go",
    "rs",
  ];
  const videoExts = ["mp4", "avi", "mov", "wmv", "flv", "webm", "mkv"];
  const audioExts = ["mp3", "wav", "flac", "aac", "ogg", "wma"];
  const archiveExts = ["zip", "rar", "7z", "tar", "gz", "bz2"];

  if (imageExts.includes(ext)) return "image";
  if (pdfExts.includes(ext)) return "pdf";
  if (docExts.includes(ext)) return "doc";
  if (codeExts.includes(ext)) return "code";
  if (videoExts.includes(ext)) return "video";
  if (audioExts.includes(ext)) return "audio";
  if (archiveExts.includes(ext)) return "archive";

  return "other";
};
