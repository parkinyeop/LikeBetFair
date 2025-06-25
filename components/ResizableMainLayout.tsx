import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';
import React from 'react';

interface ResizableMainLayoutProps {
  left: React.ReactNode;
  center: React.ReactNode;
  right: React.ReactNode;
}

export default function ResizableMainLayout({ left, center, right }: ResizableMainLayoutProps) {
  return (
    <PanelGroup direction="horizontal" className="h-full w-full">
      <Panel defaultSize={18} minSize={10} maxSize={30} className="bg-white shadow-lg">
        <div className="h-full flex flex-col min-h-0 overflow-y-auto">{left}</div>
      </Panel>
      <PanelResizeHandle className="w-2 cursor-col-resize bg-gray-200 hover:bg-blue-300 transition" />
      <Panel defaultSize={64} minSize={30}>
        <div className="h-full flex flex-col min-h-0 overflow-y-auto">{center}</div>
      </Panel>
      <PanelResizeHandle className="w-2 cursor-col-resize bg-gray-200 hover:bg-blue-300 transition" />
      <Panel defaultSize={18} minSize={10} maxSize={30} className="bg-white">
        <div className="h-full flex flex-col min-h-0 overflow-y-auto">{right}</div>
      </Panel>
    </PanelGroup>
  );
} 