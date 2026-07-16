function Todo({ todo, isBusy, onToggle, onDelete }) {
  return (
    <li className={`todo-item ${todo.completed ? 'is-complete' : ''}`}>
      <label className="todo-toggle-row">
        <input
          className="todo-checkbox"
          type="checkbox"
          checked={todo.completed}
          onChange={onToggle}
          disabled={isBusy}
          aria-label={`Mark ${todo.title} as ${todo.completed ? 'incomplete' : 'complete'}`}
        />
        <span className="todo-title">{todo.title}</span>
      </label>
      <button
        className="delete-button"
        type="button"
        onClick={onDelete}
        disabled={isBusy}
        aria-label={`Delete ${todo.title}`}
      >
        {isBusy ? 'Working...' : 'Delete'}
      </button>
    </li>
  )
}

export default Todo
