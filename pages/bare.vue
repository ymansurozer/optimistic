<script lang="ts" setup>
const formData = ref('')
const queryCache = useQueryCache()
const { mutate } = useMutation({
  mutation: (data: string) => $fetch('/api/non-existent', { method: 'POST', body: { todo: data } }),

  onMutate: async (newData) => {
    try {
      const oldList = queryCache.getQueryData<string[]>(['todos']) || []
      const newItem = newData || ''
      const newList = [...oldList, newItem]

      queryCache.setQueryData(['todos'], newList)
      queryCache.cancelQueries({ key: ['todos'], exact: true })
      const context = { oldList, newItem, newList }
      console.log('>> Context from onMutate', context)
      return context
    }
    catch (error) {
      console.log('>> Error in onMutate', error)
    }
  },

  onSuccess(data, vars, context) {
    console.log('>> Context from onSuccess', context)

    const currentList = queryCache.getQueryData<string[]>(['todos']) || []
    const itemIndex = currentList.findIndex(item => item === context.newItem)
    if (itemIndex === -1) {
      return
    }

    const copy = currentList.slice()
    copy.splice(itemIndex, 1, data as string)
    queryCache.setQueryData(['todos'], copy)
  },

  onError: (error, variables, context) => {
    console.log('>> Context from onError', context)
    console.log('>> Variables', variables)

    if (!!context.newList && context.newList === queryCache.getQueryData<string[]>(['todos'])) {
      console.log('>> Will rollback')
      queryCache.setQueryData(['todos'], context.oldList)
    }
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
        v-model="formData"
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
  </div>
</template>
