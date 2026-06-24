-- =====================================================================
-- 001_extensions.sql
-- Extensions PostgreSQL requises
-- =====================================================================
-- pgcrypto : gen_random_uuid() pour les clés primaires UUID v4
-- citext    : type texte insensible à la casse (emails)
-- =====================================================================

create extension if not exists pgcrypto;
create extension if not exists citext;

-- Schéma applicatif dédié pour les fonctions helpers (évite de polluer public)
create schema if not exists app;

comment on schema app is 'Fonctions métier et helpers de sécurité de l''application syndic';
