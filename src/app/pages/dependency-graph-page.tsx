import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Network, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { Button } from '@/app/components/ui/button';

interface GraphNode {
  id: string;
  label: string;
  type: string;
  x: number;
  y: number;
  cost?: number;
  status: 'healthy' | 'warning' | 'critical';
}

interface GraphEdge {
  from: string;
  to: string;
  label?: string;
}

const NODES: GraphNode[] = [
  { id: 'alb', label: 'ALB', type: 'Load Balancer', x: 400, y: 60, status: 'healthy' },
  { id: 'ec2-1', label: 'prod-api-1', type: 'EC2', x: 240, y: 160, cost: 72, status: 'healthy' },
  { id: 'ec2-2', label: 'prod-api-2', type: 'EC2', x: 400, y: 160, cost: 72, status: 'healthy' },
  { id: 'ec2-3', label: 'prod-ml', type: 'EC2 p3.8xl', x: 560, y: 160, cost: 890, status: 'warning' },
  { id: 'rds', label: 'prod-rds', type: 'RDS', x: 300, y: 280, cost: 640, status: 'warning' },
  { id: 's3', label: 'data-lake', type: 'S3', x: 500, y: 280, cost: 295, status: 'critical' },
  { id: 'lambda', label: 'data-processor', type: 'Lambda', x: 640, y: 280, cost: 12, status: 'healthy' },
  { id: 'elasticache', label: 'prod-cache', type: 'ElastiCache', x: 160, y: 280, cost: 48, status: 'healthy' },
  { id: 'sqs', label: 'job-queue', type: 'SQS', x: 560, y: 380, cost: 4, status: 'healthy' },
  { id: 'cloudfront', label: 'cdn', type: 'CloudFront', x: 400, y: 380, cost: 198, status: 'healthy' },
];

const EDGES: GraphEdge[] = [
  { from: 'alb', to: 'ec2-1', label: 'HTTP' },
  { from: 'alb', to: 'ec2-2', label: 'HTTP' },
  { from: 'alb', to: 'ec2-3', label: 'HTTP' },
  { from: 'ec2-1', to: 'rds', label: 'SQL' },
  { from: 'ec2-2', to: 'rds', label: 'SQL' },
  { from: 'ec2-1', to: 'elasticache', label: 'Cache' },
  { from: 'ec2-3', to: 's3', label: 'SDK' },
  { from: 'lambda', to: 's3', label: 'Read' },
  { from: 'lambda', to: 'sqs', label: 'Poll' },
  { from: 'ec2-2', to: 'sqs', label: 'Push' },
  { from: 'cloudfront', to: 's3', label: 'Origin' },
];

const TYPE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  'Load Balancer': { bg: '#8b5cf6', border: '#7c3aed', text: '#fff' },
  'EC2': { bg: '#f59e0b', border: '#d97706', text: '#fff' },
  'EC2 p3.8xl': { bg: '#ef4444', border: '#dc2626', text: '#fff' },
  'RDS': { bg: '#3b82f6', border: '#2563eb', text: '#fff' },
  'S3': { bg: '#22c55e', border: '#16a34a', text: '#fff' },
  'Lambda': { bg: '#ec4899', border: '#db2777', text: '#fff' },
  'ElastiCache': { bg: '#14b8a6', border: '#0d9488', text: '#fff' },
  'SQS': { bg: '#f97316', border: '#ea580c', text: '#fff' },
  'CloudFront': { bg: '#6366f1', border: '#4f46e5', text: '#fff' },
};

export function DependencyGraphPage() {
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const [zoom, setZoom] = useState(1);

  const totalCost = NODES.reduce((s, n) => s + (n.cost ?? 0), 0);

  const getNodeColor = (node: GraphNode) => TYPE_COLORS[node.type] ?? { bg: '#6b7280', border: '#4b5563', text: '#fff' };

  const getEdgePath = (from: GraphNode, to: GraphNode) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const mx = from.x + dx * 0.5;
    const my = from.y + dy * 0.5 - 20;
    return `M ${from.x} ${from.y + 20} Q ${mx} ${my} ${to.x} ${to.y - 20}`;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dependency Graph</h1>
          <p className="text-muted-foreground">Visualize how your cloud resources connect and depend on each other</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setZoom(z => Math.min(z + 0.1, 1.5))}><ZoomIn className="w-4 h-4" /></Button>
          <Button variant="outline" size="icon" onClick={() => setZoom(z => Math.max(z - 0.1, 0.5))}><ZoomOut className="w-4 h-4" /></Button>
          <Button variant="outline" size="icon" onClick={() => setZoom(1)}><RotateCcw className="w-4 h-4" /></Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Graph */}
        <Card className="lg:col-span-2 border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Resource Topology</CardTitle>
              <div className="flex items-center gap-3 flex-wrap">
                {Object.entries(TYPE_COLORS).slice(0, 5).map(([type, col]) => (
                  <div key={type} className="flex items-center gap-1.5">
                    {/* eslint-disable-next-line react/forbid-dom-props */}
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: col.bg }} />
                    <span className="text-[10px] text-muted-foreground">{type}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* eslint-disable-next-line react/forbid-dom-props */}
            <div className="bg-muted/20 rounded-xl overflow-hidden" style={{ height: '460px' }}>
              {/* eslint-disable-next-line react/forbid-dom-props */}
              <svg width="100%" height="100%" viewBox="0 0 800 460" style={{ transform: `scale(${zoom})`, transformOrigin: 'center', transition: 'transform 0.2s' }}>
                <defs>
                  <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                    <polygon points="0 0, 8 3, 0 6" fill="#6b7280" opacity="0.6" />
                  </marker>
                </defs>
                {/* Edges */}
                {EDGES.map((edge, i) => {
                  const from = NODES.find(n => n.id === edge.from)!;
                  const to = NODES.find(n => n.id === edge.to)!;
                  const fromSelected = selected?.id === from.id || selected?.id === to.id;
                  return (
                    <g key={i}>
                      <path
                        d={getEdgePath(from, to)}
                        fill="none"
                        stroke={fromSelected ? '#6366f1' : '#6b7280'}
                        strokeWidth={fromSelected ? 2 : 1}
                        strokeOpacity={fromSelected ? 0.9 : 0.4}
                        strokeDasharray={fromSelected ? 'none' : '4 3'}
                        markerEnd="url(#arrowhead)"
                      />
                    </g>
                  );
                })}
                {/* Nodes */}
                {NODES.map(node => {
                  const col = getNodeColor(node);
                  const isSelected = selected?.id === node.id;
                  const isConnected = selected ? EDGES.some(e => (e.from === selected.id && e.to === node.id) || (e.to === selected.id && e.from === node.id)) : false;
                  return (
                    <g key={node.id} className="cursor-pointer" onClick={() => setSelected(selected?.id === node.id ? null : node)}>
                      {isSelected && <rect x={node.x - 46} y={node.y - 26} width={92} height={52} rx="14" fill={col.bg} opacity="0.2" />}
                      {isConnected && <rect x={node.x - 42} y={node.y - 22} width={84} height={44} rx="12" stroke={col.bg} strokeWidth="1.5" fill="none" strokeDasharray="4" />}
                      <rect
                        x={node.x - 40} y={node.y - 20} width={80} height={40} rx="10"
                        fill={col.bg} stroke={isSelected ? '#fff' : col.border}
                        strokeWidth={isSelected ? 2.5 : 1}
                        opacity={selected && !isSelected && !isConnected ? 0.35 : 1}
                      />
                      <text x={node.x} y={node.y - 3} textAnchor="middle" fontSize="9" fontWeight="700" fill={col.text}>{node.label}</text>
                      <text x={node.x} y={node.y + 10} textAnchor="middle" fontSize="7.5" fill={col.text} opacity="0.8">{node.type}</text>
                      {node.cost && <text x={node.x} y={node.y + 22} textAnchor="middle" fontSize="7" fill={col.text} opacity="0.7">${node.cost}/mo</text>}
                      {node.status !== 'healthy' && (
                        <circle cx={node.x + 34} cy={node.y - 18} r={5} fill={node.status === 'critical' ? '#ef4444' : '#f59e0b'} stroke="#fff" strokeWidth="1.5" />
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
          </CardContent>
        </Card>

        {/* Side panel */}
        <div className="space-y-4">
          {selected ? (
            <Card className="border-border">
              <CardHeader><CardTitle className="text-base">Resource Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line react/forbid-dom-props */}
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: getNodeColor(selected).bg }}>
                    <Network className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold">{selected.label}</p>
                    <Badge variant="outline" className="text-xs">{selected.type}</Badge>
                  </div>
                </div>
                {selected.cost && (
                  <div className="p-3 rounded-xl bg-muted/50 border border-border">
                    <p className="text-xs text-muted-foreground">Monthly Cost</p>
                    <p className="text-xl font-bold">${selected.cost}/mo</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-2">Connected to:</p>
                  <div className="space-y-2">
                    {EDGES.filter(e => e.from === selected.id || e.to === selected.id).map((e, i) => {
                      const otherId = e.from === selected.id ? e.to : e.from;
                      const other = NODES.find(n => n.id === otherId)!;
                      return (
                        <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border">
                          {/* eslint-disable-next-line react/forbid-dom-props */}
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getNodeColor(other).bg }} />
                          <span className="text-xs font-medium">{other.label}</span>
                          {e.label && <Badge variant="outline" className="text-[10px] ml-auto">{e.label}</Badge>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border border-dashed">
              <CardContent className="py-12 text-center">
                <Network className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-medium">Click a node</p>
                <p className="text-xs text-muted-foreground">Select any resource to view its details and connections</p>
              </CardContent>
            </Card>
          )}

          {/* Stats */}
          <Card className="border-border">
            <CardHeader><CardTitle className="text-sm">Graph Summary</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: 'Total Resources', value: NODES.length },
                { label: 'Connections', value: EDGES.length },
                { label: 'Total Monthly Cost', value: `$${totalCost.toLocaleString()}` },
                { label: 'Warnings', value: NODES.filter(n => n.status !== 'healthy').length },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{label}</span>
                  <span className="text-sm font-semibold">{value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
