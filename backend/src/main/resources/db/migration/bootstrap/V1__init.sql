-- V1 — baseline. Deliberately a no-op (S0.1 spec).
--
-- S0.1 ships no domain entities, so there is nothing to create. This migration exists to prove
-- the pipeline itself: Flyway is wired, runs on boot in every environment, and records its
-- history — verified before S0.2 bets the first real table (Traveler) on untested machinery.
--
-- Valid SQL that does nothing. Flyway records version 1 in flyway_schema_history.
SELECT 1;
