import client from "../client";

// ===== TYPESCRIPT INTERFACES =====

export interface FileItem {
  id: string;
  name: string;
  original_name: string;
  file_size: number;
  mime_type: string;
  folder_id: string | null;
  owner: string;
  uploaded_at: string;
  is_deleted: boolean;
}

export interface Folder {
  id: string;
  name: string;
  description?: string;
  parent_id: string | null;
  owner: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

export interface UploadResponse {
  mode: "flat" | "folder_tree";
  files_created: number;
  folders_created: number;
  root_folder_id: string | null;
  message: string;
}

// ===== FILE SERVICE =====

export const fileService = {
  // Get all files
  getFiles: (page = 1, pageSize = 20) =>
    client.get("/storage/files/", {
      params: { page, page_size: pageSize },
    }),

  // Get single file
  getFile: (id: string) => client.get(`/storage/files/${id}/`),

  // Download file
  downloadFile: (id: string) =>
    client.get(`/storage/files/${id}/download/`, {
      responseType: "blob",
    }),

  // Upload file
  uploadFile: (file: File, folderId?: string) => {
    const formData = new FormData();
    formData.append("file", file);
    if (folderId) {
      formData.append("folder_id", folderId);
    }
    return client.post("/storage/upload/", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },

  // Move file to folder
  moveFile: (id: string, folderId: string | null) =>
    client.put(`/storage/files/${id}/`, { folder_id: folderId }),

  // Delete single file
  deleteFile: (id: string) => client.delete(`/storage/files/${id}/`),

  // Batch delete files
  batchDeleteFiles: (fileIds: string[]) =>
    client.delete(`/storage/files/batch_delete/`, {
      data: { file_ids: fileIds },
    }),

  // Share file
  shareFile: (id: string, email: string, canEdit = false, canDownload = true) =>
    client.post(`/storage/files/${id}/share/`, {
      email,
      can_edit: canEdit,
      can_download: canDownload,
    }),
};

// ===== FOLDER SERVICE =====

export const folderService = {
  // Get all folders
  getFolders: (page = 1, pageSize = 20) =>
    client.get("/storage/folders/", {
      params: { page, page_size: pageSize },
    }),

  // Get single folder
  getFolder: (id: string) => client.get(`/storage/folders/${id}/`),

  // Create folder
  createFolder: (data: {
    name: string;
    description?: string;
    parentId?: string;
  }) => {
    const { name, description = "", parentId } = data;
    const payload: any = { name, description };
    if (parentId) payload.parent_id = parentId;
    return client.post("/storage/folders/", payload);
  },

  // Move folder
  moveFolder: (id: string, parentId: string | null) =>
    client.post(`/storage/folders/${id}/move/`, {
      parent_id: parentId,
    }),

  // Delete folder (recursive)
  deleteFolder: (id: string) =>
    client.delete(`/storage/folders/${id}/delete_folder/`),

  // Batch delete folders
  batchDeleteFolders: (folderIds: string[]) =>
    client.delete(`/storage/folders/batch_delete/`, {
      data: { folder_ids: folderIds },
    }),
};

// ===== SEARCH SERVICE =====

export const searchService = {
  // Search files and folders
  search: (query: string, folderId?: string) =>
    client.get("/storage/search/", {
      params: {
        q: query,
        ...(folderId && { folder_id: folderId }),
      },
    }),

  // Get recent files
  getRecentFiles: (limit = 10) =>
    client.get("/storage/files/recent/", {
      params: { limit },
    }),
};

// ===== TRASH SERVICE =====

export const trashService = {
  // Get trash contents
  getTrash: () => client.get("/storage/trash/"),

  // Move items to trash
  moveToTrash: (itemIds: string[], itemType: "file" | "folder") =>
    client.post("/storage/trash/move/", {
      item_ids: itemIds,
      item_type: itemType,
    }),

  // Restore items from trash
  restoreFromTrash: (itemIds: string[], itemType: "file" | "folder") =>
    client.post("/storage/trash/restore/", {
      item_ids: itemIds,
      item_type: itemType,
    }),

  // Empty trash permanently
  emptyTrash: () => client.delete("/storage/trash/empty/"),

  // Delete items permanently from trash
  deletePermanently: (itemIds: string[], itemType: "file" | "folder") =>
    client.delete("/storage/trash/delete/", {
      data: {
        item_ids: itemIds,
        item_type: itemType,
      },
    }),
};

// ===== UPLOAD SERVICE =====

export const uploadService = {
  // Upload files (flat or folder structure)
  uploadFiles: (
    files: globalThis.File[], // ← Use globalThis.File for HTML File type
    relativePaths: string[],
    folderId?: string,
  ): Promise<UploadResponse> => {
    const formData = new FormData();

    // Add files - now properly typed as HTML File objects
    files.forEach((file) => {
      formData.append("files", file);
    });

    // Add paths
    relativePaths.forEach((path) => {
      formData.append("relative_paths", path);
    });

    // Add folder ID if provided
    if (folderId) {
      formData.append("folder_id", folderId);
    }

    const response = client.post("/storage/upload/", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    // Handle the union return type
    return response.then((res) => {
      if ("mode" in res.data) {
        return res.data as UploadResponse;
      } else {
        // Fallback for non-upload responses
        return {
          mode: "flat",
          files_created: files.length,
          folders_created: 0,
          root_folder_id: folderId || null,
          message: "Files uploaded successfully",
        };
      }
    });
  },
};
