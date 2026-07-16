import { expect, test } from '@playwright/test';

# AC-1: The frontend allows a user to create a todo item and see it appear in the todo list without a full page reload
# AC-2: The frontend allows a user to mark an existing todo as completed and the updated state is reflected in the UI
# AC-3: The frontend allows a user to delete an existing todo and the item is removed from the UI

test.describe('todo app core flows', () => {
  test('creates a todo and appends it to the list', async ({ page }) => {
    await page.route('**/api/todos', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ json: [] });
        return;
      }
      if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON();
        expect(body).toEqual({ title: 'Write tests' });
        await route.fulfill({ status: 201, json: { id: 1, title: 'Write tests', completed: false } });
        return;
      }
      await route.continue();
    });

    await page.goto('/');
    await page.getByLabel('Todo').fill('Write tests');
    await page.getByRole('button', { name: /add todo/i }).click();

    await expect(page.getByRole('listitem', { name: /Write tests/ })).toBeVisible();
  });

  test('toggles a todo completed state in the UI', async ({ page }) => {
    await page.route('**/api/todos', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ json: [{ id: 1, title: 'Read docs', completed: false }] });
        return;
      }
      if (route.request().method() === 'PATCH') {
        const body = route.request().postDataJSON();
        expect(body).toEqual({ completed: true });
        await route.fulfill({ json: { id: 1, title: 'Read docs', completed: true } });
        return;
      }
      await route.continue();
    });

    await page.goto('/');
    await page.getByRole('checkbox', { name: 'Read docs' }).check();

    await expect(page.getByRole('checkbox', { name: 'Read docs' })).toBeChecked();
  });

  test('deletes a todo and removes it from the UI', async ({ page }) => {
    await page.route('**/api/todos', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ json: [{ id: 1, title: 'Remove me', completed: false }] });
        return;
      }
      if (route.request().method() === 'DELETE') {
        await route.fulfill({ status: 204, body: '' });
        return;
      }
      await route.continue();
    });

    await page.goto('/');
    await page.getByRole('button', { name: /delete/i }).click();

    await expect(page.getByText('Remove me')).toHaveCount(0);
  });
});
