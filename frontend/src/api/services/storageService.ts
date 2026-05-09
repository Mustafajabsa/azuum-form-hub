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
  getFiles: (
    page = 1,
    pageSize = 20,
    folder?: string,
    query?: string,
    sortBy?: string,
    order?: string,
  ) =>
    client.get("/files/", {
      params: {
        page,
        page_size: pageSize,
        ...(folder && { directory: folder }),
        ...(query && { query }),
        ...(sortBy && { sort_by: sortBy }),
        ...(order && { order }),
      },
    }),

  // Get single file
  getFile: (id: string) => client.get(`/fileinfo/${id}/`),

  // Get detailed file/folder information by path
  getFileDetails: (path: string) => {
    // Replace %slash% with / to locate the file properly
    const decodedPath = path.replace(/%slash%/g, "/");
    const encodedPath = encodeURIComponent(decodedPath);
    return client.get(`/files/info/?path=${encodedPath}`);
  },

  // Get storage statistics
  getStorageStats: () => {
    console.log("Trying storage stats endpoint...");
    // Try multiple possible endpoints
    return client.get("/files/stats/").catch(async (error) => {
      console.log("First endpoint failed, trying alternative...");
      try {
        return await client.get("/stats/");
      } catch (error2) {
        console.log(
          "Second endpoint failed, using files endpoint for stats...",
        );
        // Fall back to using files endpoint to calculate stats
        const filesResponse = await client.get("/files/", {
          params: { page: 1, page_size: 10000 },
        });
        return filesResponse;
      }
    });
  },

  // Delete file by ID
  deleteFileById: (id: string) => client.delete(`/fileinfo/${id}/`),

  // Download file
  downloadFile: (file_path: string) => {
    // Replace %slash% with / to locate the file properly
    const decodedPath = file_path.replace(/%slash%/g, "/");
    return client.get(`/files/download/${encodeURIComponent(decodedPath)}/`, {
      responseType: "blob",
    });
  },

  // Upload file
  uploadFile: (
    file: File,
    folderPath?: string,
    onUploadProgress?: (progress: number) => void,
  ) => {
    const formData = new FormData();
    formData.append("file", file);
    if (folderPath) {
      formData.append("directory", folderPath);
    }
    return client.post("/files/", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onUploadProgress) {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total,
          );
          onUploadProgress(progress);
        }
      },
    });
  },

  // Upload file to specific directory
  uploadFileToDirectory: (
    file: File,
    directoryPath: string,
    onUploadProgress?: (progress: number) => void,
  ) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("directory", directoryPath);
    return client.post("/files/", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onUploadProgress) {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total,
          );
          onUploadProgress(progress);
        }
      },
    });
  },

  // Move file (for cut & paste)
  moveFile: (source_path: string, destination_path: string) =>
    client.patch("/files/move/", {
      source_path,
      destination_path,
    }),

  // Copy file
  copyFile: (source_path: string, destination_path: string) =>
    client.post("/files/copy/", {
      source_path,
      destination_path,
    }),

  // Rename file
  renameFile: (path: string, new_name: string) =>
    client.patch("/files/rename/", {
      path,
      new_name,
    }),

  // Delete single file
  deleteFile: (file_path: string) => {
    // Replace %slash% with / to locate the file properly
    const decodedPath = file_path.replace(/%slash%/g, "/");
    return client.delete(`/files/delete/${encodeURIComponent(decodedPath)}/`);
  },

  // Batch delete files and folders
  batchDeleteFiles: (paths: string[]) => {
    // Replace %slash% with / in all paths to locate files properly
    const decodedPaths = paths.map((path) => path.replace(/%slash%/g, "/"));
    return client.delete("/files/bulk-delete/", {
      data: { paths: decodedPaths },
    });
  },

  // Bulk download files
  bulkDownloadFiles: (paths: string[], zip_name?: string) => {
    // Replace %slash% with / in all paths to locate files properly
    const decodedPaths = paths.map((path) => path.replace(/%slash%/g, "/"));
    return client.post(
      "/files/bulk-download/",
      {
        paths: decodedPaths,
        ...(zip_name && { zip_name }),
      },
      {
        responseType: "blob",
        timeout: 60000, // Increase timeout to 60 seconds for bulk downloads
      },
    );
  },

  // Mixed download files and folders
  mixedDownloadFiles: (paths: string[], zip_name?: string) => {
    // Replace %slash% with / in all paths to locate files properly
    const decodedPaths = paths.map((path) => path.replace(/%slash%/g, "/"));
    return client.post(
      "/files/mixed-download/",
      {
        paths: decodedPaths,
        ...(zip_name && { zip_name }),
      },
      {
        responseType: "blob",
        timeout: 60000, // Increase timeout to 60 seconds for mixed downloads
      },
    );
  },

  // Mixed move files and folders
  mixedMoveFiles: (paths: string[], destination: string) => {
    // Replace %slash% with / in all paths to locate files properly
    const decodedPaths = paths.map((path) => path.replace(/%slash%/g, "/"));
    const decodedDestination = destination.replace(/%slash%/g, "/");
    return client.patch("/files/mixed-move/", {
      paths: decodedPaths,
      destination: decodedDestination,
    });
  },

  // Compress files and folders to zip on server
  compressFiles: (paths: string[], zipName?: string, destination?: string) => {
    // Replace %slash% with / in all paths to locate files properly
    const decodedPaths = paths.map((path) => path.replace(/%slash%/g, "/"));
    const decodedDestination = destination
      ? destination.replace(/%slash%/g, "/")
      : "";
    return client.post("/files/compress/", {
      paths: decodedPaths,
      ...(zipName && { zip_name: zipName }),
      ...(decodedDestination && { destination: decodedDestination }),
    });
  },

  // Share file
  shareFile: (
    file_path: string,
    expires_in?: number,
    max_access?: number,
    is_viewable?: boolean,
  ) => {
    // Replace %slash% with / to locate the file properly
    const decodedPath = file_path.replace(/%slash%/g, "/");
    return client.post("/files/share/", {
      file_path: decodedPath,
      ...(expires_in && { expires_in }),
      ...(max_access && { max_access }),
      ...(is_viewable !== undefined && { is_viewable }),
    });
  },

  // Mixed share multiple files and folders
  mixedShare: (
    paths: string[],
    expires_in?: number,
    max_access?: number,
    is_viewable?: boolean,
  ) => {
    return client.post("/files/mixed-share/", {
      paths,
      ...(expires_in && { expires_in }),
      ...(max_access && { max_access }),
      ...(is_viewable !== undefined && { is_viewable }),
    });
  },

  // Delete folder by ID
  deleteFolderById: (id: string) => client.delete(`/folders/delete/${id}/`),

  // Revoke share
  revokeShare: (token: string) => client.patch(`/files/share/${token}/revoke/`),

  // Get shared item by token
  getSharedItem: (token: string) => client.get(`/files/share/${token}/`),

  // Get multiple shared items by tokens
  getSharedItems: (tokens: string[]) => {
    const tokenParams = tokens.map((token) => `token=${token}`).join("&");
    return client.get(`/files/share/bulk/?${tokenParams}`);
  },

  // Download shared file by token
  downloadSharedFile: (token: string) => {
    return client.get(`/files/shared/${token}/`, {
      responseType: "blob",
    });
  },

  // View shared file inline by token
  viewSharedFile: (token: string) => {
    return client.get(`/files/shared/${token}/`);
  },

  // View file inline
  viewFile: (file_path: string) => {
    // Replace %slash% with / to locate the file properly
    const decodedPath = file_path.replace(/%slash%/g, "/");
    return client.get(`/files/view/${encodeURIComponent(decodedPath)}/`);
  },
};

// ===== FOLDER SERVICE =====

export const folderService = {
  // Get all folders (included in files endpoint)
  getFolders: () =>
    client.get("/files/").then((res) => ({
      data: res.data.data?.filter((item: any) => item.mime_type === null) || [],
    })),

  // Get single folder (using files endpoint)
  getFolder: (id: string) =>
    client.get(`/files/`).then((res) => ({
      data:
        res.data.data?.filter(
          (item: any) => item.id === id && item.mime_type === null,
        ) || null,
    })),

  // Create folder
  createFolder: (data: {
    name: string;
    description?: string;
    parentId?: string;
  }) => {
    const { name, description = "", parentId } = data;
    const payload: any = {
      folder_name: name,
      description,
      directory: parentId && parentId !== "root" ? parentId : "",
    };
    return client.post("/folders/create/", payload);
  },

  // Delete folder by ID
  deleteFolderById: (id: string) => client.delete(`/folders/delete/${id}/`),

  // Upload multiple files with folder structure
  uploadFolderStructure: (
    files: File[],
    relativePaths: string[],
    directory?: string,
  ) => {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    relativePaths.forEach((path) => formData.append("relative_paths", path));

    // Add directory parameter if provided
    if (directory) {
      formData.append("directory", directory);
    }

    return client.post("/folders/upload/", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },
};

// ===== SEARCH SERVICE =====

export const searchService = {
  // Search files and folders
  search: (query: string, folderId?: string) =>
    client.get("/search/", {
      params: {
        q: query,
        ...(folderId && { folder_id: folderId }),
      },
    }),

  // Get recent files
  getRecentFiles: (limit = 10) =>
    client.get("/files/recent/", {
      params: { limit },
    }),
};

// ===== TRASH SERVICE =====

export const trashService = {
  // Get trash contents
  getTrash: () => client.get("/trash/"),

  // Move items to trash
  moveToTrash: (itemIds: string[], itemType: "file" | "folder") =>
    client.post("/trash/move/", {
      item_ids: itemIds,
      item_type: itemType,
    }),

  // Restore items from trash
  restoreFromTrash: (itemIds: string[], itemType: "file" | "folder") =>
    client.post("/trash/restore/", {
      item_ids: itemIds,
      item_type: itemType,
    }),

  // Empty trash permanently
  emptyTrash: () => client.delete("/trash/empty/"),

  // Delete items permanently from trash
  deletePermanently: (itemIds: string[], itemType: "file" | "folder") =>
    client.delete("/trash/delete/", {
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

    const response = client.post("/upload/", formData, {
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
