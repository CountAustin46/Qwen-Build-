import { store } from '../db/store.ts';
import { ProjectChange } from '../../types/index.ts';

export class ChangeService {
  public getChanges(projectId: string): ProjectChange[] {
    return store.getChanges(projectId);
  }

  public revertChange(projectId: string, changeId: string): boolean {
    return store.revertChange(projectId, changeId);
  }
}

export const changeService = new ChangeService();
