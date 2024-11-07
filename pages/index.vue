<script lang="ts" setup>
import type { Todo } from '~/types'

const {
  query: { data, state },
  createMutation: { formData, mutate: createTodo },
  updateMutation: { mutate: updateTodo },
  deleteMutation: { mutate: deleteTodo },
} = useOptimisticList<Todo>({
  queryKey: ['todos'],
  operations: {
    fetch: () => $fetch('/api/todos'),
    create: data => $fetch('/api/todos', { method: 'POST', body: { todo: data } }),
    update: (id, data) => $fetch(`/api/todos`, { method: 'PATCH', body: { id, updates: data } }),
    delete: id => $fetch(`/api/todos`, { method: 'DELETE', body: { id } }),
  },
  defaultFormData: {
    text: '',
    completed: false,
  },
  staleTime: 5000,
  autoRefetch: true,
  verbose: true,
})
</script>

<template>
  <div class="space-y-12">
    <div class="flex gap-2 w-full">
      <UInput
        v-model="formData.text"
        class="w-full"
        @keydown.enter="createTodo(formData)"
      />
      <UButton
        @click="createTodo(formData)"
      >
        Add
      </UButton>
    </div>

    <pre>{{ state }}</pre>

    <div class="flex flex-col gap-4">
      <UAlert
        v-for="todo in data"
        :key="todo.id"
        :title="todo.text"
        :color="todo.completed ? 'green' : 'blue'"
        :actions="[
          { label: 'Mark as completed', variant: 'soft', click: () => updateTodo({ id: todo.id, data: { completed: true } }) },
          { label: 'Delete', variant: 'soft', color: 'red', click: () => deleteTodo(todo.id) },
        ]"
      />
    </div>
  </div>
</template>
