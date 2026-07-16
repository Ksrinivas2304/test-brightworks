import { useEffect, useMemo, useState } from 'react'
import { createTodo, deleteTodo, fetchTodos, updateTodo } from './api-client/todos'
import Todo from './components/Todo'

function App() {
  const [todos, setTodos] = useState([])
  const [title, setTitle] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [busyTodoIds, setBusyTodoIds] = useState([])

  const remainingCount = useMemo(
    () => todos.filter((todo) => !todo.completed).length,
    [todos],
  )

  const loadTodos = async () => {
    setIsLoading(true)
    setError('')

    try {
      const nextTodos = await fetchTodos()
      setTodos(Array.isArray(nextTodos) ? nextTodos : [])
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load todos.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadTodos()
  }, [])

  const handleCreate = async (event) => {
    event.preventDefault()

    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setActionError('Title is required.')
      return
    }

    setIsSubmitting(true)
    setActionError('')

    try {
      const newTodo = await createTodo(trimmedTitle)
      setTodos((currentTodos) => [newTodo, ...currentTodos])
      setTitle('')
    } catch (createError) {
      setActionError(createError instanceof Error ? createError.message : 'Unable to create todo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const withBusyTodo = async (id, action) => {
    setBusyTodoIds((current) => [...current, id])
    setActionError('')

    try {
      await action()
    } catch (todoError) {
      setActionError(todoError instanceof Error ? todoError.message : 'Unable to update todo.')
    } finally {
      setBusyTodoIds((current) => current.filter((busyId) => busyId !== id))
    }
  }

  const handleToggle = async (todo) => {
    await withBusyTodo(todo.id, async () => {
      const updatedTodo = await updateTodo(todo.id, { completed: !todo.completed })
      setTodos((currentTodos) =>
        currentTodos.map((item) => (item.id === todo.id ? updatedTodo : item)),
      )
    })
  }

  const handleDelete = async (id) => {
    await withBusyTodo(id, async () => {
      await deleteTodo(id)
      setTodos((currentTodos) => currentTodos.filter((todo) => todo.id !== id))
    })
  }

  return (
    <main className="app-shell">
      <section className="app-card">
        <div className="hero-row">
          <div>
            <p className="eyebrow">Todo dashboard</p>
            <h1>Stay on top of your tasks</h1>
            <p className="subtitle">Create, complete, and delete todos with instant updates.</p>
          </div>
          <button className="ghost-button" onClick={loadTodos} type="button" disabled={isLoading}>
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        <form className="todo-form" onSubmit={handleCreate}>
          <label className="sr-only" htmlFor="todo-title">Todo title</label>
          <input
            id="todo-title"
            className="todo-input"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Add a new todo"
            aria-required="true"
            disabled={isSubmitting}
          />
          <button className="primary-button" type="submit" disabled={isSubmitting} aria-disabled={isSubmitting}>
            {isSubmitting ? 'Adding...' : 'Add todo'}
          </button>
        </form>

        {actionError ? <p className="error-banner" role="alert">{actionError}</p> : null}
        {error ? (
          <div className="error-panel" role="alert">
            <p>{error}</p>
            <button className="ghost-button" onClick={loadTodos} type="button">Try again</button>
          </div>
        ) : null}

        {isLoading ? (
          <div className="skeleton-list" aria-hidden="true">
            <div className="skeleton-item" />
            <div className="skeleton-item" />
            <div className="skeleton-item" />
          </div>
        ) : (
          <>
            <div className="list-header">
              <p>{remainingCount} remaining</p>
              <p>{todos.length} total</p>
            </div>

            {todos.length === 0 ? (
              <div className="empty-state">
                <h2>No todos yet</h2>
                <p>Create your first task to get started.</p>
              </div>
            ) : (
              <ul className="todo-list">
                {todos.map((todo) => (
                  <Todo
                    key={todo.id}
                    todo={todo}
                    isBusy={busyTodoIds.includes(todo.id)}
                    onToggle={() => handleToggle(todo)}
                    onDelete={() => handleDelete(todo.id)}
                  />
                ))}
              </ul>
            )}
          </>
        )}
      </section>
    </main>
  )
}

export default App
