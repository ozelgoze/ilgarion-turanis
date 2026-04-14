-- ============================================================
-- Public Read Access for Landing Page
-- Allow unauthenticated (anon) users to view open parties
-- and party member counts for the public party finder.
-- ============================================================

-- Allow anon users to read parties (landing page browsing)
DROP POLICY IF EXISTS "Anon can view parties" ON public.parties;
CREATE POLICY "Anon can view parties"
  ON public.parties FOR SELECT TO anon USING (true);

-- Allow anon users to read party members (for member counts)
DROP POLICY IF EXISTS "Anon can view party members" ON public.party_members;
CREATE POLICY "Anon can view party members"
  ON public.party_members FOR SELECT TO anon USING (true);

-- Allow anon users to read profiles (for creator callsigns on party cards)
DROP POLICY IF EXISTS "Anon can view profiles" ON public.profiles;
CREATE POLICY "Anon can view profiles"
  ON public.profiles FOR SELECT TO anon
  USING (true);

-- Allow anon users to read party ratings (for leader reputation on landing)
DROP POLICY IF EXISTS "Anon can view party ratings" ON public.party_ratings;
CREATE POLICY "Anon can view party ratings"
  ON public.party_ratings FOR SELECT TO anon USING (true);
