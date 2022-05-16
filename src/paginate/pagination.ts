import { IPaginationResults } from "./interface/pagination-results.interface";

export class Pagination<T> {
  public results: T[];
  public pageSize: number;
  public totalSize: number;
  constructor(paginationResults: IPaginationResults<T>) {
    this.results = paginationResults.pageResults;
    this.pageSize = paginationResults.pageSize;
    this.totalSize = paginationResults.totalSize;
  }
}
