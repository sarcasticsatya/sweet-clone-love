

## Admin-Configurable Course Features (Bullet Points)

Currently the 4 feature bullet points on each course card ("All subjects included", "Video lessons & AI tutoring", etc.) are hardcoded in `SelectCourse.tsx`. This plan makes them admin-configurable per course bundle, stored as a JSON array column.

---

### Changes

**1. Database Migration**

Add a `features` column (JSONB, max 4 items) to `course_bundles`:

```text
ALTER TABLE public.course_bundles
  ADD COLUMN features jsonb DEFAULT '["All subjects included", "Video lessons & AI tutoring", "Flashcards & quizzes", "Mind maps for each chapter"]'::jsonb;
```

This gives existing courses the current default features automatically.

**2. Admin ManageCourses Form (`src/components/admin/ManageCourses.tsx`)**

- Add a "Features" section in the create/edit dialog with 4 input fields labeled Feature 1 through Feature 4
- Each input is a simple text field (not a paragraph/textarea)
- Empty fields are excluded -- only non-empty features are saved
- Form state adds `features: string[]` (array of up to 4 strings)
- On save, features array is included in the payload as JSON
- Course table also shows a "Features" count column (e.g., "3 features")

**3. Student SelectCourse Page (`src/pages/SelectCourse.tsx`)**

- Update `CourseBundle` interface to include `features: string[] | null`
- Replace the 4 hardcoded `<Check>` items with a dynamic loop over `bundle.features`
- Fallback to the original 4 defaults if `features` is null or empty (for backward compatibility)

### Files Modified

- **Database migration** -- add `features` column
- `src/components/admin/ManageCourses.tsx` -- add 4 feature input fields in dialog
- `src/pages/SelectCourse.tsx` -- render features dynamically from bundle data
