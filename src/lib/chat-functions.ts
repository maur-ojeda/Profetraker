import type { ChatCompletionTool } from 'openai/resources/chat/completions'

const TIPOS_HITO = ['pme', 'evaluacion', 'simulacro', 'reunion_apoderados', 'dia_especial', 'feriado', 'otro'] as const

export const FUNCTIONS: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'listar_hitos',
      description: 'Lista los hitos del PME con filtros opcionales',
      parameters: {
        type: 'object',
        properties: {
          tipo: {
            type: 'string',
            enum: [...TIPOS_HITO],
            description: 'Filtrar por tipo de hito',
          },
          fecha_desde: {
            type: 'string',
            description: 'Filtrar desde esta fecha (YYYY-MM-DD)',
          },
          fecha_hasta: {
            type: 'string',
            description: 'Filtrar hasta esta fecha (YYYY-MM-DD)',
          },
          importante: {
            type: 'boolean',
            description: 'Filtrar solo hitos importantes',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'crear_hito',
      description: 'Crea un nuevo hito del PME',
      parameters: {
        type: 'object',
        properties: {
          titulo: { type: 'string', description: 'Título del hito' },
          tipo: { type: 'string', enum: [...TIPOS_HITO], description: 'Tipo de hito' },
          fecha: { type: 'string', description: 'Fecha del hito (YYYY-MM-DD)' },
          fecha_fin: { type: 'string', description: 'Fecha de fin si es un rango (YYYY-MM-DD)' },
          descripcion: { type: 'string', description: 'Descripción opcional del hito' },
          importante: { type: 'boolean', description: 'Si el hito es importante' },
        },
        required: ['titulo', 'tipo', 'fecha'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'editar_hito',
      description: 'Edita un hito existente del PME',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'ID del hito a editar' },
          titulo: { type: 'string', description: 'Nuevo título' },
          tipo: { type: 'string', enum: [...TIPOS_HITO], description: 'Nuevo tipo' },
          fecha: { type: 'string', description: 'Nueva fecha (YYYY-MM-DD)' },
          fecha_fin: { type: 'string', description: 'Nueva fecha de fin (YYYY-MM-DD)' },
          descripcion: { type: 'string', description: 'Nueva descripción' },
          importante: { type: 'boolean', description: 'Nuevo estado de importancia' },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'eliminar_hito',
      description: 'Elimina un hito del PME. Requiere confirmación del usuario.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'ID del hito a eliminar' },
        },
        required: ['id'],
      },
    },
  },
]
