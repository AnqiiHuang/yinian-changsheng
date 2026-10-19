export interface AnalyticsSink {
  track(name: string, props: Record<string, string | number | boolean>): void;
}

export const localAnalytics: AnalyticsSink = {
  track() {
    // 正式平台接入前只留在存档里的调试记录，不向外部发送。
  },
};
