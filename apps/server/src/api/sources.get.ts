import { defineHandler } from 'nitro'
import { listSources } from '~/services/sources'

export default defineHandler(() => listSources())
