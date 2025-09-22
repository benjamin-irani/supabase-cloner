/**
 * Entity Relationship Diagram (ERD) Component
 * Interactive database schema visualization using React Flow
 */

'use client';

import { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  Panel,
} from '@xyflow/react';
import * as dagre from 'dagre';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  Key,
  Columns,
  Shield,
  Download,
  ZoomIn,
  ZoomOut,
  Maximize,
} from 'lucide-react';
import type { DatabaseTable, DatabaseColumn } from '@/types';

import '@xyflow/react/dist/style.css';

interface ERDDiagramProps {
  tables: DatabaseTable[];
  onTableSelect?: (tableName: string) => void;
  selectedTable?: string;
}

// Custom Table Node Component
function TableNode({ data }: { data: any }) {
  const { table, isSelected, onSelect } = data;

  const primaryKeys = table.columns.filter((col: DatabaseColumn) => col.is_primary_key);
  const foreignKeys = table.columns.filter((col: DatabaseColumn) => col.is_foreign_key);
  const regularColumns = table.columns.filter(
    (col: DatabaseColumn) => !col.is_primary_key && !col.is_foreign_key
  );

  return (
    <Card
      className={`min-w-[250px] cursor-pointer transition-all ${
        isSelected
          ? 'ring-2 ring-emerald-500 shadow-lg'
          : 'hover:shadow-md'
      }`}
      onClick={() => onSelect?.(table.name)}
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            <Table className="h-4 w-4" />
            <span>{table.name}</span>
          </div>
          <div className="flex items-center space-x-1">
            {table.rls_enabled && (
              <Shield className="h-3 w-3 text-green-600" />
            )}
            <Badge variant="secondary" className="text-xs">
              {table.row_count.toLocaleString()}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {/* Primary Keys */}
          {primaryKeys.length > 0 && (
            <div>
              {primaryKeys.map((column: DatabaseColumn) => (
                <div
                  key={column.name}
                  className="flex items-center space-x-2 text-xs py-1 px-2 bg-yellow-50 dark:bg-yellow-900/20 rounded"
                >
                  <Key className="h-3 w-3 text-yellow-600" />
                  <span className="font-medium">{column.name}</span>
                  <span className="text-slate-500">{column.data_type}</span>
                </div>
              ))}
            </div>
          )}

          {/* Foreign Keys */}
          {foreignKeys.length > 0 && (
            <div>
              {foreignKeys.map((column: DatabaseColumn) => (
                <div
                  key={column.name}
                  className="flex items-center space-x-2 text-xs py-1 px-2 bg-blue-50 dark:bg-blue-900/20 rounded"
                >
                  <Columns className="h-3 w-3 text-blue-600" />
                  <span className="font-medium">{column.name}</span>
                  <span className="text-slate-500">{column.data_type}</span>
                  {column.foreign_key_reference && (
                    <span className="text-blue-600 text-xs">
                      → {column.foreign_key_reference.table}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Regular Columns (show first 5) */}
          {regularColumns.length > 0 && (
            <div>
              {regularColumns.slice(0, 5).map((column: DatabaseColumn) => (
                <div
                  key={column.name}
                  className="flex items-center space-x-2 text-xs py-1 px-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded"
                >
                  <Columns className="h-3 w-3 text-slate-400" />
                  <span>{column.name}</span>
                  <span className="text-slate-500">{column.data_type}</span>
                  {!column.is_nullable && (
                    <span className="text-red-500 text-xs">NOT NULL</span>
                  )}
                </div>
              ))}
              {regularColumns.length > 5 && (
                <div className="text-xs text-slate-500 text-center py-1">
                  +{regularColumns.length - 5} more columns
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Node types
const nodeTypes = {
  table: TableNode,
};

// Auto-layout using Dagre
function getLayoutedElements(nodes: Node[], edges: Edge[]) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'TB', ranksep: 100, nodesep: 150 });

  nodes.forEach((node) => {
    g.setNode(node.id, { width: 250, height: 200 });
  });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = g.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - 125,
        y: nodeWithPosition.y - 100,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}

export function ERDDiagram({ tables, onTableSelect, selectedTable }: ERDDiagramProps) {
  // Create nodes from tables
  const initialNodes: Node[] = useMemo(() => {
    return tables.map((table, index) => ({
      id: table.name,
      type: 'table',
      position: { x: (index % 3) * 300, y: Math.floor(index / 3) * 250 },
      data: {
        table,
        isSelected: selectedTable === table.name,
        onSelect: onTableSelect,
      },
    }));
  }, [tables, selectedTable, onTableSelect]);

  // Create edges from foreign key relationships
  const initialEdges: Edge[] = useMemo(() => {
    const edges: Edge[] = [];
    
    tables.forEach((table) => {
      table.columns.forEach((column) => {
        if (column.is_foreign_key && column.foreign_key_reference) {
          const targetTable = column.foreign_key_reference.table;
          if (tables.some(t => t.name === targetTable)) {
            edges.push({
              id: `${table.name}-${targetTable}-${column.name}`,
              source: table.name,
              target: targetTable,
              type: 'smoothstep',
              animated: false,
              style: { stroke: '#64748b', strokeWidth: 2 },
              markerEnd: {
                type: 'arrowclosed',
                color: '#64748b',
              },
              label: column.name,
              labelStyle: { fontSize: '10px', fill: '#64748b' },
              labelBgStyle: { fill: 'white', fillOpacity: 0.8 },
            });
          }
        }
      });
    });

    return edges;
  }, [tables]);

  // Apply auto-layout
  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(() => {
    return getLayoutedElements(initialNodes, initialEdges);
  }, [initialNodes, initialEdges]);

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // Update nodes when selection changes
  useMemo(() => {
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        data: {
          ...node.data,
          isSelected: selectedTable === node.id,
        },
      }))
    );
  }, [selectedTable, setNodes]);

  const exportDiagram = () => {
    // In a real implementation, this would export the diagram as SVG or PNG
    console.log('Exporting ERD diagram...');
  };

  return (
    <div className="h-[600px] w-full border rounded-lg">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
      >
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            if (node.data?.isSelected) return '#10b981';
            return '#e2e8f0';
          }}
          nodeStrokeWidth={3}
          zoomable
          pannable
        />
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
        
        <Panel position="top-right" className="space-x-2">
          <Button size="sm" variant="outline" onClick={exportDiagram}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </Panel>

        <Panel position="bottom-right" className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-lg">
          <div className="space-y-2 text-xs">
            <div className="font-medium">Legend</div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded"></div>
              <span>Primary Key</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded"></div>
              <span>Foreign Key</span>
            </div>
            <div className="flex items-center space-x-2">
              <Shield className="h-3 w-3 text-green-600" />
              <span>RLS Enabled</span>
            </div>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}
