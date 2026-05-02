import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fileService,
  folderService,
  uploadService,
  FileItem,
  Folder,
} from "@/api/services/storageService";
import client from "@/api/client";

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
    }) => folderService.createFolder({ name, description, parentId }),
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
      queryClient.invalidateQueries({ queryKey: ["folderContents"] });
    },
  });
};

// ===== TRASH HOOKS =====

export const useMoveToTrash = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemIds: string[]) =>
      client.post("/storage/trash/move-to-trash/", { item_ids: itemIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
      queryClient.invalidateQueries({ queryKey: ["folders"] });
      queryClient.invalidateQueries({ queryKey: ["folderContents"] });
      queryClient.invalidateQueries({ queryKey: ["trash"] });
    },
  });
};

export const useTrashContents = () => {
  return useQuery({
    queryKey: ["trash"],
    queryFn: () => client.get("/storage/trash/"),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useEmptyTrash = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => client.delete("/storage/trash/"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trash"] });
    },
  });
};

export const useRestoreFromTrash = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemIds: string[]) =>
      client.post("/storage/trash/restore/", { item_ids: itemIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trash"] });
      queryClient.invalidateQueries({ queryKey: ["files"] });
      queryClient.invalidateQueries({ queryKey: ["folders"] });
      queryClient.invalidateQueries({ queryKey: ["folderContents"] });
    },
  });
};

// ===== FOLDER CONTENTS HOOK =====

export const useFolderContents = (folderId: string = "root") => {
  return useQuery({
    queryKey: ["folderContents", folderId],
    queryFn: () => client.get(`/storage/folders/${folderId}/contents/`),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!folderId,
  });
};

// ===== SEARCH HOOK =====

export const useSearchItems = (query: string, folderId?: string) => {
  return useQuery({
    queryKey: ["search", query, folderId],
    queryFn: () => {
      const params = new URLSearchParams({ q: query });
      if (folderId) params.append("folder_id", folderId);
      return client.get(`/storage/search/?${params}`);
    },
    enabled: !!query && query.length > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};
