import React, { useState } from 'react';

export const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="flex h-full w-full">
      {/* LEFT PANEL: Map Layer Placeholder */}
      <div className="w-1/2 h-full border-r border-gray-800 bg-gray-900 flex items-center justify-center">
        <span className="text-xs font-mono text-gray-500 uppercase tracking-widest">
          [ Map Layer Canvas Placeholder ]
        </span>
      </div>

      {/* RIGHT PANEL: Controls */}
      <div className="w-1/2 h-full flex flex-col bg-gray-950">
        <div className="p-6 border-b border-gray-800 bg-gray-900/30">
          <span className="text-xs font-mono uppercase tracking-widest text-emerald-500">System Shell</span>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-1">Industrial Graph Manager</h1>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800 bg-gray-900/10 px-4">
          {['overview', 'maintenance', 'logs'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium border-b-2 capitalize transition-all ${
                activeTab === tab ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-gray-500'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex-1 p-6 overflow-y-auto">
          <p className="text-sm text-gray-400 font-mono">Workspace: {activeTab}</p>
        </div>
      </div>
    </div>
  );
};