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
    // Reset form to allow the user to create new items right away
    formData.value = {
      text: '',
      completed: false,
    }

    // Take a snapshot of the list before the mutation
    const oldList = queryCache.getQueryData<Todo[]>(['todos']) || []

    // Create an optimistic item with a negative id to differentiate them from the server ones
    const newItem = {
      ...(newData || []),
      id: (-Date.now()).toString(),
    }

    // Create a new list with the optimistic item
    const newList = [...oldList, newItem]

    // Update the cache with the new todo list
    queryCache.setQueryData(['todos'], newList)

    // console.log('>> Updating cache with new optimistic list')

    // TODO: Handle saving indicator for the optimistic item

    // Cancel (without refetching) the query so that it doesn't override the optimistic update
    queryCache.cancelQueries({ key: ['todos'], exact: true })

    // Pass the old and new data to other hooks to handle rollbacks
    console.log('>> Context from onMutate', oldList, newItem, newList)
    return { oldList, newItem, newList }
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

  onError: (error, variables, context) => {
    console.warn('>> Rolling back optimistic item')
    // FIXME: Context is not here
    console.log('>> Context from onError', context)

    // oldList can be undefined if onMutate errors.
    // We also want to check if the oldList is still in the cache
    // because the cache could have been updated by another query.
    if (!!context.newList && context.newList === queryCache.getQueryData<Todo[]>(['todos'])) {
      console.log('>> Will rollback')
      queryCache.setQueryData(['todos'], context.oldList)
    }

    formData.value = structuredClone(context.newItem || variables)

    // TODO: Handle error
    console.error(error)
  },

  onSettled: () => {
    // console.log('>> Invalidate query to refetch the new data')

    // Invalidate the query to refetch the new data in any case
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
