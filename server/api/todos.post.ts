import { readFileSync, writeFileSync } from 'fs'
import { defineEventHandler, readBody } from 'h3'
import type { Todo } from '~/types'

export default defineEventHandler(async (event) => {
  // wait for 2 seconds
  await new Promise(resolve => setTimeout(resolve, 2000))

  // throw createError('Test error')

  // Get todo from request body
  const { todo } = await readBody<TodoPostBody>(event)

  // Read existing todos
  const todosPath = './data/todos.json'
  let todos = []
  try {
    todos = JSON.parse(readFileSync(todosPath, 'utf-8'))
  }
  catch {
    // If file doesn't exist, start with empty array
  }

  // Add new todo
  const newTodo = {
    id: Date.now().toString(),
    text: todo.text,
    completed: false,
  }
  todos.push(newTodo)

  // Save updated todos
  writeFileSync(todosPath, JSON.stringify(todos, null, 2))

  return newTodo
})

export interface TodoPostBody {
  todo: Omit<Todo, 'id'>
}
