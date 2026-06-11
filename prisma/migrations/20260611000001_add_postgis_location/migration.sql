-- Generated Column: hält `location` automatisch synchron zu latitude/longitude.
-- geography(Point, 4326) → ST_DWithin rechnet in Metern auf dem Sphäroid.
ALTER TABLE "Event"
  ADD COLUMN "location" geography(Point, 4326)
  GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint("longitude", "latitude"), 4326)::geography) STORED;

-- GiST-Index für schnelle Umkreissuchen (ST_DWithin)
CREATE INDEX "Event_location_idx" ON "Event" USING GIST ("location");
