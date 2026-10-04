import { defineHandler } from 'nitro'
import { listProjects } from '../services/projects.js'

export default defineHandler(() => listProjects())
