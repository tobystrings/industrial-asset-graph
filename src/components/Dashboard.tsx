import React, { useState } from 'react';
import { useGetAssetGraphQuery } from '../store/apiSlice';
import { CompressionService } from '../services/compression';
import { Layers, Activity, FileText, Settings } from 'lucide-react';

type TabType = 'overview' | 'specs' | 'history' | 'jobs';

export const Dashboard: React.FC = () => {
  const { data: graphData, isLoading } = useGetAssetGraphQuery();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('zone_1'); 

  if (isLoading || !graphData) {
    return <div className="flex h-screen items-center justify-center bg-gray-950 text-white font-mono">Loading Industrial Asset Graph...</div>;
  }

  const selectedNode = selectedNodeId ? graphData.nodes[selectedNodeId] : null;
  
  // Dynamic extraction and client-side decompression of intricate machinery schemas
  const decompressedSpecs = selectedNode 
    ? CompressionService.decompress<{ model?: string; voltage?: string; hp?: string; safety?: string }>(selectedNode.compressedPayload)
    : null;

  return (
    <div className="flex h-screen w-screen bg-gray-950 text-gray-100 overflow-hidden">
      
      {/* LEFT SECTION: Mapping Workspace Container */}
      <div className="w-1/2 h-full border-r border-gray-800 bg-gray-900 flex flex-col items-center justify-center p-4 relative">
        <div className="absolute top-4 left-4 bg-gray-950/90 border border-gray-800 px-3 py-1.5 rounded text-xs font-mono text-emerald-400 backdrop-blur">
          FACILITY COORDINATE MAP VIEW
        </div>
        
        <div className="text-center space-y-4 max-w-md">
          <p className="text-sm text-gray-400">Select an area pin or perimeter bound to cross-reference equipment data nodes:</p>
          <div className="flex flex-col gap-2">
            <button 
              onClick={() => setSelectedNodeId('zone_1')}
              className={`px-4 py-3 rounded border text-left text-sm transition-all ${selectedNodeId === 'zone_1' ? 'bg-emerald-600/10 border-emerald-500 text-emerald-400' : 'bg-gray-950 border-gray-800 text-gray-400'}`}
            >
              🏢 Main Production Line (Zone 1 Perimeter)
            </button>
            <button 
              onClick={() => setSelectedNodeId('eq_204')}
              className={`px-4 py-3 rounded border text-left text-sm transition-all ${selectedNodeId === 'eq_204' ? 'bg-emerald-600/10 border-emerald-500 text-emerald-400' : 'bg-gray-950 border-gray-800 text-gray-400'}`}
            >
              ⚡ Rotary Air Compressor (Node EQ-204)
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT SECTION: Multi-Tab Detailed Asset Analytics */}
      <div className="w-1/2 h-full flex flex-col bg-gray-950">
        
        {/* Active Node Header */}
        <div className="p-6 border-b border-gray-800 bg-gray-900/30">
          <span className="text-xs font-mono uppercase tracking-widest text-emerald-500">{selectedNode?.type || 'SYSTEM'}</span>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-1">{selectedNode?.label || 'Select Infrastructure Component'}</h1>
        </div>

        {/* Tab Selection Menu Links */}
        <div className="flex border-b border-gray-800 bg-gray-900/10 px-4">
          {(['overview', 'specs', 'history', 'jobs'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 capitalize transition-all standard-tab ${
                activeTab === tab 
                  ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5' 
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              {tab === 'overview' && <Layers size={15} />}
              {tab === 'specs' && <Settings size={15} />}
              {tab === 'history' && <Activity size={15} />}
              {tab === 'jobs' && <FileText size={15} />}
              {tab}
            </button>
          ))}
        </div>

        {/* Display Content Container */}
        <div className="flex-1 p-6 overflow-y-auto">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-white">Zone Architecture Matrix</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-900/60 rounded-md border border-gray-800">
                  <div className="text-xs text-gray-400 uppercase font-mono tracking-wider">Status Index</div>
                  <div className="text-base font-medium text-emerald-400 mt-1">Operational</div>
                </div>
                <div className="p-4 bg-gray-900/60 rounded-md border border-gray-800">
                  <div className="text-xs text-gray-400 uppercase font-mono tracking-wider">Node Links</div>
                  <div className="text-base font-medium text-white mt-1">Graph Core Linked</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'specs' && (
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-white">Intricate Machine Specifications</h3>
              {decompressedSpecs && typeof decompressedSpecs === 'object' ? (
                <div className="bg-gray-900/60 rounded-md border border-gray-800 divide-y divide-gray-800 font-mono text-xs">
                  {Object.entries(decompressedSpecs).map(([key, value]) => (
                    <div key={key} className="flex justify-between p-3">
                      <span className="text-gray-400 uppercase">{key}</span>
                      <span className="text-emerald-400 font-medium">{String(value)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500 italic">No asset configuration specs available.</p>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-white">Maintenance History Log</h3>
              <div className="space-y-2">
                <div className="p-3 bg-gray-900/80 border-l-2 border-emerald-500 rounded-r text-xs">
                  <div className="flex justify-between text-gray-400 font-mono text-[10px]"><span>2026-05-12</span><span>Tech ID: TS</span></div>
                  <p className="text-gray-300 mt-1">Completed comprehensive PM runtime service cycle. Validated structural mounts and bearing clearances.</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'jobs' && (
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-white">Active Operational Work Orders</h3>
              <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-md flex justify-between items-center text-xs">
                <div>
                  <h4 className="font-semibold text-amber-400">WO-8842: Harmonic Calibration Check</h4>
                  <p className="text-gray-400 mt-0.5">Slight vibration variation noted during automated mechanical diagnostics scanning.</p>
                </div>
                <span className="px-2 py-0.5 text-[10px] font-mono bg-amber-500/10 text-amber-400 rounded border border-amber-500/20">PENDING</span>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
