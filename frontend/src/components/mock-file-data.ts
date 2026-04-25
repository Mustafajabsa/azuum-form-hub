import { FileNode } from "./file-utils";

const d = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
};

export const mockFileTree: FileNode = {
  id: "root",
  name: "Home",
  kind: "folder",
  modified: d(0),
  children: [
    {
      id: "documents",
      name: "Documents",
      kind: "folder",
      modified: d(2),
      children: [
        { id: "doc-1", name: "Q4 Financial Report.pdf", kind: "pdf", size: 2_400_000, modified: d(1) },
        { id: "doc-2", name: "Project Proposal.docx", kind: "doc", size: 184_000, modified: d(3) },
        { id: "doc-3", name: "Meeting Notes.md", kind: "doc", size: 12_400, modified: d(5) },
        {
          id: "contracts",
          name: "Contracts",
          kind: "folder",
          modified: d(10),
          children: [
            { id: "c-1", name: "Acme Inc. Agreement.pdf", kind: "pdf", size: 890_000, modified: d(12) },
            { id: "c-2", name: "NDA Template.docx", kind: "doc", size: 56_000, modified: d(20) },
          ],
        },
      ],
    },
    {
      id: "pictures",
      name: "Pictures",
      kind: "folder",
      modified: d(1),
      children: [
        { id: "p-1", name: "sunset-beach.jpg", kind: "image", size: 4_200_000, modified: d(1) },
        { id: "p-2", name: "mountain-view.png", kind: "image", size: 6_800_000, modified: d(4) },
        { id: "p-3", name: "city-lights.jpg", kind: "image", size: 3_100_000, modified: d(7) },
        { id: "p-4", name: "forest-path.jpg", kind: "image", size: 2_900_000, modified: d(8) },
        { id: "p-5", name: "portrait.heic", kind: "image", size: 1_800_000, modified: d(15) },
        { id: "p-6", name: "screenshot.png", kind: "image", size: 540_000, modified: d(0) },
      ],
    },
    {
      id: "music",
      name: "Music",
      kind: "folder",
      modified: d(6),
      children: [
        { id: "m-1", name: "Midnight City.mp3", kind: "audio", size: 8_400_000, modified: d(30) },
        { id: "m-2", name: "Ocean Waves.flac", kind: "audio", size: 28_000_000, modified: d(45) },
        { id: "m-3", name: "Acoustic Sessions.wav", kind: "audio", size: 56_000_000, modified: d(60) },
      ],
    },
    {
      id: "videos",
      name: "Videos",
      kind: "folder",
      modified: d(11),
      children: [
        { id: "v-1", name: "Vacation Recap.mp4", kind: "video", size: 1_200_000_000, modified: d(11) },
        { id: "v-2", name: "Tutorial.mov", kind: "video", size: 480_000_000, modified: d(22) },
      ],
    },
    {
      id: "projects",
      name: "Projects",
      kind: "folder",
      modified: d(0),
      children: [
        {
          id: "lovable-app",
          name: "lovable-app",
          kind: "folder",
          modified: d(0),
          children: [
            { id: "src-folder", name: "src", kind: "folder", modified: d(0), children: [
              { id: "src-1", name: "App.tsx", kind: "code", size: 4_200, modified: d(0) },
              { id: "src-2", name: "main.ts", kind: "code", size: 1_100, modified: d(0) },
              { id: "src-3", name: "styles.css", kind: "code", size: 8_900, modified: d(0) },
            ]},
            { id: "pkg", name: "package.json", kind: "code", size: 2_400, modified: d(0) },
            { id: "readme", name: "README.md", kind: "doc", size: 5_600, modified: d(2) },
            { id: "lockfile", name: "bun.lockb", kind: "other", size: 240_000, modified: d(0) },
          ],
        },
        { id: "design-sys", name: "design-system.fig", kind: "other", size: 12_000_000, modified: d(4) },
      ],
    },
    {
      id: "downloads",
      name: "Downloads",
      kind: "folder",
      modified: d(0),
      children: [
        { id: "dl-1", name: "node-v20.tar.gz", kind: "archive", size: 32_000_000, modified: d(2) },
        { id: "dl-2", name: "installer.dmg", kind: "archive", size: 156_000_000, modified: d(0) },
        { id: "dl-3", name: "wallpapers.zip", kind: "archive", size: 84_000_000, modified: d(9) },
      ],
    },
    { id: "todo", name: "TODO.txt", kind: "doc", size: 820, modified: d(0) },
    { id: "resume", name: "Resume.pdf", kind: "pdf", size: 320_000, modified: d(14) },
  ],
};

// Helper functions to get mock data
const nodeMap = new Map<string, FileNode>();
const assignParents = (node: FileNode, parentId?: string) => {
  node.parentId = parentId;
  nodeMap.set(node.id, node);
  node.children?.forEach((c) => assignParents(c, node.id));
};
assignParents(mockFileTree);

export const getMockNode = (id: string) => nodeMap.get(id);

export const getMockPath = (id: string): FileNode[] => {
  const path: FileNode[] = [];
  let cur = nodeMap.get(id);
  while (cur) {
    path.unshift(cur);
    cur = cur.parentId ? nodeMap.get(cur.parentId) : undefined;
  }
  return path;
};

export const getMockChildren = (parentId?: string): FileNode[] => {
  if (!parentId) {
    return mockFileTree.children || [];
  }
  const node = nodeMap.get(parentId);
  return node?.children || [];
};

export const getMockFolders = (): FileNode[] => {
  const folders: FileNode[] = [];
  const collectFolders = (node: FileNode) => {
    if (node.kind === "folder") {
      folders.push(node);
    }
    node.children?.forEach(collectFolders);
  };
  collectFolders(mockFileTree);
  return folders;
};
