// Mock API client for standalone frontend
interface MockResponse {
  data: any;
  status?: number;
  headers?: any;
}

interface UploadResponse {
  mode: "flat" | "folder_tree";
  files_created: number;
  folders_created: number;
  root_folder_id: string | null;
  message: string;
}

const client = {
  get: async (url: string, config?: any): Promise<MockResponse> => {
    console.log(`Mock GET: ${url}`, config);
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 300));
    return { data: getMockData(url, "GET"), status: 200 };
  },
  post: async (
    url: string,
    data?: any,
    config?: any,
  ): Promise<MockResponse | { data: UploadResponse; status: number }> => {
    console.log(`Mock POST: ${url}`, data, config);
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Handle upload endpoint specifically
    if (url.includes("/upload")) {
      return {
        data: {
          mode: "flat",
          files_created: data?.files?.length || 1,
          folders_created: 0,
          root_folder_id: data?.folderId || null,
          message: "Files uploaded successfully",
        } as UploadResponse,
        status: 201,
      };
    }

    return { data: getMockData(url, "POST", data), status: 201 };
  },
  put: async (url: string, data?: any, config?: any): Promise<MockResponse> => {
    console.log(`Mock PUT: ${url}`, data, config);
    await new Promise((resolve) => setTimeout(resolve, 300));
    return { data: getMockData(url, "PUT", data), status: 200 };
  },
  delete: async (url: string, config?: any): Promise<MockResponse> => {
    console.log(`Mock DELETE: ${url}`, config);
    await new Promise((resolve) => setTimeout(resolve, 300));
    return { data: getMockData(url, "DELETE"), status: 204 };
  },
};

// Mock data generator
function getMockData(url: string, method: string, data?: any) {
  // Extract endpoint from URL
  const endpoint = url.split("/").pop() || url;

  // Handle upload endpoint specifically
  if (endpoint === "upload" && method === "POST") {
    return {
      mode: "flat",
      files_created: data?.files?.length || 1,
      folders_created: 0,
      root_folder_id: data?.folderId || null,
      message: "Files uploaded successfully",
    };
  }

  // Mock responses based on endpoint
  switch (endpoint) {
    case "token":
    case "token/refresh/":
      return {
        access: "mock-access-token",
        refresh: "mock-refresh-token",
        user: { email: "user@example.com", role: "user" },
      };

    case "files":
      return {
        results: [
          {
            id: "1",
            name: "Sample Document.pdf",
            original_name: "Sample Document.pdf",
            file_size: 1024000,
            mime_type: "application/pdf",
            folder_id: null,
            owner: "user@example.com",
            uploaded_at: "2024-01-15T10:30:00Z",
            is_deleted: false,
          },
          {
            id: "2",
            name: "Project Files.zip",
            original_name: "Project Files.zip",
            file_size: 5120000,
            mime_type: "application/zip",
            folder_id: "1",
            owner: "user@example.com",
            uploaded_at: "2024-01-14T15:45:00Z",
            is_deleted: false,
          },
        ],
        count: 2,
        next: null,
        previous: null,
      };

    case "folders":
      return {
        results: [
          {
            id: "1",
            name: "Documents",
            description: "My documents folder",
            parent_id: null,
            owner: "user@example.com",
            created_at: "2024-01-10T09:00:00Z",
            updated_at: "2024-01-15T14:30:00Z",
            is_deleted: false,
          },
        ],
        count: 1,
        next: null,
        previous: null,
      };

      // Handle folder creation
      if (url.includes("/folders/") && method === "POST") {
        return {
          results: [
            {
              id: "new-folder-id",
              name: data?.name || "New Folder",
              description: data?.description || "",
              parent_id: data?.parentId || null,
              owner: "user@example.com",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              is_deleted: false,
            },
          ],
          count: 1,
          next: null,
          previous: null,
        };
      }

      // Handle file deletion
      if (url.includes("/files/") && method === "DELETE") {
        return { success: true, message: "File deleted successfully" };
      }

      // Handle batch file deletion
      if (url.includes("batch_delete") && method === "DELETE") {
        return { success: true, message: "Files deleted successfully" };
      }

    default:
      return {
        success: true,
        message: "Mock operation completed",
        mode: "flat",
        files_created: 1,
        folders_created: 0,
        root_folder_id: null,
      };
  }
}

export default client;
