import { afterEach, assert, describe, expect, it, vi } from 'vitest'
import { page } from 'vitest/browser'
import { render } from 'vitest-browser-vue'
import { Result } from '@starter/result'
import {
  StorageQuotaExceeded,
  StorageUnavailable,
  type StorageWriteError,
} from '@starter/composables'
import { createIndexedDbNotes, createNotesService } from '../../notes'
import SettingsPage from './SettingsPage.vue'

const repositories: ReturnType<typeof createIndexedDbNotes>[] = []
describe('SettingsPage backups', () => {
  afterEach(() => {
    repositories.forEach((repository) => repository.close())
    repositories.length = 0
    vi.unstubAllGlobals()
  })
  async function setup(
    setTheme: (theme: string) => Result<void, StorageWriteError> = () =>
      Result.ok(),
  ) {
    vi.stubGlobal('__APP_VERSION__', 'test')
    const repository = createIndexedDbNotes({
      indexedDB,
      name: crypto.randomUUID(),
    })
    repositories.push(repository)
    const service = createNotesService({
      repository,
      now: Date.now,
      newId: () => crypto.randomUUID(),
    })
    await render(SettingsPage, {
      props: {
        theme: 'system',
        setTheme,
        service,
        pwa: {
          installed: { value: false },
          canInstall: { value: false },
          offlineReady: { value: true },
          checking: { value: false },
          status: { value: '' },
          install: async () => {},
          checkForUpdates: async () => {},
        },
      },
    })
    return service
  }

  it('saving the theme succeeds silently', async () => {
    await setup()
    await page.getByRole('radio', { name: 'Dark' }).click()
    await expect.element(page.getByTestId('theme-status')).toBeEmptyDOMElement()
  })

  it.each([
    [
      new StorageQuotaExceeded({ key: 'k' }),
      'Storage is full. This theme lasts until you close the app.',
    ],
    [
      new StorageUnavailable({ key: 'k' }),
      'This browser blocks saving. This theme lasts until you close the app.',
    ],
  ])('a failed theme save explains it (%s)', async (error, message) => {
    await setup(() => Result.err(error))
    await page.getByRole('radio', { name: 'Dark' }).click()
    await expect.element(page.getByText(message)).toBeVisible()
  })

  it('backup import reports invalid JSON, then safely adds copies and retains existing notes', async () => {
    const service = await setup()
    const created = await service.create({
      title: 'Keep me',
      body: 'Original content',
    })
    expect(created.isOk()).toBe(true)
    const backup = await service.exportData()
    assert(backup.isOk(), 'Unable to prepare backup')
    const input = page.getByLabelText('Choose a Fieldnotes backup')
    await input.upload(
      new File(['broken json'], 'broken.json', { type: 'application/json' }),
    )
    await expect.element(page.getByRole('alert')).toBeVisible()
    expect(page.getByRole('alert').element().textContent).toContain(
      'not readable JSON',
    )
    await input.upload(
      new File(
        [
          JSON.stringify({
            format: 'fieldnotes',
            version: 1,
            notes: backup.value,
          }),
        ],
        'backup.json',
        { type: 'application/json' },
      ),
    )
    await expect
      .poll(() => page.getByTestId('backup-status').element().textContent)
      .toContain('Imported 1 note as new copies')
    await expect.element(page.getByRole('alert')).not.toBeInTheDocument()
    const result = await service.list()
    assert(result.isOk(), 'Unable to read imported notes')
    expect(result.value).toHaveLength(2)
    expect(new Set(result.value.map((note) => note.id)).size).toBe(2)
    expect(result.value.every((note) => note.title === 'Keep me')).toBe(true)
  })

  it('a structurally invalid backup is rejected without changing notes', async () => {
    const service = await setup()
    await service.create({ title: 'Keep me', body: '' })
    await page.getByLabelText('Choose a Fieldnotes backup').upload(
      new File(
        [
          JSON.stringify({
            format: 'fieldnotes',
            version: 1,
            notes: [{ title: 'Incomplete' }],
          }),
        ],
        'invalid.json',
        { type: 'application/json' },
      ),
    )
    await expect.element(page.getByRole('alert')).toBeVisible()
    const result = await service.list()
    assert(result.isOk(), 'Unable to read existing notes')
    expect(result.value).toHaveLength(1)
    expect(result.value[0]?.title).toBe('Keep me')
  })
})
