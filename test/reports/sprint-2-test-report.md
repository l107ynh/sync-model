# Sprint 2 Test Report

**Date**: 2026-04-04
**Sprint**: Sprint 2: 設定編輯 + History

## ALL TESTS PASSED

## Test Coverage Summary

| Test Type | Total | Passed | Failed | Skipped |
|-----------|-------|--------|--------|---------|
| API E2E (vitest) | 27 | 27 | 0 | 0 |
| Unit Tests | 14 | 14 | 0 | 0 |
| Browser E2E (Playwright) | 8 | 0 | 0 | 8 (deferred) |

## API E2E Test Results

### F-004: Settings Edit (`test/e2e/settings-edit.test.ts`)
- [x] WHEN PATCH /api/v1/settings/:id with valid data THEN returns updated setting
- [x] WHEN PATCH with invalid setting id THEN returns 404
- [x] WHEN PATCH with stale expected_updated_at THEN returns 409 Conflict
- [x] WHEN PATCH with deploy=false THEN setting.deploy becomes false
- [x] WHEN PATCH completes THEN change_history record created with correct diff
- [x] WHEN PATCH with reason THEN reason saved in change_history
- [x] WHEN PATCH with empty changes THEN returns 400
- [x] WHEN PATCH with gpu_memory_utilization=0 THEN correctly saves 0
- [x] WHEN PATCH /api/v1/settings/batch with multiple settings THEN all updated
- [x] WHEN batch PATCH exceeds limit THEN returns 400
- [x] WHEN batch PATCH with mixed valid/stale THEN partial success
- [x] WHEN batch PATCH with empty array THEN returns 400

### F-005: Change History (`test/e2e/history.test.ts`)
- [x] WHEN GET /api/v1/history THEN returns change history list sorted by date desc
- [x] WHEN GET /api/v1/history?setting_id=X THEN returns filtered history
- [x] WHEN GET /api/v1/history?change_type=UPDATE THEN returns only updates
- [x] WHEN GET /api/v1/history?from=date&to=date THEN returns date-range filtered
- [x] WHEN GET /api/v1/history/:id THEN returns single history with full diff
- [x] WHEN GET /api/v1/history with pagination THEN returns paginated results
- [x] WHEN GET /api/v1/settings/:id/history THEN returns setting-specific history
- [x] WHEN GET /api/v1/history/:id with invalid id THEN returns 404

### F-006: Version Compare (`test/e2e/compare.test.ts`)
- [x] WHEN GET /api/v1/compare?version_a=X&version_b=Y THEN returns comparison
- [x] WHEN compare two identical versions THEN diff is empty (all unchanged)
- [x] WHEN compare with environment filter THEN only that env's settings compared
- [x] WHEN compare with edition filter THEN only that edition's settings compared
- [x] WHEN version_a missing THEN returns 400
- [x] WHEN version not found THEN returns 404
- [x] WHEN compare same version THEN returns 400

### Unit Tests (`dev/__tests__/api/history.test.ts`)
- [x] 14 unit tests for history query logic — ALL PASSED

### Browser E2E (Playwright — Deferred)
- [ ] WHEN user clicks Edit THEN edit form opens (skipped)
- [ ] WHEN user changes deploy toggle THEN confirm dialog shows diff (skipped)
- [ ] WHEN user confirms edit THEN setting updated and table refreshed (skipped)
- [ ] WHEN user opens batch edit THEN checkbox column appears (skipped)
- [ ] WHEN user visits history page THEN timeline displayed (skipped)
- [ ] WHEN user expands history item THEN diff viewer shown (skipped)
- [ ] WHEN user visits compare page THEN version selectors shown (skipped)
- [ ] WHEN user compares versions THEN side-by-side diff displayed (skipped)

## Scenario Coverage

| Feature | Scenarios in Spec | Tests Written | Coverage |
|---------|-------------------|---------------|----------|
| F-004 | 12 | 12 | 100% |
| F-005 | 8 | 8 | 100% |
| F-006 | 7 | 7 | 100% |
| **Total** | **27** | **27** | **100%** |
