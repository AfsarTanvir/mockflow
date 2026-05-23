import { test } from '@japa/runner';
import { slugify } from '#app/services/slug_helper';

test.group('slug_helper / slugify', () => {
  test('lowercases the name', ({ assert }) => {
    const slug = slugify('Hello World');
    assert.match(slug, /^hello-world-[a-z0-9]+$/);
  });

  test('replaces spaces with single hyphens', ({ assert }) => {
    const slug = slugify('foo   bar    baz');
    assert.match(slug, /^foo-bar-baz-[a-z0-9]+$/);
  });

  test('strips non-alphanumeric characters', ({ assert }) => {
    const slug = slugify('Acme! Co. (US)');
    assert.match(slug, /^acme-co-us-[a-z0-9]+$/);
  });

  test('collapses repeated hyphens', ({ assert }) => {
    const slug = slugify('foo---bar');
    assert.match(slug, /^foo-bar-[a-z0-9]+$/);
  });

  test('always appends a random suffix to avoid collisions', ({ assert }) => {
    const a = slugify('same name');
    const b = slugify('same name');
    assert.notEqual(a, b);
  });

  test('handles names that become empty after stripping', ({ assert }) => {
    const slug = slugify('!!!');
    assert.match(slug, /^-[a-z0-9]+$/);
  });

  test('caps base length to keep total slug reasonable', ({ assert }) => {
    const longName = 'a'.repeat(200);
    const slug = slugify(longName);
    assert.isAtMost(slug.length, 80);
  });
});
