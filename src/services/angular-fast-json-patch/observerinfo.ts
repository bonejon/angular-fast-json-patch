export class ObserverInfo {
  private _callback: any;
  private _observer: any;

  public get callback(): any {
    return this.callback;
  }

  public get observer(): any {
    return this.observer;
  }

  constructor(callback: any, observer: any) {
    this._callback = callback;
    this._observer = observer;
  }
}
