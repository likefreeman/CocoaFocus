export type NotifyMode = 'focus' | 'short' | 'long'

const MESSAGES: Record<NotifyMode, { title: string; body: string }> = {
  focus: {
    title: '🥥 专注完成！',
    body: '太棒了！休息一下，喝口水，伸个懒腰~',
  },
  short: {
    title: '☀️ 短休息结束',
    body: '准备好了吗？新一轮专注开始！',
  },
  long: {
    title: '🌿 长休息结束',
    body: '精力满满，继续加油！',
  },
}

export async function requestNotifyPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export function sendNotification(mode: NotifyMode): void {
  if (!('Notification' in window)) return
  if (Notification.permission !== 'granted') return
  const { title, body } = MESSAGES[mode]
  try {
    new Notification(title, {
      body,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      silent: true, // we play our own chime
    })
  } catch {}
}
