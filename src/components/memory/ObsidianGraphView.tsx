import React, { useEffect, useRef, useState, useMemo } from 'react';
import type { RecordField, DocumentItem, LifeStageCategory, ConfidenceType } from '../../types';
import { useNavigation } from '../../context/NavigationContext';
import {
  Fingerprint,
  GraduationCap,
  Briefcase,
  Wallet,
  HeartPulse,
  FileText,
  FileCheck,
  ShieldCheck,
  Search,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Copy,
  Check,
  MessageSquare,
  X,
  User,
} from 'lucide-react';

export interface GraphNode {
  id: string;
  label: string;
  sublabel?: string;
  value?: string;
  type: 'root' | 'category' | 'record' | 'document';
  category?: LifeStageCategory;
  confidence?: ConfidenceType;
  evidenceDoc?: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  letterInit?: string;
}

export interface GraphLink {
  source: string;
  target: string;
  type: 'root-to-cat' | 'cat-to-rec' | 'doc-to-rec' | 'cross-link';
  color?: string;
  isDashed?: boolean;
}

interface ObsidianGraphViewProps {
  records: RecordField[];
  documents: DocumentItem[];
  selectedCategory: LifeStageCategory | 'all';
  onSelectCategory: (cat: LifeStageCategory | 'all') => void;
  onOpenAddModal: () => void;
}

const CATEGORY_CONFIG: Record<
  LifeStageCategory,
  { label: string; initial: string; color: string; hubColor: string; icon: React.FC<{ className?: string }> }
> = {
  identity: {
    label: 'Identity & Facts',
    initial: 'F',
    color: '#f43f5e', // Pink/Red matching reference image
    hubColor: '#64748b',
    icon: Fingerprint,
  },
  education: {
    label: 'Education',
    initial: 'E',
    color: '#a855f7', // Purple
    hubColor: '#64748b',
    icon: GraduationCap,
  },
  employment: {
    label: 'Employment',
    initial: 'W',
    color: '#ec4899', // Pinkish Coral
    hubColor: '#64748b',
    icon: Briefcase,
  },
  finance: {
    label: 'Finance',
    initial: 'S',
    color: '#94a3b8', // Slate Blue
    hubColor: '#64748b',
    icon: Wallet,
  },
  healthcare: {
    label: 'Healthcare',
    initial: 'H',
    color: '#fb7185', // Rose Pink
    hubColor: '#64748b',
    icon: HeartPulse,
  },
};

export const ObsidianGraphView: React.FC<ObsidianGraphViewProps> = ({
  records,
  documents,
  selectedCategory,
  onSelectCategory,
}) => {
  const { userName, navigate } = useNavigation();
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Zoom and Pan State
  const [zoom, setZoom] = useState<number>(0.85);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Dragging & Active Node State
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [activeNode, setActiveNode] = useState<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showDocuments, setShowDocuments] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  // Internal Nodes & Links State
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [links, setLinks] = useState<GraphLink[]>([]);

  // Calculate Non-Overlapping Staggered Radial Layout
  useEffect(() => {
    const calculatedNodes: GraphNode[] = [];
    const calculatedLinks: GraphLink[] = [];

    // Center positioned with generous top headroom so nodes never clip under top bar
    const centerX = 500;
    const centerY = 410;

    // 1. Center User Root Node (Sky Blue Circle)
    const rootNode: GraphNode = {
      id: 'root-user',
      label: userName || 'Indresh',
      sublabel: 'User Vault Root',
      type: 'root',
      x: centerX,
      y: centerY,
      vx: 0,
      vy: 0,
      radius: 38,
      color: '#38bdf8',
    };
    calculatedNodes.push(rootNode);

    // 2. Category Hub Nodes in wide radial orbit
    const catKeys: LifeStageCategory[] = [
      'identity',
      'education',
      'employment',
      'healthcare',
      'finance',
    ];
    const catOrbitRadius = 210;

    const catAngles: Record<LifeStageCategory, number> = {
      identity: -Math.PI / 2,         // 12 o'clock (Top)
      education: -Math.PI / 6,        // 2 o'clock (Top-Right)
      employment: Math.PI / 3,        // 4 o'clock (Bottom-Right)
      healthcare: (3 * Math.PI) / 4,  // 7 o'clock (Bottom-Left)
      finance: -(3 * Math.PI) / 4,    // 10 o'clock (Top-Left)
    };

    catKeys.forEach((catKey) => {
      const angle = catAngles[catKey];
      const catX = centerX + Math.cos(angle) * catOrbitRadius;
      const catY = centerY + Math.sin(angle) * catOrbitRadius;

      const catNode: GraphNode = {
        id: `cat-${catKey}`,
        label: CATEGORY_CONFIG[catKey].label,
        sublabel: 'Category Cluster',
        letterInit: CATEGORY_CONFIG[catKey].initial,
        type: 'category',
        category: catKey,
        x: catX,
        y: catY,
        vx: 0,
        vy: 0,
        radius: 25,
        color: CATEGORY_CONFIG[catKey].hubColor,
      };
      calculatedNodes.push(catNode);

      // Link Root -> Category Hub
      calculatedLinks.push({
        source: 'root-user',
        target: `cat-${catKey}`,
        type: 'root-to-cat',
        color: '#475569',
      });

      // 3. Wide Outward Radial Fan & Dual Concentric Rings for Record Nodes
      const catRecords = records.filter((r) => r.category === catKey);
      // Wide 240-degree outward facing fan arc (Math.PI * 1.33)
      const fanAngleSpread = Math.PI * 1.33;

      catRecords.forEach((rec, recIdx) => {
        const offsetAngle =
          catRecords.length > 1
            ? (recIdx / (catRecords.length - 1) - 0.5) * fanAngleSpread
            : 0;
        const recAngle = angle + offsetAngle;

        // Dual concentric rings: alternate inner (140px) and outer (245px) to guarantee zero collisions!
        const recDistance = recIdx % 2 === 0 ? 140 : 245;

        const recX = catX + Math.cos(recAngle) * recDistance;
        const recY = catY + Math.sin(recAngle) * recDistance;

        const recNode: GraphNode = {
          id: rec.id,
          label: rec.fieldName,
          value: rec.value,
          sublabel: rec.source,
          type: 'record',
          category: rec.category,
          confidence: rec.confidence,
          evidenceDoc: rec.evidenceDocName,
          x: recX,
          y: recY,
          vx: 0,
          vy: 0,
          radius: 17,
          color: CATEGORY_CONFIG[catKey].color,
        };
        calculatedNodes.push(recNode);

        // Link Category -> Attribute Claim
        calculatedLinks.push({
          source: `cat-${catKey}`,
          target: rec.id,
          type: 'cat-to-rec',
          color: '#52525b',
        });

        // 4. Evidence Documents (Positioned with extra offset to prevent label collisions)
        if (showDocuments && rec.evidenceDocName) {
          const docId = `doc-${rec.id}`;
          const docAngle = recAngle + (recIdx % 2 === 0 ? 0.35 : -0.35);
          const docDistance = recDistance + 52;

          const docX = catX + Math.cos(docAngle) * docDistance;
          const docY = catY + Math.sin(docAngle) * docDistance;

          const docNode: GraphNode = {
            id: docId,
            label: rec.evidenceDocName,
            sublabel: 'Evidence PDF',
            value: rec.evidenceDocName,
            type: 'document',
            category: rec.category,
            x: docX,
            y: docY,
            vx: 0,
            vy: 0,
            radius: 13,
            color: '#10b981',
          };
          calculatedNodes.push(docNode);

          // Link Record -> Evidence Document (Dashed Blue Arrow)
          calculatedLinks.push({
            source: rec.id,
            target: docId,
            type: 'doc-to-rec',
            color: '#3b82f6',
            isDashed: true,
          });
        }
      });
    });

    setNodes(calculatedNodes);
    setLinks(calculatedLinks);
  }, [records, documents, userName, showDocuments]);

  // Node Map
  const nodeMap = useMemo(() => {
    const map = new Map<string, GraphNode>();
    nodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [nodes]);

  const connectedNodeIds = useMemo(() => {
    if (!hoveredNode && !activeNode) return null;
    const focusId = hoveredNode?.id || activeNode?.id;
    const set = new Set<string>();
    set.add(focusId!);

    links.forEach((l) => {
      if (l.source === focusId) set.add(l.target);
      if (l.target === focusId) set.add(l.source);
    });
    return set;
  }, [hoveredNode, activeNode, links]);

  const matchingNodeIds = useMemo(() => {
    if (!searchQuery.trim()) return new Set<string>();
    const q = searchQuery.toLowerCase();
    const matched = new Set<string>();
    nodes.forEach((n) => {
      if (
        n.label.toLowerCase().includes(q) ||
        (n.value && n.value.toLowerCase().includes(q)) ||
        (n.sublabel && n.sublabel.toLowerCase().includes(q))
      ) {
        matched.add(n.id);
      }
    });
    return matched;
  }, [nodes, searchQuery]);

  // Pan & Drag Handlers with Strict Bounding Limits
  const handleSvgMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'svg' || (e.target as HTMLElement).tagName === 'rect' || (e.target as HTMLElement).tagName === 'path') {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleNodeMouseDown = (e: React.MouseEvent, node: GraphNode) => {
    e.stopPropagation();
    setDraggedNodeId(node.id);
    setActiveNode(node);

    const rect = svgRef.current?.getBoundingClientRect();
    if (rect) {
      const mouseSvgX = (e.clientX - rect.left - pan.x) / zoom;
      const mouseSvgY = (e.clientY - rect.top - pan.y) / zoom;
      setDragOffset({ x: node.x - mouseSvgX, y: node.y - mouseSvgY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      const newPanX = Math.max(-280, Math.min(280, e.clientX - panStart.x));
      const newPanY = Math.max(-200, Math.min(200, e.clientY - panStart.y));
      setPan({ x: newPanX, y: newPanY });
    } else if (draggedNodeId) {
      const rect = svgRef.current?.getBoundingClientRect();
      if (rect) {
        const mouseSvgX = (e.clientX - rect.left - pan.x) / zoom;
        const mouseSvgY = (e.clientY - rect.top - pan.y) / zoom;

        // Bounding Box Clamp: Nodes can NEVER be dragged off top or sides
        const clampedX = Math.max(50, Math.min(950, mouseSvgX + dragOffset.x));
        const clampedY = Math.max(75, Math.min(740, mouseSvgY + dragOffset.y));

        setNodes((prev) =>
          prev.map((n) => {
            if (n.id === draggedNodeId) {
              return {
                ...n,
                x: clampedX,
                y: clampedY,
              };
            }
            return n;
          })
        );
      }
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggedNodeId(null);
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheelNonPassive = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.06 : 0.94;
      setZoom((prev) => Math.min(Math.max(prev * zoomFactor, 0.65), 1.6));
    };

    el.addEventListener('wheel', onWheelNonPassive, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheelNonPassive);
    };
  }, []);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev * 1.15, 1.6));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev / 1.15, 0.65));
  const handleReset = () => {
    setZoom(0.88);
    setPan({ x: 0, y: 0 });
    setActiveNode(null);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="relative w-full h-[720px] rounded-3xl border border-zinc-800 bg-[#09090e] overflow-hidden shadow-2xl select-none">
      {/* Top Floating Controls Bar */}
      <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2.5 pointer-events-none">
        {/* Category Filter */}
        <div className="flex items-center gap-1.5 p-1 rounded-full bg-zinc-900/95 backdrop-blur-md border border-white/10 shadow-lg pointer-events-auto overflow-x-auto max-w-full">
          <button
            onClick={() => onSelectCategory('all')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-[#5a25eb] text-white shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            All Vault ({nodes.length})
          </button>
          {(Object.keys(CATEGORY_CONFIG) as LifeStageCategory[]).map((cat) => {
            const conf = CATEGORY_CONFIG[cat];
            const Icon = conf.icon;
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => onSelectCategory(cat)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                  isSelected
                    ? 'text-white shadow-md'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
                style={{
                  backgroundColor: isSelected ? conf.color : 'transparent',
                }}
              >
                <Icon className="w-3 h-3" />
                <span className="hidden sm:inline">{conf.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search & View Controls */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search graph nodes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-full bg-zinc-900/95 backdrop-blur-md border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#5a25eb] w-36 sm:w-52 shadow-lg"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white text-xs cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowDocuments(!showDocuments)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer flex items-center gap-1.5 shadow-lg ${
              showDocuments
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                : 'bg-zinc-900/95 border-white/10 text-zinc-400 hover:text-white'
            }`}
            title="Toggle Source Document Nodes"
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Docs</span>
          </button>

          <div className="flex items-center rounded-full bg-zinc-900/95 backdrop-blur-md border border-white/10 p-0.5 shadow-lg">
            <button onClick={handleZoomIn} className="p-1.5 text-zinc-400 hover:text-white cursor-pointer" title="Zoom In">
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button onClick={handleZoomOut} className="p-1.5 text-zinc-400 hover:text-white cursor-pointer" title="Zoom Out">
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button onClick={handleReset} className="p-1.5 text-zinc-400 hover:text-white cursor-pointer" title="Reset View">
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Interactive SVG Canvas */}
      <div
        ref={containerRef}
        onMouseDown={handleSvgMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className="w-full h-full cursor-grab active:cursor-grabbing touch-none overflow-hidden"
      >
        <svg
          ref={svgRef}
          className="w-full h-full"
          viewBox="0 0 1000 800"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '500px 410px',
            transition: isPanning || draggedNodeId ? 'none' : 'transform 0.1s ease-out',
          }}
        >
          <defs>
            {/* Seamless SVG Dot Grid Pattern */}
            <pattern id="bg-dot-grid" width="28" height="28" patternUnits="userSpaceOnUse">
              <circle cx="14" cy="14" r="1.2" fill="rgba(255, 255, 255, 0.22)" />
            </pattern>

            <marker
              id="subtle-arrow"
              viewBox="0 0 10 10"
              refX="18"
              refY="5"
              markerWidth="4.5"
              markerHeight="4.5"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#64748b" />
            </marker>

            <marker
              id="subtle-arrow-highlight"
              viewBox="0 0 10 10"
              refX="18"
              refY="5"
              markerWidth="5.5"
              markerHeight="5.5"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#ffffff" />
            </marker>

            <filter id="glow-core" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Full-canvas seamless dot grid background */}
          <rect x="-1000" y="-1000" width="3000" height="3000" fill="url(#bg-dot-grid)" pointerEvents="none" />

          {/* 1. Connection Lines with Arrowheads */}
          <g className="obsidian-links">
            {links.map((link, idx) => {
              const srcNode = nodeMap.get(link.source);
              const tgtNode = nodeMap.get(link.target);
              if (!srcNode || !tgtNode) return null;

              const isFilteredOut =
                selectedCategory !== 'all' &&
                tgtNode.category &&
                tgtNode.category !== selectedCategory &&
                srcNode.category !== selectedCategory;

              const isConnected =
                !connectedNodeIds ||
                (connectedNodeIds.has(srcNode.id) && connectedNodeIds.has(tgtNode.id));

              const isSearchMatch =
                matchingNodeIds.size === 0 ||
                matchingNodeIds.has(srcNode.id) ||
                matchingNodeIds.has(tgtNode.id);

              const opacity = isFilteredOut
                ? 0.05
                : !isConnected
                ? 0.1
                : isSearchMatch
                ? 0.7
                : 0.25;

              const isHighlighted =
                activeNode?.id === srcNode.id ||
                activeNode?.id === tgtNode.id ||
                hoveredNode?.id === srcNode.id ||
                hoveredNode?.id === tgtNode.id;

              const strokeWidth = isHighlighted ? 2.5 : 1.4;
              const strokeColor = isHighlighted
                ? '#ffffff'
                : link.isDashed
                ? '#3b82f6'
                : link.color || '#475569';

              return (
                <line
                  key={`link-${idx}`}
                  x1={srcNode.x}
                  y1={srcNode.y}
                  x2={tgtNode.x}
                  y2={tgtNode.y}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  strokeDasharray={link.isDashed ? '4 4' : 'none'}
                  strokeOpacity={opacity}
                  markerEnd={isHighlighted ? 'url(#subtle-arrow-highlight)' : 'url(#subtle-arrow)'}
                />
              );
            })}
          </g>

          {/* 2. Graph Nodes & Always-Visible Non-Overlapping Labels */}
          <g className="obsidian-nodes">
            {nodes.map((node) => {
              const isSelected = activeNode?.id === node.id;
              const isHovered = hoveredNode?.id === node.id;
              const isConnected = !connectedNodeIds || connectedNodeIds.has(node.id);

              const isFilteredOut =
                selectedCategory !== 'all' &&
                node.type !== 'root' &&
                node.category !== selectedCategory;

              const isSearchMatch =
                matchingNodeIds.size === 0 || matchingNodeIds.has(node.id);

              const opacity = isFilteredOut
                ? 0.12
                : !isConnected
                ? 0.2
                : isSearchMatch
                ? 1
                : 0.4;

              return (
                <g
                  key={node.id}
                  className="obsidian-node-group cursor-pointer select-none"
                  transform={`translate(${node.x}, ${node.y})`}
                  opacity={opacity}
                  onMouseDown={(e) => handleNodeMouseDown(e, node)}
                  onMouseEnter={() => setHoveredNode(node)}
                  onMouseLeave={() => setHoveredNode(null)}
                >
                  {/* Outer Glow on Root / Active */}
                  {(node.type === 'root' || isSelected) && (
                    <circle
                      r={node.radius + 6}
                      fill={node.color}
                      fillOpacity={0.25}
                      filter="url(#glow-core)"
                    />
                  )}

                  {/* Main Node Circle */}
                  <circle
                    r={node.radius}
                    fill={
                      node.type === 'root'
                        ? '#38bdf8'
                        : node.type === 'category'
                        ? '#475569'
                        : node.type === 'document'
                        ? '#10b981'
                        : node.color
                    }
                    stroke={
                      node.type === 'category'
                        ? '#94a3b8'
                        : isSelected || isHovered
                        ? '#ffffff'
                        : node.color
                    }
                    strokeWidth={isSelected ? 3 : isHovered ? 2.5 : 2}
                  />

                  {/* Inner Symbol / Letter Initials */}
                  {node.type === 'root' && (
                    <User className="w-5 h-5 text-zinc-950 -translate-x-2.5 -translate-y-2.5" />
                  )}

                  {node.type === 'category' && (
                    <text
                      textAnchor="middle"
                      dy="4"
                      fill="#ffffff"
                      fontSize="14"
                      fontWeight="900"
                      fontFamily="sans-serif"
                    >
                      {node.letterInit}
                    </text>
                  )}

                  {node.type === 'document' && (
                    <text textAnchor="middle" dy="3.5" fill="#ffffff" fontSize="8.5" fontWeight="bold">
                      PDF
                    </text>
                  )}

                  {node.type === 'record' && (
                    <circle r={2.5} fill="#ffffff" />
                  )}

                  {/* High Contrast Background Badge + Text Label */}
                  <g transform={`translate(0, ${node.radius + 14})`}>
                    <text
                      textAnchor="middle"
                      fill={
                        node.type === 'root'
                          ? '#38bdf8'
                          : node.type === 'category'
                          ? '#ffffff'
                          : isSelected || isHovered
                          ? '#ffffff'
                          : '#e2e8f0'
                      }
                      fontSize={node.type === 'root' ? 12 : node.type === 'category' ? 11 : 9.5}
                      fontWeight={node.type === 'root' || node.type === 'category' || isSelected ? '700' : '600'}
                      className="pointer-events-none"
                      style={{
                        paintOrder: 'stroke fill',
                        stroke: '#09090e',
                        strokeWidth: '4px',
                        strokeLinejoin: 'round',
                      }}
                    >
                      {node.label.length > 22 ? `${node.label.substring(0, 20)}...` : node.label}
                    </text>
                  </g>

                  {/* Sublabel value */}
                  {node.value && node.type === 'record' && (
                    <g transform={`translate(0, ${node.radius + 25})`}>
                      <text
                        textAnchor="middle"
                        fill="#94a3b8"
                        fontSize="8"
                        className="pointer-events-none"
                        style={{
                          paintOrder: 'stroke fill',
                          stroke: '#09090e',
                          strokeWidth: '3px',
                          strokeLinejoin: 'round',
                        }}
                      >
                        {node.value.length > 22 ? `${node.value.substring(0, 20)}...` : node.value}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Bottom Floating Legend */}
      <div className="absolute bottom-3 left-3 z-20 flex items-center gap-3 p-2 rounded-2xl bg-zinc-900/90 backdrop-blur-md border border-white/10 text-[11px] text-zinc-400 shadow-xl pointer-events-auto">
        <div className="flex items-center gap-1.5 px-1.5">
          <span className="w-2 h-2 rounded-full bg-[#38bdf8]" />
          <span className="font-semibold text-white">{nodes.length} Nodes</span>
        </div>
        <div className="h-3 w-px bg-white/10" />
        <div className="flex items-center gap-1.5 px-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>{links.length} Links</span>
        </div>
        <div className="hidden sm:flex items-center gap-2.5 pl-2 border-l border-white/10">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#f43f5e]" /> Identity (F)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#a855f7]" /> Edu (E)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ec4899]" /> Emp (W)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#fb7185]" /> Health (H)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#94a3b8]" /> Fin (S)
          </span>
        </div>
      </div>

      {/* Floating Node Inspection Drawer */}
      {activeNode && (
        <div className="absolute bottom-3 right-3 z-30 w-80 max-w-[calc(100%-1.5rem)] p-4 rounded-2xl bg-zinc-900/95 backdrop-blur-xl border border-white/15 shadow-2xl space-y-3 text-xs text-zinc-200 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-start justify-between gap-2 border-b border-white/10 pb-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: activeNode.color }} />
              <div>
                <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-400">
                  {activeNode.type === 'root'
                    ? 'Vault Root'
                    : activeNode.type === 'category'
                    ? 'Category Hub'
                    : activeNode.type === 'document'
                    ? 'Evidence Document'
                    : `Memory Record (${activeNode.category})`}
                </span>
                <h4 className="font-bold text-sm text-white leading-tight">{activeNode.label}</h4>
              </div>
            </div>
            <button
              onClick={() => setActiveNode(null)}
              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            {activeNode.value && (
              <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-1">
                <span className="text-[10px] text-zinc-400 block font-medium">Stored Value</span>
                <p className="font-semibold text-white break-words text-sm">{activeNode.value}</p>
              </div>
            )}

            {activeNode.confidence && (
              <div className="flex items-center justify-between text-[11px] p-2 rounded-lg bg-white/5">
                <span className="text-zinc-400">Assurance:</span>
                <span
                  className={`font-semibold flex items-center gap-1 ${
                    activeNode.confidence === 'evidence-backed'
                      ? 'text-emerald-400'
                      : 'text-[#cbbeff]'
                  }`}
                >
                  <ShieldCheck className="w-3 h-3" />
                  {activeNode.confidence === 'evidence-backed'
                    ? 'Evidence-Backed Proof'
                    : 'User-Confirmed Self-Assertion'}
                </span>
              </div>
            )}

            {activeNode.evidenceDoc && (
              <div className="flex items-center justify-between text-[11px] p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                <span className="flex items-center gap-1">
                  <FileCheck className="w-3 h-3" /> Source File:
                </span>
                <span className="font-mono text-[10px] truncate max-w-[140px]">
                  {activeNode.evidenceDoc}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 pt-1">
            {activeNode.value && (
              <button
                onClick={() => handleCopy(activeNode.value!)}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-medium transition-colors cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Value</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={() => navigate('/chat')}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-[#5a25eb] hover:bg-[#6b37fa] text-white text-xs font-medium transition-colors cursor-pointer shadow-md"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Query in AI Chat</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
