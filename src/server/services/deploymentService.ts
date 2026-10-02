import { store } from '../db/store.ts';

export interface DeploymentRecord {
  id: string;
  projectId: string;
  target: 'preview-sandbox' | 'cloud-run' | 'static-edge';
  url: string;
  status: 'ready' | 'deploying' | 'failed';
  deployedAt: string;
}

export class DeploymentService {
  private deployments: Map<string, DeploymentRecord[]> = new Map();

  public async deployPreview(projectId: string): Promise<DeploymentRecord> {
    const id = 'dep_' + Math.random().toString(36).substring(2, 9);
    const project = store.getProject(projectId);
    const deployment: DeploymentRecord = {
      id,
      projectId,
      target: 'preview-sandbox',
      url: `/api/projects/${projectId}/preview`,
      status: 'ready',
      deployedAt: new Date().toISOString(),
    };

    const list = this.deployments.get(projectId) || [];
    list.unshift(deployment);
    this.deployments.set(projectId, list);
    return deployment;
  }

  public getDeployments(projectId: string): DeploymentRecord[] {
    return this.deployments.get(projectId) || [];
  }
}

export const deploymentService = new DeploymentService();
