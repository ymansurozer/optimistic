import { readFileSync, writeFileSync } from 'fs'
import { defineEventHandler, readBody } from 'h3'
import type { Todo } from '~/types'

export default defineEventHandler(async (event) => {
  // wait for 2 seconds
  await new Promise(resolve => setTimeout(resolve, 5000))

  // Get todo from request body
  const { id, updates } = await readBody<{ id: string, updates: Partial<Todo> }>(event)

  // Read existing todos
  const todosPath = './data/todos.json'
  let todos: Todo[] = []
  try {
    todos = JSON.parse(readFileSync(todosPath, 'utf-8'))
  }
  catch {
    throw createError({
      statusCode: 404,
      statusMessage: 'Todos file not found',
    })
  }

  // Find todo to update
  const todoIndex = todos.findIndex(todo => todo.id === id)
  if (todoIndex === -1) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Todo not found',
    })
  }

  // Update todo
  const updatedTodo = {
    ...todos[todoIndex],
    ...updates,
  }
  todos[todoIndex] = updatedTodo

  // Save updated todos
  writeFileSync(todosPath, JSON.stringify(todos, null, 2))

  return updatedTodo
})
