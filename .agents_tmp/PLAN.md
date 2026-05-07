# 1. OBJECTIVE

修复 CocoaFocus 番茄钟应用中存在的 3 个 bug：
1. 切换"治愈音景"音效时页面/声音出现明显抖动
2. 自定义时长面板展开/收起导致页面布局发生位移
3. 倒计时结束时选中的白噪音音效没有自动停止

# 2. CONTEXT SUMMARY

- **项目**: React 18 + TypeScript + Vite 6 的单页应用，所有状态通过 React hooks 管理
- **相关文件**:
  - `src/App.tsx` — 主组件：包含音效切换、计时器逻辑、设置面板、布局结构
  - `src/audio.ts` — Web Audio API 引擎：管理音效的创建、播放、停止
  - `src/App.css` — 布局与动画样式
- **Bug 1 根因**：`handleSoundChange` 中直接调用 `audioRef.current.setSound()` 的同时，React 的 `useEffect` (依赖 `[sound, isRunning, volume]`) 也会触发 `engine.stop()` + `engine.setSound()`，造成了音效被停止后重新启动，产生中断和听觉抖动
- **Bug 2 根因**：设置面板 (`settings-panel`) 以条件渲染方式插入在 mode-bar 与 timer-card 之间，没有固定高度，展开/收起时导致后续元素（计时卡片）上下移动
- **Bug 3 根因**：计时结束的完成回调中执行了 `setIsRunning(false)` 但没有调用 `audioRef.current.stop()`；且没有任何 effect 监听 `isRunning` 变为 `false` 时停止音效

# 3. APPROACH OVERVIEW

三项修复互不依赖，可并行修改：

1. **音效抖动**：统一音效管理入口，移除 `handleSoundChange` 中对 `audioRef` 的直接调用，让 `useEffect` 完全接管音效的启停逻辑
2. **布局位移**：将设置面板使用 `position: absolute` 定位到 mode-bar 下方，使其脱离文档流，展开/收起不影响后续 DOM 流
3. **倒计时停音效**：新增一个 `useEffect` 监听 `isRunning` 变化，当 `isRunning` 从 `true`→`false` 时调用 `audioRef.current.stop()`

# 4. IMPLEMENTATION STEPS

### Step 1 — 修复音效切换抖动

- **目标**：消除声音切换时的中断/抖动
- **方法**：
  1. 在 `handleSoundChange` 中移除对 `audioRef.current.stop()` 和 `audioRef.current.setSound()` 的直接调用，只保留 `setSound(s)` 状态更新
  2. 优化现有的 `useEffect([sound, isRunning, volume])`：确保当 `sound` 变化时，是先 stop 再重新 setSound 的唯一入口
  3. 修复 `handleToggle` 中启动时的逻辑：不再直接调用 `audioRef.current.setSound()`，而是让 useEffect 处理
- **参考**：`src/App.tsx` 中 `handleSoundChange` (第 176-183 行)、`handleToggle` (第 153-167 行)、音效同步 useEffect (第 131-139 行)

### Step 2 — 修复设置面板布局位移

- **目标**：设置面板展开/收起时，下方的计时卡片不再上下移动
- **方法**：
  1. 在 `src/App.css` 中给 `.settings-panel` 或其上层容器添加 `position: relative`
  2. 将 `.settings-panel` 设置为 `position: absolute; top: calc(100% + 8px); left: 0; width: 100%;`，使其脱离文档流
  3. 给 mode-bar 的父容器（或 mode-bar 本身）添加 `position: relative` 作为参照
- **参考**：`src/App.tsx` 中 settings-panel 渲染位置 (第 240-274 行)、`src/App.css` 中 `.settings-panel` (第 215-234 行) 和 `.mode-bar` (第 143-154 行)

### Step 3 — 倒计时结束时停止音效

- **目标**：当倒计时自然结束、`isRunning` 变为 `false` 时，自动停止正在播放的音效
- **方法**：
  1. 新增一个 `useEffect`，依赖 `[isRunning]`：当 `isRunning` 为 `false` 时调用 `audioRef.current.stop()`
  2. 同时更新 `prevSound.current` 为 `'none'`，确保下次启动时音效状态重置正确
- **参考**：`src/App.tsx` 中现有音效同步 useEffect (第 131-139 行) 附近新增

# 5. TESTING AND VALIDATION

1. **Bug 1 验证**：
   - 点击"开始"→ 选择"林间落雨"→ 切换到"炉火微醺"→ 确认声音连续无中断
   - 再切换到"猫咪打呼噜"→ 确认无抖动
   - 多次快速来回切换，确认无异常

2. **Bug 2 验证**：
   - 点击齿轮图标打开设置面板 → 确认计时卡片位置不移动
   - 关闭设置面板 → 确认布局无跳动
   - 在不同浏览器窗口宽度下验证

3. **Bug 3 验证**：
   - 选择一个音效并启动计时 → 等待倒计时自然结束 → 确认音效自动停止（仅播放完成提示音 chime）
   - 启动计时 → 手动暂停 → 确认音效立即停止
   - 启动计时 → 手动重置 → 确认音效立即停止
