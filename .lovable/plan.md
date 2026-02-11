

## Fix: Fully Revoke Student Access on Delete

### Problem
When an admin deletes a student from the Students page, only their public data (profile, access, messages, quiz attempts) is removed. The student's authentication account remains active, allowing them to log back in.

### Solution
Create a new backend function that uses admin privileges to delete the user from the authentication system. The admin page will call this function instead of manually deleting records one by one.

### Changes

**New file: `supabase/functions/delete-student/index.ts`**
- Accepts a `userId` in the request body
- Validates the caller is an admin (checks `user_roles` table)
- Deletes all related public data in order:
  1. `chat_messages`
  2. `quiz_attempts`
  3. `student_activity_logs`
  4. `student_subject_access`
  5. `student_purchases`
  6. `student_profiles`
  7. `user_roles`
  8. `profiles`
- Finally deletes the user from the authentication system using `auth.admin.deleteUser(userId)`
- This single call fully removes the student from the platform

**Updated: `supabase/config.toml`**
- Add `[functions.delete-student]` with `verify_jwt = false` (auth validated in code)

**Updated: `src/components/admin/ManageStudents.tsx`**
- Replace the manual table-by-table deletion logic in `handleDeleteStudent` with a single call to the `delete-student` backend function
- The function handles everything server-side, ensuring complete removal

### Why This Works
- The authentication system's admin API can only be called server-side with the service role key
- Client-side code has no permission to delete auth users
- By handling everything in one backend call, we guarantee the student cannot log in again after deletion

### Technical Details

| Component | Change |
|-----------|--------|
| `supabase/functions/delete-student/index.ts` | **New** -- backend function to fully delete a student |
| `src/components/admin/ManageStudents.tsx` | Call backend function instead of manual deletion |

