export interface UsageEvent {
  id: string;
  projectId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  operation: string;
  timestamp: string;
}

export class UsageService {
  private events: UsageEvent[] = [];

  public trackUsage(projectId: string, operation: string, inputTokens: number, outputTokens: number, model: string = 'qwen-2.5-coder-32b-instruct') {
    this.events.push({
      id: 'usg_' + Math.random().toString(36).substring(2, 9),
      projectId,
      model,
      inputTokens,
      outputTokens,
      operation,
      timestamp: new Date().toISOString(),
    });
  }

  public getProjectUsage(projectId: string) {
    const list = this.events.filter(e => e.projectId === projectId);
    const totalInput = list.reduce((acc, curr) => acc + curr.inputTokens, 0);
    const totalOutput = list.reduce((acc, curr) => acc + curr.outputTokens, 0);
    return {
      totalTokens: totalInput + totalOutput,
      inputTokens: totalInput,
      outputTokens: totalOutput,
      eventsCount: list.length,
    };
  }
}

export const usageService = new UsageService();
