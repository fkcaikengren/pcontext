import {
  createTaskManager,
} from '@/modules/task/infrastructure/log-task'

import type { TaskDocDTO } from '@/modules/doc/doc.dto'

export const docTaskManager = createTaskManager<TaskDocDTO>()

if (process.env.NODE_ENV === 'development') {
  const task = docTaskManager.createTask({
    name: 'pcontext',
    source: 'git',
    url: 'https://github.com/fkcaikengren/pcontext',
  })

  task.log('info', 'generateGitRepositoryData: start ')

  task.log('info', 'generateGitRepositoryData: vector index created')
  task.log('info', {
    message: '[git info]: start to clone repository pcontext',
    data: {
      repo: 'https://github.com/fkcaikengren/pcontext',
      docCount: 10,
    },
  })

  task.log('info', {
    message: 'Indexed git repository pcontext successfully',
    data: {
      repo: 'https://github.com/fkcaikengren/pcontext',
      docCount: 10,
    },
  })

  task.log('info', {
    message: 'Add document successfully',
    data: {
      repo: 'https://github.com/fkcaikengren/pcontext',
      docCount: 10,
    },
  })
}
