-- Create tables for ProfeTracker

-- 1. Profesores
CREATE TABLE profesores (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre text NOT NULL,
    email text UNIQUE NOT NULL,
    telefono text,
    departamento text,
    cursos_asignados text[] DEFAULT '{}',
    horario_habitual jsonb DEFAULT '{}',
    activo boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

-- 2. Hitos PME
CREATE TABLE hitos_pme (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo text NOT NULL,
    descripcion text,
    fecha date NOT NULL,
    fecha_fin date,
    tipo text NOT NULL CHECK (tipo IN ('pme', 'evaluacion', 'simulacro', 'reunion_apoderados', 'dia_especial', 'feriado', 'otro')),
    importante boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

-- 3. Licencias
CREATE TABLE licencias (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    profesor_id uuid REFERENCES profesores(id) ON DELETE CASCADE,
    tipo text NOT NULL CHECK (tipo IN ('medica', 'prenatal', 'postnatal', 'personal', 'estudio')),
    fecha_desde date NOT NULL,
    fecha_hasta date NOT NULL,
    motivo text,
    documento_adjunto text,
    estado text DEFAULT 'activa' CHECK (estado IN ('activa', 'finalizada', 'cancelada')),
    created_at timestamptz DEFAULT now()
);

-- 4. Salidas pedagógicas
CREATE TABLE salidas_pedagogicas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    curso text NOT NULL,
    fecha date NOT NULL,
    hora_salida time,
    hora_regreso time,
    destino text,
    objetivo_pedagogico text,
    profesores_acompañantes uuid[] DEFAULT '{}',
    notas text,
    created_at timestamptz DEFAULT now()
);

-- 5. Reuniones
CREATE TABLE reuniones (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo text NOT NULL,
    tipo text NOT NULL CHECK (tipo IN ('departamento', 'general', 'apoderados', 'individual', 'coordinacion', 'otro')),
    fecha date NOT NULL,
    hora_inicio time,
    hora_fin time,
    lugar text,
    link_virtual text,
    participantes uuid[] DEFAULT '{}',
    responsable_id uuid REFERENCES profesores(id),
    temas_a_tratar jsonb DEFAULT '[]',
    acuerdos text,
    acta text,
    estado text DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'realizada', 'cancelada')),
    created_at timestamptz DEFAULT now()
);

-- 6. Ausencias
CREATE TABLE ausencias (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    profesor_id uuid REFERENCES profesores(id) ON DELETE CASCADE,
    fecha date NOT NULL,
    tipo text NOT NULL CHECK (tipo IN ('atraso', 'inasistencia', 'permiso')),
    justificacion text,
    created_at timestamptz DEFAULT now(),
    UNIQUE(profesor_id, fecha)
);

-- 7. Consejo de Profesores
CREATE TABLE consejo_profesores (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo text DEFAULT 'Consejo de Profesores',
    fecha date NOT NULL,
    hora_inicio time,
    hora_fin time,
    lugar text,
    responsables uuid[] DEFAULT '{}',
    temas_a_tratar jsonb DEFAULT '[]',
    created_at timestamptz DEFAULT now()
);

-- 8. Permisos administrativos
CREATE TABLE permisos_administrativos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    profesor_id uuid REFERENCES profesores(id) ON DELETE CASCADE,
    fecha date NOT NULL,
    tipo text NOT NULL CHECK (tipo IN ('administrativo', 'personal', 'capacitacion', 'otro')),
    motivo text,
    estado text DEFAULT 'aprobado' CHECK (estado IN ('aprobado', 'pendiente', 'rechazado', 'cancelado')),
    created_at timestamptz DEFAULT now()
);

-- 9. Reemplazos
CREATE TABLE reemplazos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    profesor_ausente_id uuid REFERENCES profesores(id) ON DELETE CASCADE,
    profesor_reemplazante_id uuid REFERENCES profesores(id) ON DELETE CASCADE,
    fecha date NOT NULL,
    horas_asignadas integer DEFAULT 1,
    licencia_id uuid REFERENCES licencias(id) ON DELETE SET NULL,
    ausencia_id uuid REFERENCES ausencias(id) ON DELETE SET NULL,
    notas text,
    created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security (opcional para MVP, todas las tablas públicas con service_role)
ALTER TABLE profesores ENABLE ROW LEVEL SECURITY;
ALTER TABLE hitos_pme ENABLE ROW LEVEL SECURITY;
ALTER TABLE licencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE salidas_pedagogicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE reuniones ENABLE ROW LEVEL SECURITY;
ALTER TABLE ausencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE consejo_profesores ENABLE ROW LEVEL SECURITY;
ALTER TABLE permisos_administrativos ENABLE ROW LEVEL SECURITY;
ALTER TABLE reemplazos ENABLE ROW LEVEL SECURITY;

-- Allow anon key to read/insert (MVP simplicity — lock down later)
CREATE POLICY "Allow anon all" ON profesores FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all" ON hitos_pme FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all" ON licencias FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all" ON salidas_pedagogicas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all" ON reuniones FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all" ON ausencias FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all" ON consejo_profesores FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all" ON permisos_administrativos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all" ON reemplazos FOR ALL USING (true) WITH CHECK (true);

-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;
