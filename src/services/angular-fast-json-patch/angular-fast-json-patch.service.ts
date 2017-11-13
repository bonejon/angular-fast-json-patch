import { observable } from 'rxjs/symbol/observable';
import { Injectable } from '@angular/core';
import { Helpers } from './helpers';
import { Operation, Operations } from './operation';
import { Observer } from './observer';
import { Mirror } from './mirror';

/**
 * FastJsonPatchService class.
 */
@Injectable()
export class FastJsonPatchService {
  public beforeObjects: Mirror[] = [];

  /**
   * Generate an array of patches from an observer
   */
  public generate<T>(observer: Observer<T>): Operation[] {
    let mirror: Mirror;

    for (let i = 0, length = this.beforeObjects.length; i < length; i++) {
      if (this.beforeObjects[i].obj === observer.object) {
        mirror = this.beforeObjects[i];
        break;
      }
    }

    Helpers.generate(mirror.originalObject, observer.object, observer.patches, '');

    if (observer.patches.length) {
      Helpers.applyPatch(mirror.obj, observer.patches);
    }

    const temp = observer.patches;

    if (temp.length > 0) {
      observer.patches = [];
      if (observer.callback) {
        observer.callback(temp);
      }
    }
    return temp;
    }

  public observe<T>(obj: any, callback?: (patches: Operation[]) => void): Observer<T> {
    let observer: Observer<T>;
    const root = obj;
    let mirror: Mirror = this.getMirror(obj);

    if (!mirror) {
      mirror = new Mirror(obj);
      this.beforeObjects.push(mirror);
    } else {
      observer = this.getObserverFromMirror(mirror, callback);
    }

    if (observer) {
      return observer;
    }

    observer = new Observer<T>();

    mirror.originalObject = Helpers.deepClone(obj);
    mirror.obj = obj;

    const dirtyCheck = () => {
      this.generate(observer);
    };

    const fastCheck = () => {
      clearTimeout(observer.nextHandle);
      observer.nextHandle = setTimeout(dirtyCheck);
    };

    if (callback) {
      observer.callback = callback;
      observer.nextHandle = null;

      if (typeof window !== 'undefined') { // not Node
        if (window.addEventListener) { // standards
          window.addEventListener('mouseup', fastCheck);
          window.addEventListener('keyup', fastCheck);
          window.addEventListener('mousedown', fastCheck);
          window.addEventListener('keydown', fastCheck);
          window.addEventListener('change', fastCheck);
        } else { // IE8
          const documentElement: any = document.documentElement;
          documentElement.attachEvent('onmouseup', fastCheck);
          documentElement.attachEvent('onkeyup', fastCheck);
          documentElement.attachEvent('onmousedown', fastCheck);
          documentElement.attachEvent('onkeydown', fastCheck);
          documentElement.attachEvent('onchange', fastCheck);
        }
      }
    }

    observer.patches = [];
    observer.object = obj;

    observer.unobserve = () => {
      let unobserveMirror: Mirror = this.getMirror(observer.object);
      this.generate(observer);
      clearTimeout(observer.nextHandle);
      this.removeObserverFromMirror(unobserveMirror, observer);

      if (unobserveMirror.observers.length === 0) {
        // there are no observables anymore so discard the mirror
        const mirrorIndex: number = this.beforeObjects.indexOf(unobserveMirror);
        this.beforeObjects.splice(mirrorIndex, 1);
        unobserveMirror = undefined;
      }

      if (typeof window !== 'undefined') {
        if (window.removeEventListener) {
          window.removeEventListener('mouseup', fastCheck);
          window.removeEventListener('keyup', fastCheck);
          window.removeEventListener('mousedown', fastCheck);
          window.removeEventListener('keydown', fastCheck);
        } else {
          const documentElement: any = document.documentElement;
          documentElement.detachEvent('onmouseup', fastCheck);
          documentElement.detachEvent('onkeyup', fastCheck);
          documentElement.detachEvent('onmousedown', fastCheck);
          documentElement.detachEvent('onkeydown', fastCheck);
        }
      }
    };

    mirror.observers.push(new ObserverInfo(callback, observer));

    return observer;
  }

  public unobserve<T>(observer: Observer<T>) {
    observer.unobserve();
  }

  private getMirror(obj: any): any {
    for (let i = 0, length = this.beforeObjects.length; i < length; i++) {
      if (this.beforeObjects[i].obj === obj) {
        return this.beforeObjects[i];
      }
    }
  }

  private getObserverFromMirror(mirror: any, callback: any): any {
    for (let j = 0, length = mirror.observers.length; j < length; j++) {
      if (mirror.observers[j].callback === callback) {
        return mirror.observers[j].observer;
      }
    }
  }

  private removeObserverFromMirror(mirror: Mirror, observer: any): any {
    const observerIndex: number = mirror.observers.indexOf(observer);
    mirror.observers.splice(observerIndex, 1);
  }
}
