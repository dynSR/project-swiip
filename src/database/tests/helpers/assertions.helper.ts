import assert from 'node:assert/strict';

export function assertSqliteConstraintViolation(
    action: () => unknown,
    expectedMessage: string,
) {
    assert.throws(action, (error: unknown) => {
        return error instanceof Error
            && error.message.includes(expectedMessage);
    });
}