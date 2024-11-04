import { defineQuery, defineMutation, useQueryCache } from '@pinia/colada'

export interface OptimisticOptions<T, TId = string> {
  queryKey: string[]
  operations: CrudOperations<T, TId>
  defaultFormData: Omit<T, 'id'>
  staleTime?: number
  verbose?: boolean
}

export interface CrudOperations<T, TId = string> {
  fetch: () => Promise<T[]>
  create: (data: Omit<T, 'id'>) => Promise<T>
  update: (id: TId, data: Partial<T>) => Promise<T>
  delete: (id: TId) => Promise<boolean>
}

// Define the list query
export const defineListQuery = <T extends { id: TId }, TId = string>(
  options: OptimisticOptions<T, TId>,
) => defineQuery(() => {
  const query = useQuery({
    key: options.queryKey,
    query: options.operations.fetch,
    staleTime: options.staleTime || 5000,
  })
  return query
})

// Define the create mutation
export const defineCreateMutation = <T extends { id: TId }, TId = string>(
  options: OptimisticOptions<T, TId>,
) => defineMutation(() => {
  const queryCache = useQueryCache()

  const formData = ref<Omit<T, 'id'>>(structuredClone(options.defaultFormData))

  const mutation = useMutation({
    mutation: (data: Omit<T, 'id'>) => options.operations.create(data),

    onMutate: async (newData) => {
      // Reset form to allow the user to create new items right away
      formData.value = structuredClone(options.defaultFormData)

      // Take a snapshot of the list before the mutation
      const oldList = queryCache.getQueryData<T[]>(options.queryKey) || []

      // Create an optimistic item with a negative id to differentiate them from the server ones
      const newItem = {
        ...(newData || []),
        id: (-Date.now()).toString() as TId,
      } as T

      // Create a new list with the optimistic item
      const newList = [...oldList, newItem]

      // Update the cache with the new todo list
      queryCache.setQueryData(options.queryKey, newList)

      if (options.verbose) {
        console.log(`>> ${options.queryKey.join('.')}: Updating cache with new optimistic list`)
      }

      // TODO: Handle saving indicator for the optimistic item

      // Cancel (without refetching) the query so that it doesn't override the optimistic update
      queryCache.cancelQueries({ key: options.queryKey, exact: true })

      // Pass the old and new data to other hooks to handle rollbacks
      console.log('>> ', oldList, newItem, newList)
      return { oldList, newItem, newList }
    },

    onSuccess(data, vars, context) {
      if (options.verbose) {
        console.log(`>> ${options.queryKey.join('.')}: Updating optimistic item with server data`)
      }

      // Update the item with the information from the server.
      const currentList = queryCache.getQueryData<T[]>(options.queryKey) || []

      // Find the optimistic item and update it with the server data
      const itemIndex = currentList.findIndex(item => item.id === context.newItem.id)
      if (itemIndex === -1) {
        return
      }

      const copy = currentList.slice()
      copy.splice(itemIndex, 1, data)
      queryCache.setQueryData(options.queryKey, copy)
    },

    onError: (error, variables, context) => {
      if (options.verbose) {
        console.warn(`>> ${options.queryKey.join('.')}: Rolling back optimistic item`)
      }
      // FIXME: Context is not here
      console.log('>> Context', context)

      // oldList can be undefined if onMutate errors.
      // We also want to check if the oldList is still in the cache
      // because the cache could have been updated by another query.
      if (!!context.newList && context.newList === queryCache.getQueryData<T[]>(options.queryKey)) {
        console.log('>> Will rollback')
        queryCache.setQueryData(options.queryKey, context.oldList)
      }

      formData.value = structuredClone(context.newItem || variables)

      // TODO: Handle error
      console.error(error)
    },

    onSettled: () => {
      if (options.verbose) {
        console.log(`>> ${options.queryKey.join('.')}: Invalidate query to refetch the new data`)
      }

      // Invalidate the query to refetch the new data in any case
      queryCache.invalidateQueries({ key: options.queryKey })
    },
  })

  return {
    ...mutation,
    formData,
    resetFormData: () => {
      formData.value = options.defaultFormData
    },
  }
})

// Define the update mutation
export const defineUpdateMutation = <T extends { id: TId }, TId = string>(
  options: OptimisticOptions<T, TId>,
) => defineMutation(() => {
  const queryCache = useQueryCache()

  const mutation = useMutation({
    mutation: ({ id, data }: { id: TId, data: Partial<T> }) =>
      options.operations.update(id, data),

    onMutate: async ({ id, data }) => {
      // Take a snapshot of the list before the mutation
      const oldList = queryCache.getQueryData<T[]>(options.queryKey) || []

      // Find the item to update
      const itemToUpdateIndex = oldList.findIndex(item => item.id === id)
      if (itemToUpdateIndex === -1) {
        return
      }

      // Create a new list with the updated item
      let newList = oldList.slice()
      newList = newList.toSpliced(itemToUpdateIndex, 1, {
        ...newList[itemToUpdateIndex],
        ...data,
      })

      // Update the cache with the new list
      queryCache.setQueryData(options.queryKey, newList)

      if (options.verbose) {
        console.log(`>> ${options.queryKey.join('.')}: Updating cache with new optimistic list`)
      }

      // TODO: Handle saving indicator for the optimistic item

      // Cancel (without refetching) the query so that it doesn't override the optimistic update
      queryCache.cancelQueries({ key: options.queryKey, exact: true })

      return { oldList, newList }
    },

    onError: (error, variables, context) => {
      if (options.verbose) {
        console.warn(`>> ${options.queryKey.join('.')}: Rolling back optimistic item`)
      }

      // oldList can be undefined if onMutate errors.
      // We also want to check if the oldList is still in the cache
      // because the cache could have been updated by another query.
      if (!!context.newList && context.newList === queryCache.getQueryData<T[]>(options.queryKey)) {
        queryCache.setQueryData(options.queryKey, context.oldList)
      }

      // TODO: Handle error
      console.error(error)
    },

    onSettled: () => {
      if (options.verbose) {
        console.log(`>> ${options.queryKey.join('.')}: Invalidate query to refetch the new data`)
      }

      // Invalidate the query to refetch the new data in any case
      queryCache.invalidateQueries({ key: options.queryKey, exact: true })
    },
  })

  return mutation
})

// Define the delete mutation
export const defineDeleteMutation = <T extends { id: TId }, TId = string>(
  options: OptimisticOptions<T, TId>,
) => defineMutation(() => {
  const queryCache = useQueryCache()

  const mutation = useMutation({
    mutation: (id: TId) => options.operations.delete(id),

    onMutate: async (id) => {
      // Take a snapshot of the list before the mutation
      const oldList = queryCache.getQueryData<T[]>(options.queryKey) || []

      // Find the item to delete
      const itemToDeleteIndex = oldList.findIndex(item => item.id === id)
      if (itemToDeleteIndex === -1) {
        return
      }

      // Create a new list without the item to delete
      const newList = oldList.toSpliced(itemToDeleteIndex, 1)

      // Update the cache with the new list
      queryCache.setQueryData(options.queryKey, newList)

      if (options.verbose) {
        console.log(`>> ${options.queryKey.join('.')}: Updating cache with new optimistic list`)
      }

      // TODO: Handle saving indicator for the optimistic item

      // Cancel (without refetching) the query so that it doesn't override the optimistic update
      queryCache.cancelQueries({ key: options.queryKey, exact: true })

      return { oldList, newList }
    },

    onError: (error, variables, context) => {
      if (options.verbose) {
        console.warn(`>> ${options.queryKey.join('.')}: Rolling back optimistic item`)
      }

      // oldList can be undefined if onMutate errors.
      // We also want to check if the oldList is still in the cache
      // because the cache could have been updated by another query.
      if (!!context.newList && context.newList === queryCache.getQueryData<T[]>(options.queryKey)) {
        queryCache.setQueryData(options.queryKey, context.oldList)
      }

      // TODO: Handle error
      console.error(error)
    },

    onSettled: () => {
      if (options.verbose) {
        console.log(`>> ${options.queryKey.join('.')}: Invalidate query to refetch the new data`)
      }

      // Invalidate the query to refetch the new data in any case
      queryCache.invalidateQueries({ key: options.queryKey, exact: true })
    },
  })

  return mutation
})

// Main composable that uses all the defined queries and mutations
export function useOptimisticList<T extends { id: TId }, TId = string>(
  options: OptimisticOptions<T, TId>,
) {
  const useList = defineListQuery(options)
  const useCreate = defineCreateMutation(options)
  const useUpdate = defineUpdateMutation(options)
  const useDelete = defineDeleteMutation(options)

  const query = useList()
  const createMutation = useCreate()
  const updateMutation = useUpdate()
  const deleteMutation = useDelete()

  return {
    query,
    createMutation,
    updateMutation,
    deleteMutation,
  }
}
