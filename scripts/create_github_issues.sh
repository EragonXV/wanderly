#!/usr/bin/env bash
set -euo pipefail

repo="EragonXV/wanderly"

create_issue() {
  local title="$1"
  local body="$2"
  gh issue create --repo "$repo" --title "$title" --body "$body"
}

create_issue "Trip Roles & Permission Matrix" "## Summary
Introduce trip roles (OWNER, ADMIN, MEMBER) and define permissions per trip area.

## Acceptance Criteria
- Unauthorized API actions return 403.
- UI hides/disables actions based on role.
- Owner can update roles of non-owner users.
- Existing trips have valid default roles after migration.

## Estimate
Story Points: 8"

create_issue "Backend Authorization Middleware for Trip APIs" "## Summary
Create centralized authorization middleware for all /api/trips/* endpoints.

## Acceptance Criteria
- All trip mutation endpoints enforce permission checks.
- Integration tests cover allow/deny cases.
- No duplicated inline permission logic remains.

## Estimate
Story Points: 5"

create_issue "Invitation Lifecycle with Status" "## Summary
Add invitation lifecycle: PENDING, ACCEPTED, DECLINED, EXPIRED.

## Acceptance Criteria
- Valid state transitions only.
- Expired invites cannot be accepted.
- Status visible in members management.

## Estimate
Story Points: 5"

create_issue "Invitation Reminder Action" "## Summary
Allow Owner/Admin to trigger reminders for pending invitations.

## Acceptance Criteria
- Only Owner/Admin can send reminders.
- Cooldown prevents reminder spam.
- UI shows success/error state.

## Estimate
Story Points: 3"

create_issue "Members Management UI: Invitation Statuses" "## Summary
Display invitation statuses and actions in trip member management.

## Acceptance Criteria
- Status badges are visible.
- Filter by status works.
- Actions: resend reminder, revoke invitation.

## Estimate
Story Points: 3"

create_issue "Trip Tasks: Data Model & CRUD API" "## Summary
Introduce trip tasks with CRUD API.

## Acceptance Criteria
- Tasks are trip-scoped and permission-protected.
- Create/update/delete with validation.
- List supports sort by due date/status.

## Estimate
Story Points: 8"

create_issue "Trip Tasks UI" "## Summary
Build tasks UI for create/edit/assign/status tracking.

## Acceptance Criteria
- Users can create and update tasks.
- Inline status changes work.
- Filters: offen, in Arbeit, erledigt.

## Estimate
Story Points: 5"

create_issue "Overview Snapshot for Open Tasks" "## Summary
Add open/total task snapshot to Trip Overview.

## Acceptance Criteria
- Counts are accurate and update after task changes.
- Snapshot links to task section/page.
- Empty state exists.

## Estimate
Story Points: 2"

create_issue "Activity Booking Status (Planned/Booked/Canceled)" "## Summary
Add booking status to itinerary activities.

## Acceptance Criteria
- Status persists and is editable.
- Canceled activities are visually distinct.
- Existing activities default to PLANNED.

## Estimate
Story Points: 5"

create_issue "Itinerary Filters by Booking Status" "## Summary
Add itinerary filtering by booking status.

## Acceptance Criteria
- Multi-status filter works.
- Filter state is preserved.
- Empty state for no matches.

## Estimate
Story Points: 3"

create_issue "In-App Notification Model & API" "## Summary
Introduce notifications backend for key trip events.

## Acceptance Criteria
- Events create notifications.
- Read state persists.
- Unread count endpoint is accurate.

## Estimate
Story Points: 5"

create_issue "Notification Center UI + Header Badge" "## Summary
Build notification center page and unread badge in header.

## Acceptance Criteria
- Badge updates after read actions.
- Notification list shows type + timestamp.
- Empty state exists.

## Estimate
Story Points: 3"

create_issue "Trip Audit Log for Critical Changes" "## Summary
Track audit events for critical trip operations.

## Acceptance Criteria
- Audit includes actor, action, entity, timestamp.
- Only Owner/Admin can access logs.
- Critical operations always create audit entries.

## Estimate
Story Points: 5"

create_issue "E2E Tests for Permissions & Invitations" "## Summary
Add E2E coverage for role permissions and invitation flows.

## Acceptance Criteria
- Owner/Admin/Member permission matrix covered.
- Invitation accept/decline/expire covered.
- Forbidden actions covered.

## Estimate
Story Points: 5"

create_issue "Migration & Backfill for New Trip Fields" "## Summary
Add schema migrations and backfill scripts for roles, invitations, tasks, statuses.

## Acceptance Criteria
- Existing data remains valid after migration.
- Backfill is idempotent.
- Rollout steps documented.

## Estimate
Story Points: 3"

echo "Done: Created 15 issues in $repo"
