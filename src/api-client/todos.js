const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''

/**
 * @typedef {{ id: number, title: string, completed: boolean }} Todo
 * @typedef {{ detail?: string | { message?: string } | Array<{ msg?: string }> }} ApiErrorBody
 */

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    ...options,
  })

  if (response.status === 204) {
    return null
  }

  const contentType = response.headers.get('content-type') ?? ''
  const isJson = contentType.includes('application/json')
  const payload = isJson ? await response.json() : null

  if (!response.ok) {
    const message = getErrorMessage(payload) || `Request failed with status ${response.status}`
    throw new Error(message)
  }

  return payload
}

function getErrorMessage(payload) {
  if (!payload || typeof payload !== 'object') {
    return ''
  }

  const detail = payload.detail

  if (typeof detail === 'string') {
    return detail
  }

  if (Array.isArray(detail)) {
    return detail.map((item) => item?.msg).filter(Boolean).join(', ')
  }

  if (detail && typeof detail === 'object' && typeof detail.message === 'string') {
    return detail.message
  }

  return ''
}

/** @returns {Promise<Todo[]>} */
export function fetchTodos() {
  return request('/api/todos', { method: 'GET' })
}

/** @param {string} title @returns {Promise<Todo>} */
export function createTodo(title) {
  return request('/api/todos', {
    method: 'POST',
    body: JSON.stringify({ title }),
  })
}

/** @param {number} id @param {{title?: string, completed?: boolean}} updates @returns {Promise<Todo>} */
export function updateTodo(id, updates) {
  return request(`/api/todos/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  })
}

/** @param {number} id @returns {Promise<null>} */
export function deleteTodo(id) {
  return request(`/api/todos/${id}`, {
    method: 'DELETE',
  })
}
