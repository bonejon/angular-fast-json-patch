import { ObserverInfo } from './observerinfo';

export class Mirror {
  public originalObject: any;
  public obj: any;
  public observers: ObserverInfo[] = new Array<ObserverInfo>();

  constructor(obj: any) {
    this.obj = obj;
  }
}
