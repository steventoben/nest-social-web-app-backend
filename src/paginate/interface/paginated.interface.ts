export interface PaginatedRo<T> {
  totalResults: number; //total posts
  pageCount: number; //total pages
  pageResultsCount: number; //total posts on current page. usually = limit expect last page
  limit?: number;
  page?: number;
  pageResults: T[];
}
