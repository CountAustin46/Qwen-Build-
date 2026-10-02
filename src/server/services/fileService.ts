import { store } from '../db/store.ts';
import { ProjectFile, FileTreeNode } from '../../types/index.ts';

export class FileService {
  public listFiles(projectId: string): ProjectFile[] {
    return store.getFiles(projectId);
  }

  public readFile(projectId: string, filePath: string): ProjectFile | undefined {
    return store.getFile(projectId, filePath);
  }

  public writeFile(projectId: string, filePath: string, content: string): ProjectFile {
    return store.saveFile(projectId, filePath, content);
  }

  public editFile(
    projectId: string,
    filePath: string,
    targetContent: string,
    replacementContent: string
  ): { success: boolean; error?: string; file?: ProjectFile } {
    const existing = store.getFile(projectId, filePath);
    if (!existing) {
      return { success: false, error: `File not found: ${filePath}` };
    }

    if (!existing.content.includes(targetContent)) {
      return {
        success: false,
        error: `Target content not found in ${filePath}. Check indentation and exact whitespace.`,
      };
    }

    // Replace the exact first occurrence or all matching
    const updatedContent = existing.content.replace(targetContent, replacementContent);
    const updatedFile = store.saveFile(projectId, filePath, updatedContent);
    return { success: true, file: updatedFile };
  }

  public deleteFile(projectId: string, filePath: string): boolean {
    return store.deleteFile(projectId, filePath);
  }

  public createDirectory(projectId: string, dirPath: string): boolean {
    return store.createDirectory(projectId, dirPath);
  }

  public buildTree(files: ProjectFile[]): FileTreeNode[] {
    const root: FileTreeNode[] = [];

    for (const file of files) {
      const parts = file.path.split('/');
      let currentLevel = root;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isFile = i === parts.length - 1;
        const currentPath = parts.slice(0, i + 1).join('/');

        let existingNode = currentLevel.find(n => n.name === part);

        if (!existingNode) {
          existingNode = {
            name: part,
            path: currentPath,
            type: isFile ? 'file' : 'directory',
            size: isFile ? file.size : undefined,
            children: isFile ? undefined : [],
          };
          currentLevel.push(existingNode);
        }

        if (!isFile && existingNode.children) {
          currentLevel = existingNode.children;
        }
      }
    }

    // Sort: directories first, then alphabetical
    const sortNodes = (nodes: FileTreeNode[]) => {
      nodes.sort((a, b) => {
        if (a.type === b.type) return a.name.localeCompare(b.name);
        return a.type === 'directory' ? -1 : 1;
      });
      for (const node of nodes) {
        if (node.children) sortNodes(node.children);
      }
    };

    sortNodes(root);
    return root;
  }

  public computeDiff(oldText: string, newText: string): string {
    const oldLines = oldText.split('\n');
    const newLines = newText.split('\n');
    const diff: string[] = [];

    let i = 0;
    let j = 0;
    while (i < oldLines.length || j < newLines.length) {
      if (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) {
        diff.push(` ${oldLines[i]}`);
        i++;
        j++;
      } else if (j < newLines.length && (!oldLines.includes(newLines[j]) || oldLines.indexOf(newLines[j]) < i)) {
        diff.push(`+${newLines[j]}`);
        j++;
      } else if (i < oldLines.length) {
        diff.push(`-${oldLines[i]}`);
        i++;
      } else {
        diff.push(`+${newLines[j]}`);
        j++;
      }
    }
    return diff.slice(0, 50).join('\n');
  }
}

export const fileService = new FileService();
