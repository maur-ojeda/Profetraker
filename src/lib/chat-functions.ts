import { SchemaType, type FunctionDeclaration } from '@google/generative-ai'

export const FUNCTIONS: FunctionDeclaration[] = [
  {
    name: 'listar_hitos',
    description: 'Lista los hitos del PME con filtros opcionales',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        tipo: {
          type: SchemaType.STRING,
          enum: ['pme', 'evaluacion', 'simulacro', 'reunion_apoderados', 'dia_especial', 'feriado', 'otro'],
          format: 'enum',
          description: 'Filtrar por tipo de hito',
        },
        fecha_desde: {
          type: SchemaType.STRING,
          description: 'Filtrar desde esta fecha (YYYY-MM-DD)',
        },
        fecha_hasta: {
          type: SchemaType.STRING,
          description: 'Filtrar hasta esta fecha (YYYY-MM-DD)',
        },
        importante: {
          type: SchemaType.BOOLEAN,
          description: 'Filtrar solo hitos importantes',
        },
      },
    },
  },
  {
    name: 'crear_hito',
    description: 'Crea un nuevo hito del PME',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        titulo: {
          type: SchemaType.STRING,
          description: 'Título del hito',
        },
        tipo: {
          type: SchemaType.STRING,
          enum: ['pme', 'evaluacion', 'simulacro', 'reunion_apoderados', 'dia_especial', 'feriado', 'otro'],
          format: 'enum',
          description: 'Tipo de hito',
        },
        fecha: {
          type: SchemaType.STRING,
          description: 'Fecha del hito (YYYY-MM-DD)',
        },
        fecha_fin: {
          type: SchemaType.STRING,
          description: 'Fecha de fin si es un rango (YYYY-MM-DD)',
        },
        descripcion: {
          type: SchemaType.STRING,
          description: 'Descripción opcional del hito',
        },
        importante: {
          type: SchemaType.BOOLEAN,
          description: 'Si el hito es importante',
        },
      },
      required: ['titulo', 'tipo', 'fecha'],
    },
  },
  {
    name: 'editar_hito',
    description: 'Edita un hito existente del PME',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        id: {
          type: SchemaType.STRING,
          description: 'ID del hito a editar',
        },
        titulo: {
          type: SchemaType.STRING,
          description: 'Nuevo título',
        },
        tipo: {
          type: SchemaType.STRING,
          enum: ['pme', 'evaluacion', 'simulacro', 'reunion_apoderados', 'dia_especial', 'feriado', 'otro'],
          format: 'enum',
          description: 'Nuevo tipo',
        },
        fecha: {
          type: SchemaType.STRING,
          description: 'Nueva fecha (YYYY-MM-DD)',
        },
        fecha_fin: {
          type: SchemaType.STRING,
          description: 'Nueva fecha de fin (YYYY-MM-DD)',
        },
        descripcion: {
          type: SchemaType.STRING,
          description: 'Nueva descripción',
        },
        importante: {
          type: SchemaType.BOOLEAN,
          description: 'Nuevo estado de importancia',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'eliminar_hito',
    description: 'Elimina un hito del PME. Requiere confirmación del usuario.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        id: {
          type: SchemaType.STRING,
          description: 'ID del hito a eliminar',
        },
      },
      required: ['id'],
    },
  },
]
