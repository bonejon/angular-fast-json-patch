import { OperationResult } from './operationresult';

export interface PatchResult<T> extends Array<OperationResult<T>> {
  newDocument: T;
}
