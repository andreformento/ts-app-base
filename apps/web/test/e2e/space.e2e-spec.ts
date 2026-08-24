import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Continue with Google' }).click();
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();

  const listed = await page.request.get('/api/spaces');
  const { items } = (await listed.json()) as { items: { id: string }[] };
  for (const item of items) await page.request.delete(`/api/spaces/${item.id}`);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
});

test('signs in through the provider and shows the empty state', async ({
  page,
}) => {
  await expect(
    page.getByText('You have no spaces yet. Create one above.'),
  ).toBeVisible();
});

test('creates a space and lists it', async ({ page }) => {
  await page.getByLabel('Name').fill('Example Space');
  await page.getByLabel('Description').fill('a trip');
  await page.getByRole('button', { name: 'Create space' }).click();

  await expect(page.getByText('Example Space', { exact: true })).toBeVisible();
  await expect(page.getByText('a trip', { exact: true })).toBeVisible();
});

test('shows the API validation error on the name field', async ({ page }) => {
  await page.getByLabel('Name').fill('a'.repeat(81));
  await page.getByRole('button', { name: 'Create space' }).click();

  await expect(page.getByRole('alert')).toContainText('at most 80 characters');
});

test('requires a name', async ({ page }) => {
  await page.getByRole('button', { name: 'Create space' }).click();
  await expect(page.getByRole('alert')).toContainText('Name is required.');
});

test('edits a space', async ({ page }) => {
  await createSpace(page, 'Example Space');

  await page.getByRole('button', { name: 'Edit Example Space' }).click();
  await page.getByLabel('Name').fill('Renamed Space');
  await page.getByRole('button', { name: 'Save changes' }).click();

  await expect(page.getByText('Renamed Space', { exact: true })).toBeVisible();
  await expect(page.getByText('Example Space', { exact: true })).toBeHidden();
});

test('deletes a space', async ({ page }) => {
  await createSpace(page, 'Example Space');

  await page.getByRole('button', { name: 'Delete Example Space' }).click();
  await expect(
    page.getByText('You have no spaces yet. Create one above.'),
  ).toBeVisible();
});

test('signing out returns to the sign-in screen', async ({ page }) => {
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(
    page.getByRole('link', { name: 'Continue with Google' }),
  ).toBeVisible();
});

test('the form is keyboard operable and free of accessibility violations', async ({
  page,
}) => {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);

  await page.getByLabel('Name').focus();
  await page.keyboard.type('Keyboard Space');
  await page.keyboard.press('Tab');
  await page.keyboard.type('typed with the keyboard');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');

  await expect(page.getByText('Keyboard Space', { exact: true })).toBeVisible();
});

async function createSpace(
  page: import('@playwright/test').Page,
  name: string,
): Promise<void> {
  await page.getByLabel('Name').fill(name);
  await page.getByRole('button', { name: 'Create space' }).click();
  await expect(page.getByText(name, { exact: true })).toBeVisible();
}
