import { ref, type Ref } from 'vue'
import type { NotesService } from '../index'
const searches = new WeakMap<NotesService, Ref<string>>()
export function useNotesSearch(service: NotesService): Ref<string> {
  let search = searches.get(service)
  if (!search) {
    search = ref('')
    searches.set(service, search)
  }
  return search
}
