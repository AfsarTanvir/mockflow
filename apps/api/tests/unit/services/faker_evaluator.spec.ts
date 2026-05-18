import { test } from '@japa/runner';
import { evaluateBody } from '#app/services/faker_evaluator';

test.group('faker_evaluator', () => {
  /*
  |--------------------------------------------------------------------------
  | Null body pass-through
  |--------------------------------------------------------------------------
  */
  test('returns null when body is null', ({ assert }) => {
    assert.isNull(evaluateBody(null, {}));
  });

  /*
  |--------------------------------------------------------------------------
  | Path parameter substitution
  |--------------------------------------------------------------------------
  */
  test('substitutes {{param.id}} with the provided pathParam value', ({ assert }) => {
    const result = evaluateBody({ id: '{{param.id}}' }, { id: '42' });
    assert.deepEqual(result, { id: '42' });
  });

  test('keeps the literal template when the path param is missing', ({ assert }) => {
    const result = evaluateBody({ id: '{{param.missing}}' }, {});
    assert.deepEqual(result, { id: '{{param.missing}}' });
  });

  test('substitutes multiple path params in one string', ({ assert }) => {
    const result = evaluateBody(
      { url: '/users/{{param.userId}}/posts/{{param.postId}}' },
      { userId: 'u1', postId: 'p1' }
    );
    assert.deepEqual(result, { url: '/users/u1/posts/p1' });
  });

  /*
  |--------------------------------------------------------------------------
  | Faker template substitution
  |--------------------------------------------------------------------------
  */
  test('substitutes a no-arg faker template with a real value', ({ assert }) => {
    const result = evaluateBody({ name: '{{faker.person.fullName()}}' }, {});
    const name = (result as { name: string }).name;
    assert.isString(name);
    assert.notMatch(name, /\{\{faker/);
    assert.isTrue(name.length > 0);
  });

  test('substitutes a faker template with JSON args', ({ assert }) => {
    const result = evaluateBody({ age: '{{faker.number.int({"min":18,"max":18})}}' }, {});
    const age = (result as { age: string }).age;
    // Result comes back as string because the value is interpolated into a string field
    assert.equal(age, '18');
  });

  test('falls back to literal template when faker category is unknown', ({ assert }) => {
    const result = evaluateBody({ x: '{{faker.nonexistent.method()}}' }, {});
    assert.match((result as { x: string }).x, /\{\{faker\.nonexistent\.method\}\}/);
  });

  test('falls back to literal template when faker method is unknown', ({ assert }) => {
    const result = evaluateBody({ x: '{{faker.person.notARealMethod()}}' }, {});
    assert.match((result as { x: string }).x, /\{\{faker\.person\.notARealMethod\}\}/);
  });

  /*
  |--------------------------------------------------------------------------
  | Recursive walking
  |--------------------------------------------------------------------------
  */
  test('walks nested objects and substitutes deep templates', ({ assert }) => {
    const result = evaluateBody(
      {
        user: {
          profile: {
            id: '{{param.id}}',
            name: 'static',
          },
        },
      },
      { id: '123' }
    );
    assert.deepEqual(result, {
      user: { profile: { id: '123', name: 'static' } },
    });
  });

  test('walks arrays and substitutes templates in each element', ({ assert }) => {
    const result = evaluateBody(
      { items: ['{{param.id}}', 'static', '{{param.id}}'] },
      { id: 'x' }
    );
    assert.deepEqual(result, { items: ['x', 'static', 'x'] });
  });

  /*
  |--------------------------------------------------------------------------
  | Non-string values pass through unchanged
  |--------------------------------------------------------------------------
  */
  test('leaves numbers, booleans, and nulls untouched', ({ assert }) => {
    const result = evaluateBody(
      {
        count: 42,
        flag: true,
        missing: null,
      },
      {}
    );
    assert.deepEqual(result, { count: 42, flag: true, missing: null });
  });

  test('leaves a string with no templates untouched', ({ assert }) => {
    const result = evaluateBody({ msg: 'hello world' }, {});
    assert.deepEqual(result, { msg: 'hello world' });
  });
});
