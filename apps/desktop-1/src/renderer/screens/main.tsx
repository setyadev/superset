import { useState } from 'react'

import { Sidebar } from 'renderer/components/Sidebar'
import { TopBar } from 'renderer/components/TopBar'
import TerminalComponent from 'renderer/components/Terminal'

export function MainScreen() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [activeTabId, setActiveTabId] = useState("1")

  return (
    <div className="flex h-screen bg-neutral-950 text-neutral-300">
      {/* Sidebar */}
      {isSidebarOpen && (
        <Sidebar
          onTabSelect={setActiveTabId}
          activeTabId={activeTabId}
          onCollapse={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <TopBar
          isSidebarOpen={isSidebarOpen}
          onOpenSidebar={() => setIsSidebarOpen(true)}
        />

        {/* Content Area - Terminal */}
        <div className="flex-1 overflow-hidden">
          <TerminalComponent />
        </div>
      </div>
    </div>
  )
}
