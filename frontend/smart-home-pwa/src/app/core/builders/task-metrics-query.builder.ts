export type TimeGranularity = 'day' | 'week' | 'month' | 'year';

export interface TaskMetricsQuery {
  familyId: string;
  members?: string[];
  start?: string;
  end?: string;
  groupBy?: 'member' | 'date';
  granularity?: TimeGranularity;
  metric?: 'completed' | 'duration' | 'points';
  includeInactive?: boolean;
}

export class TaskMetricsQueryBuilder {
  private q: TaskMetricsQuery;

  constructor(familyId: string) {
    this.q = {
      familyId,
      groupBy: 'member',
      metric: 'completed',
      includeInactive: false,
    };
  }

  members(ids: string[]) {
    this.q.members = ids;
    return this;
  }

  dateRange(start: Date, end: Date) {
    this.q.start = start.toISOString();
    this.q.end = end.toISOString();
    return this;
  }

  groupByMember() {
    this.q.groupBy = 'member';
    this.q.granularity = undefined;
    return this;
  }

  groupByDate(granularity: TimeGranularity) {
    this.q.groupBy = 'date';
    this.q.granularity = granularity;
    return this;
  }

  metricCompleted() {
    this.q.metric = 'completed';
    return this;
  }

  metricDuration() {
    this.q.metric = 'duration';
    return this;
  }

  metricPoints() {
    this.q.metric = 'points';
    return this;
  }

  includeInactive() {
    this.q.includeInactive = true;
    return this;
  }

  build(): TaskMetricsQuery {
    return { ...this.q };
  }
}