import assert from 'node:assert/strict';
import test from 'node:test';

import { truncateText } from '../text.helpers.js';

test('Text helpers should truncate text correctly', async (t) => {
    await t.test('should preserve text shorter than the maximum length', () => {
        const result = truncateText('Hello world', 20);

        assert.equal(result, 'Hello world');
    });

    await t.test('should preserve text equal to the maximum length', () => {
        const value = 'Hello world';
        const result = truncateText(value, value.length);

        assert.equal(result, value);
    });

    await t.test('should truncate text exceeding the maximum length', () => {
        const result = truncateText('Hello world', 8);

        assert.equal(result, 'Hello...');
        assert.equal(result.length, 8);
    });
});