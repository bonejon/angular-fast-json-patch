import * as console from 'console';
import { Operations, Operation } from './operation';
import { OperationResult } from './operationresult';
import { JsonPatchError } from './json-patch-error';
import { arrOps, objOps } from './operation-extensions';
import { PatchResult } from './patchresult';
import { areEquals } from './deep-equals';
import { Validator } from './validator';

export class Helpers {

 /**
  * Deeply clone the object.
  * https://jsperf.com/deep-copy-vs-json-stringify-json-parse/25 (recursiveDeepCopy)
  * @param  {any} obj value to clone
  * @return {any} cloned obj
  */
  public static deepClone(obj: any) {
    switch (typeof obj) {
      case 'object':
        // Faster than ES5 clone - http://jsperf.com/deep-cloning-of-objects/5
        return JSON.parse(JSON.stringify(obj));
      case 'undefined':
        // this is how JSON.stringify behaves for array items
        return null;
      default:
        // no need to clone primitives
        return obj;
    }
  }

  /**
   * Retrieves a value from a JSON document by a JSON pointer.
   * Returns the value.
   *
   * @param document The document to get the value from
   * @param pointer an escaped JSON pointer
   * @return The retrieved value
   */
  public static getValueByPointer(document: any, pointer: string): any {
    if (pointer === '') {
      return document;
    }

    const getOriginalDestination: Operation = new Operation(Operations.Get, pointer);

    this.applyOperation(document, getOriginalDestination);
    return getOriginalDestination.value;
  }

  /**
   * Apply a single JSON Patch Operation on a JSON document.
   * Returns the {newDocument, result} of the operation.
   * It modifies the `document` and `operation` objects - it gets the values by reference.
   * If you would like to avoid touching your values, clone them:
   * `jsonpatch.applyOperation(document, jsonpatch._deepClone(operation))`.
   *
   * @param document The document to patch
   * @param operation The operation to apply
   * @param validateOperation `false` is without validation, `true` to use default jsonpatch's validation, or you can pass a `validateOperation` callback to be used for validation.
   * @param mutateDocument Whether to mutate the original document or clone it before applying
   * @return `{newDocument, result}` after the operation
   */
  public static applyOperation<T>(document: T, operation: Operation, validateOperation: boolean | Validator<T> = false, mutateDocument: boolean = true): OperationResult<T> {
    if (validateOperation) {
      if (typeof validateOperation === 'function') {
        validateOperation(operation, 0, document, operation.path);
      } else {
        Helpers.validator(operation, 0);
      }
    }

    /* ROOT OPERATIONS */
    if (operation.path === '') {
      const returnValue: OperationResult<T> = { newDocument: document };
      if (operation.op === 'add') {
        returnValue.newDocument = operation.value;
        return returnValue;
      } else if (operation.op === 'replace') {
        returnValue.newDocument = operation.value;
        returnValue.removed = document; // document we removed
        return returnValue;
      } else if (operation.op === 'move' || operation.op === 'copy') { // it's a move or copy to root
        returnValue.newDocument = Helpers.getValueByPointer(document, operation.from); // get the value by json-pointer in `from` field
        if (operation.op === 'move') { // report removed item
          returnValue.removed = document;
        }
        return returnValue;
      } else if (operation.op === 'test') {
        returnValue.test = areEquals(document, operation.value);
        if (returnValue.test === false) {
          throw new JsonPatchError('Test operation failed', 'TEST_OPERATION_FAILED', 0, operation, document);
        }
        returnValue.newDocument = document;
        return returnValue;
      } else if (operation.op === 'remove') { // a remove on root
        returnValue.removed = document;
        returnValue.newDocument = null;
        return returnValue;
      } else if (operation.op === '_get') {
        operation.value = document;
        return returnValue;
      } else { /* bad operation */
        if (validateOperation) {
          throw new JsonPatchError('Operation `op` property is not one of operations defined in RFC-6902', 'OPERATION_OP_INVALID', 0, operation, document);
        } else {
          return returnValue;
        }
      }
      /* END ROOT OPERATIONS */
    } else {
      if (!mutateDocument) {
        document = Helpers.deepClone(document);
      }
      const path = operation.path || '';
      const keys = path.split('/');
      let obj = document;
      let t = 1; // skip empty element - http://jsperf.com/to-shift-or-not-to-shift
      const len = keys.length;
      let existingPathFragment;
      let key: string | number;
      let validateFunction;

      if (typeof validateOperation === 'function') {
        validateFunction = validateOperation;
      } else {
        validateFunction = Helpers.validator;
      }

      while (true) {
        key = keys[t];

        if (validateOperation) {
          if (existingPathFragment) {
            if ((obj as any)[key] === undefined) {
              existingPathFragment = keys.slice(0, t).join('/');
            } else if (t === len - 1) {
              existingPathFragment = operation.path;
            }
            if (existingPathFragment !== undefined) {
              validateFunction(operation, 0, document, existingPathFragment);
            }
          }
        }
        t++;
        if (Array.isArray(obj)) {
          if (key === '-') {
            key = obj.length;
          } else {
            if (validateOperation && !Helpers.isInteger(key)) {
              throw new JsonPatchError
              ('Expected an unsigned base-10 integer value, making the new referenced value the array element with the zero-based index',
              'OPERATION_PATH_ILLEGAL_ARRAY_INDEX',
              0,
              operation.path,
              operation);
            } else if (Helpers.isInteger(key)) {
              // only parse key when it's an integer for `arr.prop` to work
              // tslint:disable-next-line:no-bitwise
              key = ~~key;
            }
          }
          if (t >= len) {
            if (validateOperation && operation.op === 'add' && key > obj.length) {
              throw new JsonPatchError('The specified index MUST NOT be greater than the number of elements in the array', 'OPERATION_VALUE_OUT_OF_BOUNDS', 0, operation.path, operation);
            }

            const returnValue: any = arrOps[operation.op].call(operation, obj, key, document); // Apply patch
            if (returnValue.test === false) {
              throw new JsonPatchError('Test operation failed', 'TEST_OPERATION_FAILED', 0, operation, document);
            }

            return returnValue;
          }
        } else {
          if (key && key.indexOf('~') !== -1) {
            key = Helpers.unescapePathComponent(key);
          }

          if (t >= len) {
            const returnValue: any = objOps[operation.op].call(operation, obj, key, document); // Apply patch
            if (returnValue.test === false) {
              throw new JsonPatchError('Test operation failed', 'TEST_OPERATION_FAILED', 0, operation, document);
            }
            return returnValue;
          }
        }
        obj = (obj as any)[key];
      }
    }
  }

  // 3x faster than cached /^\d+$/.test(str)
  public static isInteger(str: string): boolean {
    let i = 0;
    const len = str.length;
    let charCode;

    while (i < len) {
        charCode = str.charCodeAt(i);
        if (charCode >= 48 && charCode <= 57) {
            i++;
            continue;
        }
        return false;
    }
    return true;
  }

  public static generate(mirror: any, obj: any, patches: any, path: string) {
    if (obj === mirror) {
      return;
    }

    if (typeof obj.toJSON === 'function') {
      obj = obj.toJSON();
    }

    const newKeys = this.objectKeys(obj);
    const oldKeys = this.objectKeys(mirror);
    let changed = false;
    let deleted = false;

    // if ever "move" operation is implemented here, make sure this test runs OK: "should not generate the same patch twice (move)"

    for (let okl = oldKeys.length - 1; okl >= 0; okl--) {
      const oldKey = oldKeys[okl];
      const oldVal = mirror[oldKey];
      if (Helpers.hasOwnProperty(obj, oldKey) && !(obj[oldKey] === undefined && oldVal !== undefined && Array.isArray(obj) === false)) {
        const newVal = obj[oldKey];
        if (typeof oldVal === 'object' && oldVal != null && typeof newVal === 'object' && newVal != null) {
          Helpers.generate(oldVal, newVal, patches, path + '/' + Helpers.escapePathComponent(oldKey));
        } else {
          if (oldVal !== newVal) {
            changed = true;
            patches.push({ op: 'replace', path: path + '/' + Helpers.escapePathComponent(oldKey), value: Helpers.deepClone(newVal) });
          }
        }
      } else {
        patches.push({ op: 'remove', path: path + '/' + Helpers.escapePathComponent(oldKey) });
        deleted = true; // property has been deleted
      }
    }

    if (!deleted && newKeys.length === oldKeys.length) {
      return;
    }

    for (const newKey of newKeys) {
      if (!Helpers.hasOwnProperty(mirror, newKey) && obj[newKey] !== undefined) {
        patches.push({ op: 'add', path: path + '/' + Helpers.escapePathComponent(newKey), value: Helpers.deepClone(obj[newKey]) });
      }
    }
  }

  /**
   * Apply a full JSON Patch array on a JSON document.
   * Returns the {newDocument, result} of the patch.
   * It modifies the `document` object and `patch` - it gets the values by reference.
   * If you would like to avoid touching your values, clone them:
   * `jsonpatch.applyPatch(document, jsonpatch._deepClone(patch))`.
   *
   * @param document The document to patch
   * @param patch The patch to apply
   * @param validateOperation `false` is without validation, `true` to use default jsonpatch's validation, or you can pass a `validateOperation` callback to be used for validation.
   * @param mutateDocument Whether to mutate the original document or clone it before applying
   * @return An array of `{newDocument, result}` after the patch
   */
  public static applyPatch<T>(document: T, patch: Operation[], validateOperation?: boolean | Validator<T>, mutateDocument: boolean = true): PatchResult<T> {
    if (validateOperation) {
      if (!Array.isArray(patch)) {
        throw new JsonPatchError('Patch sequence must be an array', 'SEQUENCE_NOT_AN_ARRAY');
      }
    }

    if (!mutateDocument) {
      document = Helpers.deepClone(document);
    }

    const results = new Array(patch.length) as PatchResult<T>;

    for (let i = 0, length = patch.length; i < length; i++) {
      results[i] = Helpers.applyOperation(document, patch[i], validateOperation);
      document = results[i].newDocument; // in case root was replaced
    }
    results.newDocument = document;
    return results;
  }

  private static _hasOwnProperty = Object.prototype.hasOwnProperty;

  /**
   * Validates a single operation. Called from `jsonpatch.validate`. Throws `JsonPatchError` in case of an error.
   * @param {object} operation - operation object (patch)
   * @param {number} index - index of operation in the sequence
   * @param {object} [document] - object where the operation is supposed to be applied
   * @param {string} [existingPathFragment] - comes along with `document`
   */
  private static validator<T>(operation: Operation, index: number, document?: any, existingPathFragment?: string): void {
    if (typeof operation !== 'object' || operation === null || Array.isArray(operation)) {
      throw new JsonPatchError('Operation is not an object', 'OPERATION_NOT_AN_OBJECT', index, operation, document);
    } else if (!(objOps as any)[operation.op]) {
      throw new JsonPatchError('Operation `op` property is not one of operations defined in RFC-6902', 'OPERATION_OP_INVALID', index, operation, document);
    } else if (typeof operation.path !== 'string') {
      throw new JsonPatchError('Operation `path` property is not a string', 'OPERATION_PATH_INVALID', index, operation, document);
    } else if (operation.path.indexOf('/') !== 0 && operation.path.length > 0) {
      // paths that aren't empty string should start with "/"
      throw new JsonPatchError('Operation `path` property must start with "/"', 'OPERATION_PATH_INVALID', index, operation, document);
    } else if ((operation.op === 'move' || operation.op === 'copy') && typeof operation.from !== 'string') {
      throw new JsonPatchError('Operation `from` property is not present (applicable in `move` and `copy` operations)', 'OPERATION_FROM_REQUIRED', index, operation, document);
    } else if ((operation.op === 'add' || operation.op === 'replace' || operation.op === 'test') && operation.value === undefined) {
      throw new JsonPatchError('Operation `value` property is not present (applicable in `add`, `replace` and `test` operations)', 'OPERATION_VALUE_REQUIRED', index, operation, document);
    } else if ((operation.op === 'add' || operation.op === 'replace' || operation.op === 'test') && this.hasUndefined(operation.value)) {
      throw new JsonPatchError(
        'Operation `value` property is not present (applicable in `add`, `replace` and `test` operations)',
        'OPERATION_VALUE_CANNOT_CONTAIN_UNDEFINED',
        index,
        operation,
        document);
    } else if (document) {
      if (operation.op === 'add') {
        const pathLen = operation.path.split('/').length;
        const existingPathLen = existingPathFragment.split('/').length;
        if (pathLen !== existingPathLen + 1 && pathLen !== existingPathLen) {
          throw new JsonPatchError('Cannot perform an `add` operation at the desired path', 'OPERATION_PATH_CANNOT_ADD', index, operation, document);
        }
      } else if (operation.op === 'replace' || operation.op === 'remove' || operation.op === '_get') {
        if (operation.path !== existingPathFragment) {
          throw new JsonPatchError('Cannot perform the operation at a path that does not exist', 'OPERATION_PATH_UNRESOLVABLE', index, operation, document);
        }
      } else if (operation.op === 'move' || operation.op === 'copy') {
        const existingValue: Operation = new Operation(Operations.Get, operation.from, undefined);
        const error = Helpers.validate([existingValue], document);
        if (error && error.name === 'OPERATION_PATH_UNRESOLVABLE') {
          throw new JsonPatchError('Cannot perform the operation from a path that does not exist', 'OPERATION_FROM_UNRESOLVABLE', index, operation, document);
        }
      }
    }
  }

  /**
   * Validates a sequence of operations. If `document` parameter is provided, the sequence is additionally validated against the object document.
   * If error is encountered, returns a JsonPatchError object
   * @param sequence
   * @param document
   * @returns {JsonPatchError|undefined}
   */
  private static validate<T>(sequence: Operation[], document?: T, externalValidator?: Validator<T>): JsonPatchError {
    try {
      if (!Array.isArray(sequence)) {
        throw new JsonPatchError('Patch sequence must be an array', 'SEQUENCE_NOT_AN_ARRAY');
      }
      if (document) {
        // clone document and sequence so that we can safely try applying operations
        Helpers.applyPatch(Helpers.deepClone(document), Helpers.deepClone(sequence), externalValidator || true);
      } else {
        const validatorFunction = externalValidator.validate || Helpers.validator;
        for (let i = 0; i < sequence.length; i++) {
          validatorFunction(sequence[i], i, document, undefined);
        }
      }
    } catch (e) {
      if (e instanceof JsonPatchError) {
        return e;
      } else {
        throw e;
      }
    }
  }

  /**
   * Recursively checks whether an object has any undefined values inside.
   */
  private static hasUndefined(obj: any): boolean {
    if (obj === undefined) {
        return true;
    }

    if (obj) {
        if (Array.isArray(obj)) {
            for (let a = 0, len = obj.length; a < len; a++) {
                if (this.hasUndefined(obj[a])) {
                    return true;
                }
            }
        } else if (typeof obj === 'object') {
            const objKeys = Helpers.objectKeys(obj);
            const objKeysLength = objKeys.length;
            for (let i = 0; i < objKeysLength; i++) {
                if (Helpers.hasUndefined(obj[objKeys[i]])) {
                    return true;
                }
            }
        }
    }
    return false;
  }

  private static hasOwnProperty(obj: any, key: any) {
    return Helpers._hasOwnProperty.call(obj, key);
  }

  private static objectKeys(obj: any) {
      if (Array.isArray(obj)) {
          const arrayKeys = new Array(obj.length);
          for (let k = 0; k < arrayKeys.length; k++) {
              arrayKeys[k] = '' + k;
          }
          return arrayKeys;
      }

      if (Object.keys) {
          return Object.keys(obj);
      }

      const keys = [];
      for (const i in obj) {
          if (Helpers.hasOwnProperty(obj, i)) {
              keys.push(i);
          }
      }
      return keys;
  }

  /**
   * Unescapes a json pointer path
   * @param path The escaped pointer
   * @return The unescaped path
   */
  private static unescapePathComponent(path: string): string {
    let newPath: string = path.replace(/~1/g, '/');
    newPath = newPath.replace(/~0/g, '~');

    return newPath;
  }

  /**
   * Escapes a json pointer path
   * @param path The raw pointer
   * @return the Escaped path
   */
  private static escapePathComponent(path: string): string {
    if (path.indexOf('/') === -1 && path.indexOf('~') === -1) {
      return path;
    }

    return path.replace(/~/g, '~0').replace(/\//g, '~1');
  }
}
