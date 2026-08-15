/** Jobs App product copy: Chinese is the default and English is complete. */
export const zh = Object.freeze({
  title: '任务',
  description: '查看当前会话的后台任务。',
  listTitle: '当前会话的任务',
  listEmpty: '暂无任务',
  noSession: '未选择会话',
  openJob: '查看详情',
  backToList: '返回列表',
  close: '关闭应用',
  unavailableTitle: '任务不可用',
  unavailableDescription: '当前会话没有这个任务，地址保持不变。',
  kind: '类型',
  label: '标签',
  status: '状态',
  detail: '详情',
  duration: '耗时',
  'status.running': '运行中',
  'status.stopping': '正在停止',
  'status.completed': '已完成',
  'status.killed': '已取消',
  'status.failed': '已失败',
  'duration.seconds': '{seconds}秒',
  'duration.minutes': '{minutes}分{seconds}秒',
  'duration.hours': '{hours}小时{minutes}分',
  'duration.title.live': '已运行 {duration}',
  'duration.title.done': '耗时 {duration}',
  header: '任务应用',
  headerAria: '打开任务应用',
  actions: '扩展操作',
})

export const en = Object.freeze({
  title: 'Jobs',
  description: 'Inspect background jobs for the current session.',
  listTitle: 'Jobs in this session',
  listEmpty: 'No jobs',
  noSession: 'No session',
  openJob: 'Open details',
  backToList: 'Back to list',
  close: 'Close app',
  unavailableTitle: 'Job unavailable',
  unavailableDescription: 'This session has no job at this address. The URL is unchanged.',
  kind: 'Kind',
  label: 'Label',
  status: 'Status',
  detail: 'Detail',
  duration: 'Duration',
  'status.running': 'running',
  'status.stopping': 'stopping',
  'status.completed': 'completed',
  'status.killed': 'cancelled',
  'status.failed': 'failed',
  'duration.seconds': '{seconds}s',
  'duration.minutes': '{minutes}m {seconds}s',
  'duration.hours': '{hours}h {minutes}m',
  'duration.title.live': 'Running for {duration}',
  'duration.title.done': 'Took {duration}',
  header: 'Jobs',
  headerAria: 'Open Jobs app',
  actions: 'Extension actions',
})

export type JobsLocaleKey = keyof typeof zh

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    jobs: JobsLocaleKey
  }
}
