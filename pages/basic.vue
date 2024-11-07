<script lang="ts" setup>
import type { Todo } from '~/types'

const { state } = useQuery({
  key: ['todos'],
  query: () => $fetch('/api/todos'),
  staleTime: 5000,
  autoRefetch: true,
})

const formData = ref<Omit<Todo, 'id'>>({
  text: '',
  completed: false,
})
const { mutate } = useMutation({
  mutation: (data: Omit<Todo, 'id'>) => $fetch('/api/non-existent', { method: 'POST', body: { todo: data } }),

  onMutate: () => {
    try {
      const context = { test: 'data' }
      console.log('>> Context from onMutate', context)
      return context
    }
    catch (error) {
      console.error('>> Error in onMutate', error)
      return { test: 'data' }
    }
  },

  onError: (error, variables, { test }) => {
    console.log('>> Context from onError', test)
    console.log('>> Variables', variables)
  },
})
</script>

<template>
  <div class="space-y-12">
    <div class="flex gap-2 w-full">
      <UInput
        v-model="formData.text"
        class="w-full"
        autofocus
        @keydown.enter="mutate(formData)"
      />
      <UButton
        @click="mutate(formData)"
      >
        Add
      </UButton>
    </div>

    <pre>{{ state }}</pre>
  </div>
</template>
