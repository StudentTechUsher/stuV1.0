-- Enable Row Level Security on the profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own profile
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Policy: Users can insert their own profile (for new user registration)
CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Optional: Policy for deleting own profile (if needed)
CREATE POLICY "Users can delete own profile" ON profiles
    FOR DELETE USING (auth.uid() = id);

-- If you have other tables that reference users, add similar policies
-- Example for student table (if it exists):
-- ALTER TABLE student ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can view own student record" ON student
--     FOR SELECT USING (auth.uid() = profile_id);
-- CREATE POLICY "Users can update own student record" ON student
--     FOR UPDATE USING (auth.uid() = profile_id);

-- Example for grad_plan table:
-- ALTER TABLE grad_plan ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can view own grad plans" ON grad_plan
--     FOR SELECT USING (
--         auth.uid() IN (
--             SELECT profile_id FROM student WHERE id = grad_plan.student_id
--         )
--     );
-- CREATE POLICY "Users can create own grad plans" ON grad_plan
--     FOR INSERT WITH CHECK (
--         auth.uid() IN (
--             SELECT profile_id FROM student WHERE id = grad_plan.student_id
--         )
--     );
-- CREATE POLICY "Users can update own grad plans" ON grad_plan
--     FOR UPDATE USING (
--         auth.uid() IN (
--             SELECT profile_id FROM student WHERE id = grad_plan.student_id
--         )
--     );