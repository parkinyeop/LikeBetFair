import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';
import React from 'react';

interface ResizableMainLayoutProps {
  left: React.ReactNode;
  center: React.ReactNode;
  right: React.ReactNode;
}

export default function ResizableMainLayout({ left, center, right }: ResizableMainLayoutProps) {
  return (
    <PanelGroup direction="horizontal" className="h-screen w-full">
      <Panel defaultSize={18} minSize={10} maxSize={30} className="bg-white shadow-lg h-full" style={{}}>
        <div className="h-full">{left}</div>
      </Panel>
      <PanelResizeHandle className="w-2 cursor-col-resize bg-gray-200 hover:bg-blue-300 transition" />
      <Panel defaultSize={64} minSize={30} className="h-full" style={{}}>
        <div className="h-full">{center}</div>
      </Panel>
      <PanelResizeHandle className="w-2 cursor-col-resize bg-gray-200 hover:bg-blue-300 transition" />
      <Panel defaultSize={18} minSize={10} maxSize={30} className="bg-white h-full" style={{}}>
        <div className="h-full">{right}</div>
      </Panel>
    </PanelGroup>
  );
} 