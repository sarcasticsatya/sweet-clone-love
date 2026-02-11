

## Plan: Clean Up All Orphaned Student Accounts

### What We'll Do

Delete all 24 orphaned student accounts (those with no `student_profiles` record and role = `student`). This will:
1. Remove their remaining data from `profiles`, `user_roles`, and any other tables
2. Delete their authentication accounts so they can no longer log in

The 2 admin accounts will be skipped.

### How

**New backend function: `supabase/functions/cleanup-orphaned-students/index.ts`**
- Verifies the caller is an admin
- Queries all user IDs from `profiles` that have NO matching `student_profiles` entry and have a `student` role
- For each orphaned user, deletes records from: `chat_messages`, `quiz_attempts`, `student_activity_logs`, `student_subject_access`, `student_purchases`, `user_roles`, `profiles`
- Deletes each user from the authentication system using `auth.admin.deleteUser()`
- Returns a count of deleted accounts

**`supabase/config.toml`**
- Register `cleanup-orphaned-students` with `verify_jwt = false`

**One-time execution**
- After deploying, we call the function once from the admin dashboard to clean up all 24 accounts
- The function can be reused in the future if orphans accumulate again

### Files

| File | Change |
|------|--------|
| `supabase/functions/cleanup-orphaned-students/index.ts` | New -- bulk cleanup function |
| `supabase/config.toml` | Register new function |

### Safety
- Admin accounts are explicitly excluded (only `student` role users are affected)
- Self-deletion is prevented
- Full server-side admin verification before any deletions

