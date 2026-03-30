"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeResult = exports.SkipTestError = void 0;
class SkipTestError extends Error {
    constructor(message) {
        super(message);
        this.name = "SkipTestError";
    }
}
exports.SkipTestError = SkipTestError;
const makeResult = (test, status, startedAt, endedAt, retries, artifacts, error) => ({
    id: test.id,
    name: test.name,
    suite: test.suite,
    platform: test.platform,
    tags: test.tags,
    status,
    startedAt: new Date(startedAt).toISOString(),
    endedAt: new Date(endedAt).toISOString(),
    durationMs: endedAt - startedAt,
    retries,
    artifacts,
    error
});
exports.makeResult = makeResult;
