import { NextRequest, NextResponse } from 'next/server'
import { nvidia, NVIDIA_MODEL } from '@/lib/gemini'
import { SYSTEM_PROMPT } from '@/lib/chat-prompt'
import { FUNCTIONS } from '@/lib/chat-functions'
import { supabase } from '@/lib/supabase'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'

export async function POST(request: NextRequest) {
  try {
    const { message, history } = await request.json()

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Mensaje vacío' }, { status: 400 })
    }

    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...(history || []).map((m: any) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      })),
      { role: 'user', content: message },
    ]

    const response = await nvidia.chat.completions.create({
      model: NVIDIA_MODEL,
      messages,
      tools: FUNCTIONS,
      tool_choice: 'auto',
      temperature: 0.1,
      max_tokens: 1024,
    })

    const choice = response.choices[0]
    const toolCalls = choice.message.tool_calls

    if (toolCalls && toolCalls.length > 0) {
      const toolResults = await Promise.all(
        toolCalls.map(async (tc) => {
          const fn = (tc as any).function
          const args = JSON.parse(fn.arguments)
          const result = await executeFunction(fn.name, args)
          return {
            role: 'tool' as const,
            tool_call_id: tc.id,
            content: JSON.stringify(result),
          }
        })
      )

      const finalResponse = await nvidia.chat.completions.create({
        model: NVIDIA_MODEL,
        messages: [
          ...messages,
          choice.message,
          ...toolResults,
        ],
        temperature: 0.1,
        max_tokens: 1024,
      })

      return NextResponse.json({ reply: finalResponse.choices[0].message.content })
    }

    return NextResponse.json({ reply: choice.message.content })
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
