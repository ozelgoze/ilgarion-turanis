-- ============================================================
-- Star Citizen profile fields + fleet roster ship assignments
-- ============================================================

-- Add SC-specific profile fields
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS sc_handle text,
  ADD COLUMN IF NOT EXISTS primary_ship text,
  ADD COLUMN IF NOT EXISTS sc_org text;

-- Add ship assignment to team members (what ship they bring to this unit)
ALTER TABLE team_members
  ADD COLUMN IF NOT EXISTS assigned_ship text;

-- Add threat_level to maps (DEFCON-style alert status)
ALTER TABLE maps
  ADD COLUMN IF NOT EXISTS threat_level smallint NOT NULL DEFAULT 0;

COMMENT ON COLUMN profiles.sc_handle IS 'Star Citizen RSI handle / username';
COMMENT ON COLUMN profiles.primary_ship IS 'Primary ship the operative flies';
COMMENT ON COLUMN profiles.sc_org IS 'Star Citizen org affiliation / SID';
COMMENT ON COLUMN team_members.assigned_ship IS 'Ship this member brings to the unit';
COMMENT ON COLUMN maps.threat_level IS '0=GREEN, 1=YELLOW, 2=ORANGE, 3=RED';
