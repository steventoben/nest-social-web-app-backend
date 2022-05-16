export interface IPaginationResults<T> {
  pageResults: T[];
  pageSize?: number;
  totalSize: number;
  first?: string;
  previous?: string;
  next?: string;
  last?: string;
}
