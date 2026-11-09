-- Añade autenticación. No crea docentes ni modifica notas.
-- Ejecutar en el SQL Editor de la base/branch usada por DATABASE_URL.
BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER TABLE universidaduees.profesores
    ADD COLUMN IF NOT EXISTS dui varchar(9),
    ADD COLUMN IF NOT EXISTS contrasena_hash text;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'profesores_dui_formato'
        AND conrelid = 'universidaduees.profesores'::regclass
    ) THEN
        ALTER TABLE universidaduees.profesores ADD CONSTRAINT profesores_dui_formato
            CHECK (dui IS NULL OR dui ~ '^[0-9]{9}$');
    END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS profesores_dui_unico
    ON universidaduees.profesores(dui) WHERE dui IS NOT NULL;
CREATE TABLE IF NOT EXISTS universidaduees.sesiones_docentes (
    token_hash varchar(64) PRIMARY KEY CHECK (token_hash ~ '^[a-f0-9]{64}$'),
    profesor_id integer NOT NULL REFERENCES universidaduees.profesores(profesorid),
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL,
    CHECK (expires_at > created_at)
);
CREATE INDEX IF NOT EXISTS sesiones_docentes_profesor_idx
    ON universidaduees.sesiones_docentes(profesor_id);
CREATE INDEX IF NOT EXISTS sesiones_docentes_expiracion_idx
    ON universidaduees.sesiones_docentes(expires_at);
COMMIT;
-- Comprobación sin mostrar credenciales.
SELECT profesorid, nombre,
       (dui IS NOT NULL AND contrasena_hash IS NOT NULL) AS acceso_configurado
FROM universidaduees.profesores ORDER BY profesorid;
