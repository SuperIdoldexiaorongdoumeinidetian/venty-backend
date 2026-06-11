#!/bin/bash
# Legt beim ersten Start des Containers die Test-Datenbank an (für Vitest-Integration-Tests).
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE DATABASE venty_test;
EOSQL

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname venty_test <<-EOSQL
    CREATE EXTENSION IF NOT EXISTS postgis;
EOSQL
