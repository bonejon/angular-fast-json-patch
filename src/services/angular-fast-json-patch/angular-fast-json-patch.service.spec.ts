import { Observable } from 'rxjs/Rx';
import { FastJsonPatchService } from './angular-fast-json-patch.service';
import { Observer } from './observer';
import { Operation } from './operation';

describe('FastJsonPatchService', () => {
  let fastJsonPatchService: FastJsonPatchService;

  beforeEach(() => {
    fastJsonPatchService = new FastJsonPatchService();
  });

  it ('should construct the service', (done) => {
    expect(fastJsonPatchService).toBeDefined();

    done();
  });

  it ('Should generate a single observer for one object', (done) => {
    const object: any = { id: 1, name: 'the name' };

    const observer: Observer<any> = fastJsonPatchService.observe(object);

    expect(fastJsonPatchService.beforeObjects.length).toBe(1);
    done();
  });

  it ('Should not duplicate observers and return the original', (done) => {
    const object: any = { id: 1, name: 'the name' };

    const observer1: Observer<any> = fastJsonPatchService.observe(object);
    const observer2: Observer<any> = fastJsonPatchService.observe(object);

    expect(fastJsonPatchService.beforeObjects.length).toBe(1);
    expect(observer1).toEqual(observer2);

    done();
  });

  it ('Should generate a patch with a single replace operation for a simple update', (done) => {
    const object: any = { id: 1, name: 'the name' };

    const observer: Observer<any> = fastJsonPatchService.observe(object);

    object.name = 'An Updated Name';

    const vector: Operation[] = fastJsonPatchService.generate(observer);

    expect(vector).toBeDefined();
    expect(vector.length).toBe(1);

    const op: Operation = vector[0];
    expect(op.op).toBe('replace');
    expect(op.path).toBe('/name');
    expect(op.value).toBe('An Updated Name');

    done();
  });

  it ('Should generate a patch with a single add operation for a simple update', (done) => {
    const object: any = { id: 1, name: 'the name' };

    const observer: Observer<any> = fastJsonPatchService.observe(object);

    object.favouriteColour = 'Yellow';

    const vector: Operation[] = fastJsonPatchService.generate(observer);

    expect(vector).toBeDefined();
    expect(vector.length).toBe(1);

    const op: Operation = vector[0];
    expect(op.op).toBe('add');
    expect(op.path).toBe('/favouriteColour');
    expect(op.value).toBe('Yellow');

    done();
  });

  it ('Should generate a patch with a single remove operation', (done) => {
    const object: any = { id: 1, name: 'the name', favouriteColour: 'Yellow' };

    const observer: Observer<any> = fastJsonPatchService.observe(object);

    delete(object['favouriteColour']);

    const vector: Operation[] = fastJsonPatchService.generate(observer);

    expect(vector).toBeDefined();
    expect(vector.length).toBe(1);

    const op: Operation = vector[0];
    expect(op.op).toBe('remove');
    expect(op.path).toBe('/favouriteColour');
    expect(op.value).toBeUndefined();

    done();
  });

  it ('Should remove observer from array when object unobserved', (done) => {
    const object: any = { id: 1, name: 'the name', favouriteColour: 'Yellow' };

    const observer: Observer<any> = fastJsonPatchService.observe(object);

    observer.unobserve();

    expect(fastJsonPatchService.beforeObjects.length).toBeDefined(0);

    done();
  });

  it ('Should remove observer from array when service call to unobserved', (done) => {
    const object: any = { id: 1, name: 'the name', favouriteColour: 'Yellow' };

    const observer: Observer<any> = fastJsonPatchService.observe(object);

    fastJsonPatchService.unobserve(observer);

    expect(fastJsonPatchService.beforeObjects.length).toBeDefined(0);

    done();
  });

  it ('Should remove the correct observer when multiple objects are observed', (done) => {
    const object1: any = { id: 1, name: 'the name', favouriteColour: 'Yellow' };
    const object2: any = { id: 2, name: 'another name', favouriteColour: 'Blue' };
    const object3: any = { id: 3, name: 'Last in the list', favouriteColour: 'Pink' };

    const observer1: Observer<any> = fastJsonPatchService.observe(object1);
    const observer2: Observer<any> = fastJsonPatchService.observe(object2);
    const observer3: Observer<any> = fastJsonPatchService.observe(object3);

    expect(fastJsonPatchService.beforeObjects.length).toBe(3);

    fastJsonPatchService.unobserve(observer2);

    expect(fastJsonPatchService.beforeObjects.length).toBe(2);

    const remainingObject1: any = fastJsonPatchService.beforeObjects[0];
    const remainingObject2: any = fastJsonPatchService.beforeObjects[1];

    expect(remainingObject1.obj.id).toBe(1);
    expect(remainingObject2.obj.id).toBe(3);

    done();
  });

  it ('Should generate a patch for the correct object when multiple objects are observed', (done) => {
    const object1: any = { id: 1, name: 'the name', favouriteColour: 'Yellow' };
    const object2: any = { id: 2, name: 'another name', favouriteColour: 'Blue' };
    const object3: any = { id: 3, name: 'Last in the list', favouriteColour: 'Pink' };

    const observer1: Observer<any> = fastJsonPatchService.observe(object1);
    const observer2: Observer<any> = fastJsonPatchService.observe(object2);
    const observer3: Observer<any> = fastJsonPatchService.observe(object3);

    expect(fastJsonPatchService.beforeObjects.length).toBe(3);

    object3.favouriteColour = 'Purple';

    const vector1: Operation[] = fastJsonPatchService.generate(observer3);
    const vector2: Operation[] = fastJsonPatchService.generate(observer1);

    expect(vector2).toBeDefined();
    expect(vector2.length).toBe(0);

    expect(vector1).toBeDefined();
    expect(vector1.length).toBe(1);

    const op: Operation = vector1[0];
    expect(op.op).toBe('replace');
    expect(op.path).toBe('/favouriteColour');
    expect(op.value).toBe('Purple');

    done();
  });
});
