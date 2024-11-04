<script lang="ts" setup>
import type { Todo } from '~/types'

const { data, state } = useQuery({
  key: ['todos'],
  query: () => $fetch('/api/todos'),
})

const formData = ref<Omit<Todo, 'id'>>({
  text: '',
  completed: false,
})
const queryCache = useQueryCache()
const { mutate } = useMutation({
  mutation: (data: Omit<Todo, 'id'>) => $fetch('/api/todos', { method: 'POST', body: { todo: data } }),

  onMutate: async (newData) => {
    try {
      formData.value = {
        text: '',
        completed: false,
      }

      const oldList = queryCache.getQueryData<Todo[]>(['todos']) || []
      const newItem = {
        ...(newData || []),
        id: (-Date.now()).toString(),
      }
      const newList = [...oldList, newItem]
      queryCache.setQueryData(['todos'], newList)
      queryCache.cancelQueries({ key: ['todos'], exact: true })

      // Pass the old and new data to other hooks to handle rollbacks
      console.log('>> Context from onMutate', { oldList, newItem, newList })
      return { oldList, newItem, newList }
    }
    catch (error) {
      console.log('>> Error in onMutate', error)
    }
  },

  onSuccess(data, vars, context) {
    console.log('>> Context from onSuccess', context)
    console.log('>> Updating optimistic item with server data')

    // Update the item with the information from the server.
    const currentList = queryCache.getQueryData<Todo[]>(['todos']) || []

    // Find the optimistic item and update it with the server data
    const itemIndex = currentList.findIndex(item => item.id === context.newItem.id)
    if (itemIndex === -1) {
      return
    }

    const copy = currentList.slice()
    copy.splice(itemIndex, 1, data)
    queryCache.setQueryData(['todos'], copy)
  },

  onError: (error, variables, { oldList, newItem, newList }) => {
    // FIXME: Context is not here
    console.log('>> Context from onError', { oldList, newItem, newList })
    console.log('>> Variables', variables)

    if (!!newList && newList === queryCache.getQueryData<Todo[]>(['todos'])) {
      console.log('>> Will rollback')
      queryCache.setQueryData(['todos'], oldList)
    }

    formData.value = structuredClone(newItem || variables)
  },

  onSettled: () => {
    queryCache.invalidateQueries({ key: ['todos'] })
  },
})
</script>

<template>
  <div class="space-y-12">
    <div class="flex gap-2 w-full">
      <UInput
        v-model="formData.text"
        class="w-full"
        @keydown.enter="mutate(formData)"
      />
      <UButton
        @click="mutate(formData)"
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
          { label: 'Mark as completed', variant: 'soft' },
          { label: 'Delete', variant: 'soft', color: 'red' },
        ]"
      />
    </div>
  </div>
</template>
