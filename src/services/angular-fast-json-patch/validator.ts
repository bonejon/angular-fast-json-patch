import { Operation } from './operation';

export interface Validator<T> {
  validate(operation: Operation, index: number, document: T, existingPathFragment: string): void;
}
