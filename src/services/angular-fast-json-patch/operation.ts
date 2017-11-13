export class Operation {
  public path: string;
  public value: any;
  public from: string;

  public get op(): string {
    switch (this._operation) {
      case Operations.Add:
        return 'add';
      case Operations.Remove:
        return 'remove';
      case Operations.Replace:
        return 'replace';
      case Operations.Move:
        return 'move';
      case Operations.Copy:
        return 'copy';
      case Operations.Test:
        return 'test';
      case Operations.Get:
        return '_get';
      default:
        throw new Error('Invalid Operation');
    }
  }

  private _operation: Operations;

  constructor(operation: Operations, path?: string, value?: any, from?: string) {
    this._operation = operation;
    this.path = path;
    this.value = value;
    this.from = from;
  }
}

export enum Operations {
  Add = 1,
  Remove = 2,
  Replace = 3,
  Move = 4,
  Copy = 5,
  Test = 6,
  Get = 7
}
