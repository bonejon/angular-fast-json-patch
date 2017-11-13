import { Operation } from './operation';

export class Observer<T> {
  public object?: T;
  public patches?: Operation[];
  public unobserve: () => void;
  public callback: (patches: Operation[]) => void;
  public nextHandle?: number;
}
