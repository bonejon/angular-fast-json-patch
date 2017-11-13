export class JsonPatchError extends Error {
  constructor(public message: string, public name: JsonPatchErrorName, public index?: number, public operation?: any, public tree?: any) {
      super(message);
  }
}

export type JsonPatchErrorName = 'SEQUENCE_NOT_AN_ARRAY' |
  'OPERATION_NOT_AN_OBJECT' |
  'OPERATION_OP_INVALID' |
  'OPERATION_PATH_INVALID' |
  'OPERATION_FROM_REQUIRED' |
  'OPERATION_VALUE_REQUIRED' |
  'OPERATION_VALUE_CANNOT_CONTAIN_UNDEFINED' |
  'OPERATION_PATH_CANNOT_ADD' |
  'OPERATION_PATH_UNRESOLVABLE' |
  'OPERATION_FROM_UNRESOLVABLE' |
  'OPERATION_PATH_ILLEGAL_ARRAY_INDEX' |
  'OPERATION_VALUE_OUT_OF_BOUNDS' |
  'TEST_OPERATION_FAILED';
