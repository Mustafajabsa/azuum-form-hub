import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fileService,
  folderService,
  uploadService,
  FileItem,
  Folder,
} from "@/api/services/storageService";

// ===== FILE HOOKS =====

export const useFiles = (page = 1, pageSize = 20) => {
  return useQuery({
    queryKey: ["files", page, pageSize],
    queryFn: () => fileService.getFiles(page, pageSize),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useFile = (id: string) => {
  return useQuery({
    queryKey: ["file", id],
    queryFn: () => fileService.getFile(id),
    enabled: !!id,
  });
};

export const useDownloadFile = () => {
  return useMutation({
    mutationFn: (id: string) => fileService.downloadFile(id),
  });
};

export const useMoveFile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, folderId }: { id: string; folderId: string | null }) =>
      fileService.moveFile(id, folderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
      queryClient.invalidateQueries({ queryKey: ["folders"] });
    },
  });
};

export const useDeleteFile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fileService.deleteFile(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
    },
  });
};

export const useBatchDeleteFiles = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => fileService.batchDeleteFiles(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
    },
  });
};

export const useShareFile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      email,
      canEdit,
      canDownload,
    }: {
      id: string;
      email: string;
      canEdit?: boolean;
      canDownload?: boolean;
    }) => fileService.shareFile(id, email, canEdit, canDownload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shares"] });
    },
  });
};

// ===== FOLDER HOOKS =====

export const useFolders = (page = 1, pageSize = 20) => {
  return useQuery({
    queryKey: ["folders", page, pageSize],
    queryFn: () => folderService.getFolders(page, pageSize),
    staleTime: 5 * 60 * 1000,
  });
};

export const useFolder = (id: string) => {
  return useQuery({
    queryKey: ["folder", id],
    queryFn: () => folderService.getFolder(id),
    enabled: !!id,
  });
};

export const useCreateFolder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      name,
      description,
      parentId,
    }: {
      name: string;
      description?: string;
      parentId?: string;
    }) => folderService.createFolder(name, description, parentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders"] });
    },
  });
};

export const useMoveFolder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, parentId }: { id: string; parentId: string | null }) =>
      folderService.moveFolder(id, parentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders"] });
    },
  });
};

export const useDeleteFolder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => folderService.deleteFolder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders"] });
    },
  });
};

export const useBatchDeleteFolders = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => folderService.batchDeleteFolders(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders"] });
    },
  });
};

// ===== UPLOAD HOOK =====

export const useUploadFiles = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      files,
      relativePaths,
      folderId,
    }: {
      files: globalThis.File[];
      relativePaths: string[];
      folderId?: string;
    }) => uploadService.uploadFiles(files, relativePaths, folderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
      queryClient.invalidateQueries({ queryKey: ["folders"] });
    },
  });
};
