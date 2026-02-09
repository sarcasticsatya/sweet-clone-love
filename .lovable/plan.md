

## Fix: Assign Subjects to 5 Students with Completed Payments

There are **5 students** who completed their payment but never got subjects assigned (this happened before the triggers were added).

### Students to Fix

| Student | Course | Subjects to Assign |
|---------|--------|-------------------|
| `dcd827f9...` | English Medium | 6 English subjects |
| `0fc2b4d2...` | English Medium | 6 English subjects |
| `a8947f15...` | English Medium | 6 English subjects |
| `7123554f...` | Kannada Medium | 6 Kannada subjects |
| `862e32cf...` | Kannada Medium | 6 Kannada subjects |

### What will be done

Run a single database migration that inserts the correct subject access records for these 5 students based on their purchased bundle medium. Uses `ON CONFLICT DO NOTHING` to be safe.

### Technical Details

**Database Migration SQL:**

```text
-- Assign all English Medium subjects to 3 English Medium students
INSERT INTO student_subject_access (student_id, subject_id)
SELECT s.student_id, sub.id
FROM (VALUES 
  ('dcd827f9-ae0a-42cc-979f-db25d7aae491'::uuid),
  ('0fc2b4d2-4ab8-4834-91b6-d7480e6af6b5'::uuid),
  ('a8947f15-0cb3-4fd8-80dc-4f282bee7e9a'::uuid)
) AS s(student_id)
CROSS JOIN subjects sub
WHERE sub.medium = 'English'
ON CONFLICT (student_id, subject_id) DO NOTHING;

-- Assign all Kannada Medium subjects to 2 Kannada Medium students
INSERT INTO student_subject_access (student_id, subject_id)
SELECT s.student_id, sub.id
FROM (VALUES 
  ('7123554f-7266-4bed-9832-6aef418598a4'::uuid),
  ('862e32cf-e640-4237-b66e-809add14ebca'::uuid)
) AS s(student_id)
CROSS JOIN subjects sub
WHERE sub.medium = 'Kannada'
ON CONFLICT (student_id, subject_id) DO NOTHING;
```

This is a one-time data fix. Going forward, the triggers created in the previous update will automatically assign subjects when payment status changes to "completed".

