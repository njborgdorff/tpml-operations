import { Project, ProjectStatus, User, ProjectStatusHistory } from '@prisma/client'

export type ProjectWithHistory = Project & {
  user: User
  projectStatusHistory: (ProjectStatusHistory & {
    user: User
  })[]
}

export type ProjectCounts = {
  active: number
  finished: number
  total: number
}

export type FilterType = 'active' | 'finished'

export { ProjectStatus }