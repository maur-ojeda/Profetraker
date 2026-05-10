-- Tabla: profesores
CREATE TABLE IF NOT EXISTS profesores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    telefono TEXT,
    departamento TEXT,
    cursos_asignados TEXT[], -- Array de códigos de curso (ej: ['MAT101', 'FIS202'])
    horario_habitual JSONB, -- Estructura: { lunes: [...], martes: [...] }
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    activo BOOLEAN DEFAULT TRUE
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_profesores_email ON profesores(email);
CREATE INDEX IF NOT EXISTS idx_profesores_activo ON profesores(activo) WHERE activo = true;
CREATE INDEX IF NOT EXISTS idx_profesores_departamento ON profesores(departamento);

-- Tabla: licencias
CREATE TABLE IF NOT EXISTS licencias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profesor_id UUID REFERENCES profesores(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL CHECK (tipo IN ('medica', 'prenatal', 'postnatal', 'personal', 'estudio')),
    fecha_desde DATE NOT NULL,
    fecha_hasta DATE NOT NULL,
    documento_adjunto TEXT, -- URL en Supabase Storage
    motivo TEXT,
    estado TEXT NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa', 'finalizada', 'pendiente')),
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_licencias_profesor_id ON licencias(profesor_id);
CREATE INDEX IF NOT EXISTS idx_licencias_fechas ON licencias(fecha_desde, fecha_hasta);
CREATE INDEX IF NOT EXISTS idx_licencias_estado ON licencias(estado);
CREATE INDEX IF NOT EXISTS idx_licencias_tipo ON licencias(tipo);

-- Tabla: permisos_administrativos
CREATE TABLE IF NOT EXISTS permisos_administrativos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profesor_id UUID REFERENCES profesores(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL CHECK (tipo IN ('dia_completo', 'medio_dia_AM', 'medio_dia_PM')),
    fecha DATE NOT NULL,
    motivo TEXT,
    autorizado_por UUID REFERENCES profesores(id), -- Quién autorizó el permiso
    estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobado', 'rechazado')),
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_permisos_profesor_id ON permisos_administrativos(profesor_id);
CREATE INDEX IF NOT EXISTS idx_permisos_fecha ON permisos_administrativos(fecha);
CREATE INDEX IF NOT EXISTS idx_permisos_estado ON permisos_administrativos(estado);
CREATE INDEX IF NOT EXISTS idx_permisos_tipo ON permisos_administrativos(tipo);

-- Tabla: ausencias
CREATE TABLE IF NOT EXISTS ausencias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profesor_id UUID REFERENCES profesores(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('con_aviso', 'sin_aviso')),
    justificacion TEXT,
    registrado_por UUID REFERENCES profesores(id), -- Quién registró la ausencia
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_ausencias_profesor_id ON ausencias(profesor_id);
CREATE INDEX IF NOT EXISTS idx_ausencias_fecha ON ausencias(fecha);
CREATE INDEX IF NOT EXISTS idx_ausencias_tipo ON ausencias(tipo);
CREATE INDEX IF NOT EXISTS idx_ausencias_sin_aviso ON ausencias(tipo) WHERE tipo = 'sin_aviso';

-- Tabla: reemplazos (para ausencias/licencias)
CREATE TABLE IF NOT EXISTS reemplazos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profesor_ausente_id UUID REFERENCES profesores(id) ON DELETE SET NULL,
    profesor_reemplazante_id UUID REFERENCES profesores(id) ON DELETE SET NULL,
    horas_asignadas INTEGER NOT NULL CHECK (horas_asignadas > 0 AND horas_asignadas <= 8),
    fecha DATE NOT NULL,
    estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'confirmado', 'completado', 'cancelado')),
    licencia_id UUID REFERENCES licencias(id) ON DELETE SET NULL,
    ausencia_id UUID REFERENCES ausencias(id) ON DELETE SET NULL,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Constraints para asegurar que tenga una referencia
ALTER TABLE reemplazos 
ADD CONSTRAINT IF NOT EXISTS chk_referencia 
CHECK ((licencia_id IS NOT NULL AND ausencia_id IS NULL) 
       OR (licencia_id IS NULL AND ausencia_id IS NOT NULL));

-- Índices
CREATE INDEX IF NOT EXISTS idx_reemplazos_profesor_ausente ON reemplazos(profesor_ausente_id);
CREATE INDEX IF NOT EXISTS idx_reemplazos_profesor_reemplazante ON reemplazos(profesor_reemplazante_id);
CREATE INDEX IF NOT EXISTS idx_reemplazos_fecha ON reemplazos(fecha);
CREATE INDEX IF NOT EXISTS idx_reemplazos_estado ON reemplazos(estado);
CREATE INDEX IF NOT EXISTS idx_reemplazos_licencia_id ON reemplazos(licencia_id);
CREATE INDEX IF NOT EXISTS idx_reemplazos_ausencia_id ON reemplazos(ausencia_id);

-- Tabla: horarios (clases regulares)
CREATE TABLE IF NOT EXISTS horarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profesor_id UUID REFERENCES profesores(id) ON DELETE CASCADE,
    dia_semana INTEGER NOT NULL CHECK (dia_semana >= 0 AND dia_semana <= 6), -- 0=domingo, 1=lunes, ..., 6=sábado
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    curso TEXT,
    materia TEXT,
    sala TEXT,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_horarios_profesor_id ON horarios(profesor_id);
CREATE INDEX IF NOT EXISTS idx_horarios_dia_hora ON horarios(dia_semana, hora_inicio, hora_fin);
CREATE INDEX IF NOT EXISTS idx_horarios_curso ON horarios(curso);

-- Tabla: auditoria_cambios (para tracking de cambios críticos)
CREATE TABLE IF NOT EXISTS auditoria_cambios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tabla_afectada TEXT NOT NULL,
    registro_id UUID NOT NULL,
    accion TEXT NOT NULL CHECK (accion IN ('INSERT', 'UPDATE', 'DELETE')),
    cambios JSONB, -- {campo: {antes: valor, después: valor}}
    realizado_por UUID REFERENCES profesores(id),
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auditoria_tabla ON auditoria_cambios(tabla_afectada);
CREATE INDEX IF NOT EXISTS idx_auditoria_fecha ON auditoria_cambios(creado_en);

-- Desactivar RLS temporalmente para desarrollo
ALTER TABLE profesores DISABLE ROW LEVEL SECURITY;
ALTER TABLE licencias DISABLE ROW LEVEL SECURITY;
ALTER TABLE permisos_administrativos DISABLE ROW LEVEL SECURITY;
ALTER TABLE ausencias DISABLE ROW LEVEL SECURITY;
ALTER TABLE reemplazos DISABLE ROW LEVEL SECURITY;
ALTER TABLE horarios DISABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria_cambios DISABLE ROW LEVEL SECURITY;

-- Insertar datos de semilla
INSERT INTO profesores (nombre, email, telefono, departamento, cursos_asignados, horario_habitual) VALUES
('María González', 'm.gonzalez@colegio.edu', '+569 1234 5678', 'Matemática', ARRAY['MAT101', 'MAT202'], '{"lunes": [{"hora_inicio": "08:00", "hora_fin": "10:00", "curso": "MAT101", "sala": "A101"}], "miércoles": [{"hora_inicio": "10:00", "hora_fin": "12:00", "curso": "MAT202", "sala": "A102"}]}')
ON CONFLICT (email) DO NOTHING;

INSERT INTO profesores (nombre, email, telefono, departamento, cursos_asignados, horario_habitual) VALUES
('Carlos Rodríguez', 'c.rodriguez@colegio.edu', '+569 2345 6789', 'Lenguaje', ARRAY['LEN101', 'LEN202'], '{"martes": [{"hora_inicio": "08:00", "hora_fin": "10:00", "curso": "LEN101", "sala": "B101"}], "jueves": [{"hora_inicio": "10:00", "hora_fin": "12:00", "curso": "LEN202", "sala": "B102"}]}')
ON CONFLICT (email) DO NOTHING;

INSERT INTO profesores (nombre, email, telefono, departamento, cursos_asignados, horario_habitual) VALUES
('Ana López', 'a.lopez@colegio.edu', '+569 3456 7890', 'Ciencias', ARRAY['CIE101', 'CIE202'], '{"lunes": [{"hora_inicio": "10:00", "hora_fin": "12:00", "curso": "CIE101", "sala": "C101"}], "viernes": [{"hora_inicio": "08:00", "hora_fin": "10:00", "curso": "CIE202", "sala": "C102"}]}')
ON CONFLICT (email) DO NOTHING;

-- Licencia de ejemplo
INSERT INTO licencias (profesor_id, tipo, fecha_desde, fecha_hasta, motivo, estado)
SELECT id, 'medica', '2026-05-15', '2026-05-22', 'Reposo médico por lesión lumbar', 'activa'
FROM profesores WHERE nombre = 'María González'
ON CONFLICT DO NOTHING
LIMIT 1;

-- Permiso de ejemplo
INSERT INTO permisos_administrativos (profesor_id, tipo, fecha, motivo, estado, autorizado_por)
SELECT 
    p.id, 
    'medio_dia_AM', 
    '2026-05-20', 
    'Trámite personal', 
    'aprobado',
    (SELECT id FROM profesores WHERE nombre = 'Ana López' LIMIT 1) -- Autorizado por Ana López
FROM profesores p WHERE nombre = 'Carlos Rodríguez'
ON CONFLICT DO NOTHING
LIMIT 1;

-- Ausencia de ejemplo
INSERT INTO ausencias (profesor_id, fecha, tipo, justificacion, registrado_por)
SELECT 
    p.id, 
    '2026-05-18', 
    'sin_aviso', 
    'No se presentó ni avisó',
    (SELECT id FROM profesores WHERE nombre = 'Ana López' LIMIT 1) -- Registrado por Ana López
FROM profesores p WHERE nombre = 'Carlos Rodríguez'
ON CONFLICT DO NOTHING
LIMIT 1;
