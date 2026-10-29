// DSH Web UI client half: Blockbench Agent 状态胶囊 + 实时预览窗。
// 状态与画面都来自 Host 插件的同源端点：/bb-agent/status、/bb-agent/live。
window.__ModuleLoader__.load({
  id: 'dsh-blockbench-live',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    const LIVE_INTERVAL_MS = 1500

    function useAgentStatus() {
      const [status, setStatus] = React.useState(null)
      const [error, setError] = React.useState(false)
      React.useEffect(() => {
        let alive = true
        let timer = null
        const poll = async () => {
          try {
            const response = await fetch('/bb-agent/status', { cache: 'no-store' })
            if (!response.ok) throw new Error(`HTTP ${response.status}`)
            const data = await response.json()
            if (alive) { setStatus(data); setError(false) }
          } catch {
            if (alive) setError(true)
          }
          if (alive) timer = setTimeout(poll, 2000)
        }
        poll()
        return () => { alive = false; if (timer) clearTimeout(timer) }
      }, [])
      return { status, error }
    }

    // 每 1.5s 拉一帧后台 Blockbench 画面；运行时未连上返回 204，保持上一帧。
    function useLiveFrame(active) {
      const [frame, setFrame] = React.useState({ url: null, revision: null })
      React.useEffect(() => {
        if (!active) return undefined
        let alive = true
        let timer = null
        let current = null
        const tick = async () => {
          try {
            const response = await fetch('/bb-agent/live', { cache: 'no-store' })
            if (response.status === 200) {
              const blob = await response.blob()
              if (alive && blob.size > 0) {
                const next = URL.createObjectURL(blob)
                if (current) URL.revokeObjectURL(current)
                current = next
                setFrame({ url: next, revision: response.headers.get('x-bb-revision') })
              }
            }
          } catch { /* 运行时不稳：保留上一帧 */ }
          if (alive) timer = setTimeout(tick, LIVE_INTERVAL_MS)
        }
        tick()
        return () => { alive = false; if (timer) clearTimeout(timer); if (current) URL.revokeObjectURL(current) }
      }, [active])
      return frame
    }

    function statusText(status, error) {
      if (error) return 'offline'
      const state = status?.state ?? 'starting'
      const revision = Number.isFinite(status?.revision) ? ` · r${status.revision}` : ''
      const gui = status?.gui_visible ? ' · GUI' : ''
      const verdict = status?.review?.verdict && status.review.verdict !== 'no_change_expected' ? ` · ${status.review.verdict}` : ''
      return `${state}${revision}${gui}${verdict}`
    }

    function initialOpen(expanded) {
      if (expanded) return true
      try { return localStorage.getItem('blockbench-live.preview.open') === '1' } catch { return false }
    }

    function AgentDock(props) {
      const { status, error } = useAgentStatus()
      const connected = !!status?.connected && !error
      const gui = !!status?.gui_visible
      const [open, setOpen] = React.useState(() => initialOpen(props?.expanded))
      const toggle = () => setOpen((value) => {
        const next = !value
        try { localStorage.setItem('blockbench-live.preview.open', next ? '1' : '0') } catch { /* 隐私模式 */ }
        return next
      })
      const frame = useLiveFrame(connected && open)

      const dotColor = error || (status && status.state === 'offline') ? 'var(--dsw-alias-state-error-primary)'
        : gui ? 'var(--dsw-alias-state-warn-primary)'
          : connected ? 'var(--dsw-alias-state-success-primary)'
            : 'var(--dsw-alias-state-idle-primary)'
      const title = status
        ? `Blockbench 实时 · ${status.state ?? 'starting'}\nworkspace: ${status.runtime?.workspace ?? ''}\npid: ${status.runtime?.child_pid ?? '-'}`
        : 'Blockbench 实时：等待状态…'

      const pill = h('button', {
        type: 'button',
        title,
        onClick: toggle,
        'aria-expanded': open,
        style: {
          display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer',
          padding: '2px 10px', borderRadius: 999, fontSize: 12, lineHeight: '18px',
          color: 'var(--dsw-alias-label-secondary)',
          background: 'var(--dsw-alias-bg-layer-1)',
          border: '1px solid var(--dsw-alias-border-l1)',
          whiteSpace: 'nowrap', font: 'inherit',
        },
      },
        h('span', {
          'aria-hidden': true,
          style: {
            width: 7, height: 7, borderRadius: '50%', flex: '0 0 auto', background: dotColor,
            boxShadow: connected && !gui ? '0 0 0 2px color-mix(in srgb, var(--dsw-alias-state-success-primary) 18%, transparent)' : 'none',
          },
        }),
        h('span', { style: { color: 'var(--dsw-alias-label-primary)', fontWeight: 500 } }, 'Blockbench'),
        h('span', null, statusText(status, error)),
        h('span', { 'aria-hidden': true, style: { opacity: 0.7 } }, open ? '▾' : '▸'),
      )

      if (!open) return h('div', { role: 'status', 'aria-live': 'polite' }, pill)

      const caption = !connected ? '未连接：启动运行时后这里会实时显示画面'
        : !frame.url ? '等待第一帧画面…'
          : `实时预览${frame.revision ? ` · r${frame.revision}` : ''}`

      return h('div', {
        role: 'status',
        'aria-live': 'polite',
        style: {
          display: 'inline-flex', flexDirection: 'column', gap: 6,
          padding: 8, borderRadius: 12,
          background: 'var(--dsw-alias-bg-layer-1)',
          border: '1px solid var(--dsw-alias-border-l1)',
          maxWidth: 460,
        },
      },
        pill,
        frame.url && h('img', {
          src: frame.url,
          alt: 'Blockbench 实时画面',
          style: {
            width: '100%', maxWidth: 440, borderRadius: 8, display: 'block',
            background: 'var(--dsw-alias-bg-base)', border: '1px solid var(--dsw-alias-border-l1)',
          },
        }),
        h('div', { style: { fontSize: 11, color: 'var(--dsw-alias-label-secondary)' } }, caption),
      )
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register({
          name: 'conversation.composer.dock',
          id: 'bb-agent-status',
          order: 10,
          label: 'Blockbench',
        }, AgentDock))
      },
    }
  },
})
