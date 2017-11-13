export interface OperationResult<T> {
  removed?: any;
  test?: boolean;
  newDocument: T;
}
