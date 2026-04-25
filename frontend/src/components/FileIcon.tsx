import {
  Folder,
  FileText,
  FileImage,
  FileCode,
  FileVideo,
  FileAudio,
  FileArchive,
  File,
  type LucideIcon,
} from "lucide-react";
import type { FileKind } from "./file-utils";

const map: Record<FileKind, { Icon: LucideIcon; colorVar: string }> = {
  folder: { Icon: Folder, colorVar: "var(--folder)" },
  image: { Icon: FileImage, colorVar: "var(--file-image)" },
  doc: { Icon: FileText, colorVar: "var(--file-doc)" },
  pdf: { Icon: FileText, colorVar: "var(--destructive)" },
  code: { Icon: FileCode, colorVar: "var(--file-code)" },
  video: { Icon: FileVideo, colorVar: "var(--file-video)" },
  audio: { Icon: FileAudio, colorVar: "var(--file-audio)" },
  archive: { Icon: FileArchive, colorVar: "var(--file-archive)" },
  other: { Icon: File, colorVar: "var(--muted-foreground)" },
};

interface Props {
  kind: FileKind;
  className?: string;
  size?: number;
  filled?: boolean;
}

export function FileIcon({ kind, className, size = 20, filled }: Props) {
  const { Icon, colorVar } = map[kind];
  return (
    <Icon
      className={className}
      style={{
        color: colorVar,
        fill: filled && kind === "folder" ? colorVar : undefined,
      }}
      size={size}
      strokeWidth={1.75}
    />
  );
}
