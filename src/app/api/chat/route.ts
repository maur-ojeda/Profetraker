import { NextRequest, NextResponse } from 'next/server'
import { geminiModel } from '@/lib/gemini'
import { SYSTEM_PROMPT } from '@/lib/chat-prompt'
import { FUNCTIONS } from '@/lib/chat-functions'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { message, history } = await request.json()

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Mensaje vacío' }, { status: 400 })
    }

    // Construir historial del chat para Gemini
    const contents = (history || []).map((m: any) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }))
    contents.push({ role: 'user', parts: [{ text: message }] })

    // Primera llamada a Gemini con funciones habilitadas
    const chat = geminiModel.startChat({
      history: [
        { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
        { role: 'model', parts: [{ text: 'Entendido. Soy el asistente de Profe Tracker. Solo responderé sobre el calendario y eventos escolares.' }] },
        ...contents.slice(0, -1),
      ],
      tools: [{ functionDeclarations: FUNCTIONS }],
    })

    const result = await chat.sendMessage(message)
    const response = result.response
    const functionCalls = response.functionCalls()

    // Si Gemini llamó funciones, ejecutarlas y responder
    if (functionCalls && functionCalls.length > 0) {
      const fnResults = await Promise.all(
        functionCalls.map(async (fc) => {
          const result = await executeFunction(fc.name, fc.args)
          return { functionResponse: { name: fc.name, response: result } }
        })
      )

      const finalResult = await chat.sendMessage(fnResults)
      return NextResponse.json({ reply: finalResult.response.text() })
    }

    // Respuesta directa (consulta sin función)
    return NextResponse.json({ reply: response.text() })
  } catch (err: any) {
    console.error('Chat API error:', err)
    return NextResponse.json({ error: err.message || 'Error al procesar la consulta' }, { status: 500 })
  }
}

async function executeFunction(name: string, args: any) {
  try {
    switch (name) {
      case 'listar_hitos': {
        let query = supabase.from('hitos_pme').select('*').order('fecha', { ascending: true })
        if (args.tipo) query = query.eq('tipo', args.tipo)
        if (args.fecha_desde) query = query.gte('fecha', args.fecha_desde)
        if (args.fecha_hasta) query = query.lte('fecha', args.fecha_hasta)
        if (args.importante !== undefined) query = query.eq('importante', args.importante)
        const { data, error } = await query
        if (error) return { error: error.message }
        return { hitos: data || [] }
      }

      case 'crear_hito': {
        const { data, error } = await supabase
          .from('hitos_pme')
          .insert({
            titulo: args.titulo,
            tipo: args.tipo,
            fecha: args.fecha,
            fecha_fin: args.fecha_fin || null,
            descripcion: args.descripcion || null,
            importante: args.importante || false,
          })
          .select()
          .single()
        if (error) return { error: error.message }
        return { hito: data, message: 'Hito creado correctamente' }
      }

      case 'editar_hito': {
        const { id, ...updates } = args
        if (updates.fecha_fin === null) updates.fecha_fin = null
        if (updates.descripcion === null) updates.descripcion = null
        const { data, error } = await supabase
          .from('hitos_pme')
          .update(updates)
          .eq('id', id)
          .select()
          .single()
        if (error) return { error: error.message }
        return { hito: data, message: 'Hito actualizado correctamente' }
      }

      case 'eliminar_hito': {
        const { data, error } = await supabase
          .from('hitos_pme')
          .delete()
          .eq('id', args.id)
          .select()
          .single()
        if (error) return { error: error.message }
        return { message: `Hito "${data?.titulo}" eliminado` }
      }

      default:
        return { error: 'Función no reconocida' }
    }
  } catch (err: any) {
    return { error: err.message || 'Error al ejecutar la función' }
  }
}
