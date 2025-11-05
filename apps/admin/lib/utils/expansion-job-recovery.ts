/**
 * Client-side utility for recovering expansion jobs after network interruptions
 */

export interface JobRecoveryInfo {
  jobId: string;
  timestamp: number;
  params?: any;
}

export class ExpansionJobRecovery {
  private static readonly STORAGE_PREFIX = 'expansion-job-';
  private static readonly MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes

  /**
   * Store job ID for recovery
   */
  static storeJob(jobId: string, params?: any): string {
    const storageKey = `${this.STORAGE_PREFIX}${Date.now()}`;
    const info: JobRecoveryInfo = {
      jobId,
      timestamp: Date.now(),
      params
    };
    
    localStorage.setItem(storageKey, JSON.stringify(info));
    return storageKey;
  }

  /**
   * Remove job from recovery storage
   */
  static removeJob(storageKey: string): void {
    localStorage.removeItem(storageKey);
  }

  /**
   * Get all recoverable jobs
   */
  static getRecoverableJobs(): Array<{ storageKey: string; info: JobRecoveryInfo }> {
    const jobs: Array<{ storageKey: string; info: JobRecoveryInfo }> = [];
    const now = Date.now();

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(this.STORAGE_PREFIX)) continue;

      try {
        const infoStr = localStorage.getItem(key);
        if (!infoStr) continue;

        const info: JobRecoveryInfo = JSON.parse(infoStr);
        
        // Skip expired jobs
        if (now - info.timestamp > this.MAX_AGE_MS) {
          localStorage.removeItem(key);
          continue;
        }

        jobs.push({ storageKey: key, info });
      } catch (error) {
        // Invalid JSON, remove it
        localStorage.removeItem(key);
      }
    }

    return jobs.sort((a, b) => b.info.timestamp - a.info.timestamp);
  }

  /**
   * Check job status
   */
  static async checkJobStatus(jobId: string): Promise<{
    status: 'queued' | 'running' | 'completed' | 'failed' | 'not_found';
    result?: any;
    error?: string;
  }> {
    try {
      const response = await fetch(`/api/expansion/jobs/${jobId}`);
      
      if (response.status === 404) {
        return { status: 'not_found' };
      }
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      return {
        status: data.status,
        result: data.result,
        error: data.error
      };
    } catch (error) {
      console.warn('Failed to check job status:', error);
      return { status: 'not_found' };
    }
  }

  /**
   * Show recovery notification to user
   */
  static showRecoveryNotification(jobs: Array<{ storageKey: string; info: JobRecoveryInfo }>): void {
    if (jobs.length === 0) return;

    const message = jobs.length === 1
      ? 'Found 1 expansion job that may still be running. Check status?'
      : `Found ${jobs.length} expansion jobs that may still be running. Check status?`;

    if (confirm(message)) {
      // User wants to check - could trigger a recovery flow
      console.log('User chose to recover jobs:', jobs);
      // This could be expanded to show a proper UI for job recovery
    }
  }

  /**
   * Clean up old job storage entries
   */
  static cleanup(): void {
    const now = Date.now();
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(this.STORAGE_PREFIX)) continue;

      try {
        const infoStr = localStorage.getItem(key);
        if (!infoStr) continue;

        const info: JobRecoveryInfo = JSON.parse(infoStr);
        if (now - info.timestamp > this.MAX_AGE_MS) {
          keysToRemove.push(key);
        }
      } catch (error) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));
  }
}