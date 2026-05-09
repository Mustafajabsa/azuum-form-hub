import React, { createContext, useContext, useState, ReactNode } from 'react';
import { fileService } from '@/api/services/storageService';

interface ClipboardItem {
  path: string;
  name: string;
  type: 'file' | 'folder';
}

interface ClipboardContextType {
  clipboardItems: ClipboardItem[];
  clipboardAction: 'copy' | 'cut' | null;
  copyToClipboard: (items: ClipboardItem[]) => void;
  cutToClipboard: (items: ClipboardItem[]) => void;
  pasteFromClipboard: (destinationPath: string) => Promise<void>;
  clearClipboard: () => void;
  hasClipboardContent: boolean;
}

const ClipboardContext = createContext<ClipboardContextType | undefined>(undefined);

export const useClipboard = () => {
  const context = useContext(ClipboardContext);
  if (context === undefined) {
    throw new Error('useClipboard must be used within a ClipboardProvider');
  }
  return context;
};

interface ClipboardProviderProps {
  children: ReactNode;
}

export const ClipboardProvider: React.FC<ClipboardProviderProps> = ({ children }) => {
  const [clipboardItems, setClipboardItems] = useState<ClipboardItem[]>([]);
  const [clipboardAction, setClipboardAction] = useState<'copy' | 'cut' | null>(null);

  const copyToClipboard = (items: ClipboardItem[]) => {
    setClipboardItems(items);
    setClipboardAction('copy');
  };

  const cutToClipboard = (items: ClipboardItem[]) => {
    setClipboardItems(items);
    setClipboardAction('cut');
  };

  const pasteFromClipboard = async (destinationPath: string) => {
    if (clipboardItems.length === 0 || !clipboardAction) {
      return;
    }

    try {
      const promises = clipboardItems.map(async (item) => {
        const destination = destinationPath === 'root' 
          ? item.name 
          : `${destinationPath}/${item.name}`;

        if (clipboardAction === 'copy') {
          return fileService.copyFile(item.path, destination);
        } else if (clipboardAction === 'cut') {
          return fileService.moveFile(item.path, destination);
        }
      });

      await Promise.all(promises);

      // Clear clipboard after successful paste for cut operations
      if (clipboardAction === 'cut') {
        clearClipboard();
      }
    } catch (error) {
      console.error('Paste operation failed:', error);
      throw error;
    }
  };

  const clearClipboard = () => {
    setClipboardItems([]);
    setClipboardAction(null);
  };

  const hasClipboardContent = clipboardItems.length > 0 && clipboardAction !== null;

  const value: ClipboardContextType = {
    clipboardItems,
    clipboardAction,
    copyToClipboard,
    cutToClipboard,
    pasteFromClipboard,
    clearClipboard,
    hasClipboardContent,
  };

  return (
    <ClipboardContext.Provider value={value}>
      {children}
    </ClipboardContext.Provider>
  );
};
