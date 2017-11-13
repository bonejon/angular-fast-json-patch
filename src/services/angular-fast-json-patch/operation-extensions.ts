import { Helpers } from './helpers';
import { Operation, Operations } from './operation';
import { areEquals } from './deep-equals';

/* We use a Javascript hash to store each
 function. Each hash entry (property) uses
 the operation identifiers specified in rfc6902.
 In this way, we can map each patch operation
 to its dedicated function in efficient way.
 */

/* The operations applicable to an object */
export const objOps = {
  add: (obj: any, key: any, document: any) => {
    obj[key] = this.value;
    return { newDocument: document };
  },
  remove: (obj: any, key: any, document: any) => {
    const  removed = obj[key];
    delete obj[key];
    return { newDocument: document, removed };
  },
  replace: (obj: any, key: any, document: any) => {
    const removed = obj[key];
    obj[key] = this.value;
    return { newDocument: document, removed };
  },
  move: (obj: any, key: any, document: any) => {
    /* in case move target overwrites an existing value,
    return the removed value, this can be taxing performance-wise,
    and is potentially unneeded */
    let removed = Helpers.getValueByPointer(document, this.path);

    if (removed) {
      removed = Helpers.deepClone(removed);
    }

    const removeOperation = new Operation(Operations.Remove, this.from);
    const originalValue = Helpers.applyOperation(document,
      removeOperation
    ).removed;

    const addOperation = new Operation(Operations.Add, this.path, originalValue);
    Helpers.applyOperation(document, addOperation);

    return { newDocument: document, removed };
  },
  copy: (obj: any, key: any, document: any) => {
    const valueToCopy = Helpers.getValueByPointer(document, this.from);
    // enforce copy by value so further operations don't affect source (see issue #177)

    const addOperation = new Operation(Operations.Add, this.path, Helpers.deepClone(valueToCopy));
    Helpers.applyOperation(document, addOperation);
    return { newDocument: document };
  },
  test: (obj: any, key: any, document: any) => {
    return { newDocument: document, test: areEquals(obj[key], this.value) };
  },
  _get: (obj: any, key: any, document: any) => {
    this.value = obj[key];
    return { newDocument: document };
  }
};

/* The operations applicable to an array. Many are the same as for the object */
export const arrOps = {
  add: (arr: any, i: any, document: any) => {
    if (Helpers.isInteger(i)) {
      arr.splice(i, 0, this.value);
    } else { // array props
      arr[i] = this.value;
    }
    // this may be needed when using '-' in an array
    return { newDocument: document, index: i };
  },
  remove: (arr: any, i: any, document: any) => {
    const removedList = arr.splice(i, 1);
    return { newDocument: document, removed: removedList[0] };
  },
  replace: (arr: any, i: any, document: any) => {
    const removed = arr[i];
    arr[i] = this.value;
    return { newDocument: document, removed };
  },
  move: objOps.move,
  copy: objOps.copy,
  test: objOps.test,
  _get: objOps._get
};
