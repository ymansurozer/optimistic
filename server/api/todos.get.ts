import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { dirname } from 'path'
import { defineEventHandler } from 'h3'
import type { Todo } from '~/types'

export default defineEventHandler(async () => {
  // Wait for 2 seconds
  await new Promise(resolve => setTimeout(resolve, 2000))

  // Set up path and ensure directory exists
  const todosPath = './data/todos.json'
  const dirPath = dirname(todosPath)

  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true })
  }

  let todos: Todo[] = []
  try {
    todos = JSON.parse(readFileSync(todosPath, 'utf-8'))
  }
  catch {
    // Create empty todos file if it doesn't exist
    writeFileSync(todosPath, JSON.stringify([], null, 2))
  }

  return todos
})
