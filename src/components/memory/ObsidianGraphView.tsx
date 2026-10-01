import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { animate, stagger } from 'animejs';
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
  Sparkles,
  MessageSquare,
  X,
  Play,
  Pause,
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
  fixed?: boolean;
}

export interface GraphLink {
  source: string;
  target: string;
  type: 'root-to-cat' | 'cat-to-rec' | 'doc-to-rec';
  color?: string;
  length: number;
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
  { label: string; color: string; bgGradient: string; icon: React.FC<{ className?: string }> }
> = {
  identity: {
    label: 'Identity',
    color: '#8a54ff',
    bgGradient: 'from-purple-500/20 to-indigo-600/20',
    icon: Fingerprint,
  },
  education: {
    label: 'Education',
    color: '#38bdf8',
    bgGradient: 'from-blue-500/20 to-cyan-600/20',
    icon: GraduationCap,
  },
  employment: {
    label: 'Employment',
    color: '#10b981',
    bgGradient: 'from-emerald-500/20 to-teal-600/20',
    icon: Briefcase,
  },
  finance: {
    label: 'Finance',
    color: '#fbbf24',
    bgGradient: 'from-amber-500/20 to-yellow-600/20',
    icon: Wallet,
  },
  healthcare: {
    label: 'Healthcare',
    color: '#f43f5e',
    bgGradient: 'from-rose-500/20 to-pink-600/20',
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
  const [zoom, setZoom] = useState<number>(0.92);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Physics Simulation & Interaction State
  const [physicsEnabled, setPhysicsEnabled] = useState<boolean>(true);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [activeNode, setActiveNode] = useState<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showDocuments, setShowDocuments] = useState<boolean>(true);
  const [showPulses, setShowPulses] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  // Internal Animated Graph State (positions updated by continuous force simulation)
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [links, setLinks] = useState<GraphLink[]>([]);

  // Initialize Graph Nodes & Connections Deterministically
  useEffect(() => {
    const calculatedNodes: GraphNode[] = [];
    const calculatedLinks: GraphLink[] = [];

    const centerX = 500;
    const centerY = 360;

    // 1. Root User Node
    const rootNode: GraphNode = {
      id: 'root-user',
      label: `${userName}'s Core Vault`,
      sublabel: 'Cryptographic Root',
      type: 'root',
      x: centerX,
      y: centerY,
      vx: 0,
      vy: 0,
      radius: 34,
      color: '#5a25eb',
      fixed: true,
    };
    calculatedNodes.push(rootNode);

    // 2. 5 Category Hub Nodes
    const catKeys: LifeStageCategory[] = [
      'identity',
      'education',
      'employment',
      'finance',
      'healthcare',
    ];
    const catOrbitRadius = 125;

    catKeys.forEach((catKey, idx) => {
      const angle = (idx * (2 * Math.PI)) / catKeys.length - Math.PI / 2;
      const catX = centerX + Math.cos(angle) * catOrbitRadius;
      const catY = centerY + Math.sin(angle) * catOrbitRadius;

      const catNode: GraphNode = {
        id: `cat-${catKey}`,
        label: CATEGORY_CONFIG[catKey].label,
        sublabel: 'Life Stage Cluster',
        type: 'category',
        category: catKey,
        x: catX,
        y: catY,
        vx: 0,
        vy: 0,
        radius: 22,
        color: CATEGORY_CONFIG[catKey].color,
      };
      calculatedNodes.push(catNode);

      // Link Root -> Category Hub
      calculatedLinks.push({
        source: 'root-user',
        target: `cat-${catKey}`,
        type: 'root-to-cat',
        color: CATEGORY_CONFIG[catKey].color,
        length: 110,
      });

      // 3. Records Nodes in outer orbit
      const catRecords = records.filter((r) => r.category === catKey);
      const recRadius = 75;
      const arcSpread = Math.PI * 0.75;

      catRecords.forEach((rec, recIdx) => {
        const offset =
          catRecords.length > 1
            ? (recIdx / (catRecords.length - 1) - 0.5) * arcSpread
            : 0;
        const recAngle = angle + offset;
        const recX = catX + Math.cos(recAngle) * recRadius;
        const recY = catY + Math.sin(recAngle) * recRadius;

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
          radius: 15,
          color: CATEGORY_CONFIG[catKey].color,
        };
        calculatedNodes.push(recNode);

        // Link Category -> Record
        calculatedLinks.push({
          source: `cat-${catKey}`,
          target: rec.id,
          type: 'cat-to-rec',
          color: CATEGORY_CONFIG[catKey].color,
          length: 70,
        });

        // 4. Evidence Documents
        if (showDocuments && rec.evidenceDocName) {
          const docId = `doc-${rec.id}`;
          const docAngle = recAngle + 0.3;
          const docX = recX + Math.cos(docAngle) * 42;
          const docY = recY + Math.sin(docAngle) * 42;

          const docNode: GraphNode = {
            id: docId,
            label: rec.evidenceDocName,
            sublabel: 'Evidence File',
            value: rec.evidenceDocName,
            type: 'document',
            category: rec.category,
            x: docX,
            y: docY,
            vx: 0,
            vy: 0,
            radius: 12,
            color: '#10b981',
          };
          calculatedNodes.push(docNode);

          // Link Record -> Document
          calculatedLinks.push({
            source: rec.id,
            target: docId,
            type: 'doc-to-rec',
            color: '#10b981',
            length: 42,
          });
        }
      });
    });

    setNodes(calculatedNodes);
    setLinks(calculatedLinks);
  }, [records, documents, userName, showDocuments]);

  // Anime.js Staggered Entrance
  useEffect(() => {
    if (nodes.length === 0) return;

    const frameId = requestAnimationFrame(() => {
      const elements = containerRef.current?.querySelectorAll<SVGElement>('.obsidian-node-group');
      if (!elements || elements.length === 0) return;

      try {
        animate(elements, {
          scale: [0, 1],
          opacity: [0, 1],
          duration: 700,
          delay: stagger(20),
          ease: 'outBack',
        });
      } catch {
        // safe fallback
      }
    });

    return () => cancelAnimationFrame(frameId);
  }, [nodes.length, selectedCategory]);

  // Real-time Force-Directed Physics Engine Tick
  const updatePhysics = useCallback(() => {
    if (!physicsEnabled) return;

    setNodes((prevNodes) => {
      if (prevNodes.length === 0) return prevNodes;
      const nodeMap = new Map<string, GraphNode>();
      prevNodes.forEach((n) => nodeMap.set(n.id, { ...n }));

      const centerX = 500;
      const centerY = 360;
      const repulsionStrength = 420;
      const springStrength = 0.075;
      const gravityStrength = 0.035;
      const damping = 0.82;
      const maxRadius = 310;

      const nodeArr = Array.from(nodeMap.values());

      // 1. Coulomb Charge Repulsion between node pairs (with distance cutoff)
      for (let i = 0; i < nodeArr.length; i++) {
        for (let j = i + 1; j < nodeArr.length; j++) {
          const n1 = nodeArr[i];
          const n2 = nodeArr[j];

          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const distSq = dx * dx + dy * dy + 80;
          const dist = Math.sqrt(distSq);

          if (dist < 250) {
            const force = repulsionStrength / distSq;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;

            if (!n1.fixed && n1.id !== draggedNodeId) {
              n1.vx -= fx;
              n1.vy -= fy;
            }
            if (!n2.fixed && n2.id !== draggedNodeId) {
              n2.vx += fx;
              n2.vy += fy;
            }
          }
        }
      }

      // 2. Hooke's Spring Law along Links
      links.forEach((link) => {
        const src = nodeMap.get(link.source);
        const tgt = nodeMap.get(link.target);
        if (!src || !tgt) return;

        const dx = tgt.x - src.x;
        const dy = tgt.y - src.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const displacement = dist - link.length;

        const springForce = displacement * springStrength;
        const fx = (dx / dist) * springForce;
        const fy = (dy / dist) * springForce;

        if (!src.fixed && src.id !== draggedNodeId) {
          src.vx += fx;
          src.vy += fy;
        }
        if (!tgt.fixed && tgt.id !== draggedNodeId) {
          tgt.vx -= fx;
          tgt.vy -= fy;
        }
      });

      // 3. Center Gravitational Pull, Velocity Integration & Bounding Clamping
      nodeArr.forEach((n) => {
        if (n.fixed || n.id === draggedNodeId) return;

        const gdx = centerX - n.x;
        const gdy = centerY - n.y;
        n.vx += gdx * gravityStrength;
        n.vy += gdy * gravityStrength;

        // Apply Damping
        n.vx *= damping;
        n.vy *= damping;

        // Limit maximum speed
        const speed = Math.sqrt(n.vx * n.vx + n.vy * n.vy);
        const maxSpeed = 8;
        if (speed > maxSpeed) {
          n.vx = (n.vx / speed) * maxSpeed;
          n.vy = (n.vy / speed) * maxSpeed;
        }

        n.x += n.vx;
        n.y += n.vy;

        // Radial bounding box around center to keep entire graph within center frame
        const cdx = n.x - centerX;
        const cdy = n.y - centerY;
        const cDist = Math.sqrt(cdx * cdx + cdy * cdy);
        if (cDist > maxRadius) {
          n.x = centerX + (cdx / cDist) * maxRadius;
          n.y = centerY + (cdy / cDist) * maxRadius;
          n.vx *= 0.3;
          n.vy *= 0.3;
        }
      });

      return nodeArr;
    });
  }, [physicsEnabled, draggedNodeId, links]);

  useEffect(() => {
    let animId: number;
    const loop = () => {
      updatePhysics();
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [updatePhysics]);

  // Node Map for Link rendering
  const nodeMap = useMemo(() => {
    const map = new Map<string, GraphNode>();
    nodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [nodes]);

  // Obsidian Connected Subgraph Highlighting (1-hop neighbors)
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

  // Search filter
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

  // Pan & Drag Handlers
  const handleSvgMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'svg' || (e.target as HTMLElement).tagName === 'path') {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleNodeMouseDown = (e: React.MouseEvent, node: GraphNode) => {
    e.stopPropagation();
    setDraggedNodeId(node.id);
    setActiveNode(node);

    // Calculate SVG coordinate offset
    const rect = svgRef.current?.getBoundingClientRect();
    if (rect) {
      const mouseSvgX = (e.clientX - rect.left - pan.x) / zoom;
      const mouseSvgY = (e.clientY - rect.top - pan.y) / zoom;
      setDragOffset({ x: node.x - mouseSvgX, y: node.y - mouseSvgY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    } else if (draggedNodeId) {
      const rect = svgRef.current?.getBoundingClientRect();
      if (rect) {
        const mouseSvgX = (e.clientX - rect.left - pan.x) / zoom;
        const mouseSvgY = (e.clientY - rect.top - pan.y) / zoom;

        setNodes((prev) =>
          prev.map((n) => {
            if (n.id === draggedNodeId) {
              return {
                ...n,
                x: mouseSvgX + dragOffset.x,
                y: mouseSvgY + dragOffset.y,
                vx: 0,
                vy: 0,
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

  // Attach non-passive wheel listener directly to containerRef to prevent passive event listener invocation errors
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheelNonPassive = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      setZoom((prev) => Math.min(Math.max(prev * zoomFactor, 0.35), 2.5));
    };

    el.addEventListener('wheel', onWheelNonPassive, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheelNonPassive);
    };
  }, []);

  // Touch event support for mobile panning
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsPanning(true);
      setPanStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isPanning && e.touches.length === 1) {
      const touch = e.touches[0];
      setPan({ x: touch.clientX - panStart.x, y: touch.clientY - panStart.y });
    }
  };

  const handleTouchEnd = () => {
    setIsPanning(false);
    setDraggedNodeId(null);
  };

  const handleZoomIn = () => setZoom((prev) => Math.min(prev * 1.2, 2.5));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev / 1.2, 0.35));
  const handleReset = () => {
    setZoom(0.92);
    setPan({ x: 0, y: 0 });
    setActiveNode(null);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="relative w-full h-[640px] rounded-3xl border border-zinc-200 dark:border-[#1e1e2c] bg-zinc-950 overflow-hidden shadow-2xl select-none">
      {/* Background Starfield / Radial Pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-25"
        style={{
          backgroundImage: `radial-gradient(#5a25eb 1px, transparent 1px), radial-gradient(rgba(255,255,255,0.15) 1px, transparent 1px)`,
          backgroundSize: '36px 36px, 18px 18px',
          backgroundPosition: '0 0, 9px 9px',
        }}
      />

      {/* Top Floating Obsidian Controls Bar */}
      <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2.5 pointer-events-none">
        {/* Category Constellation Filter */}
        <div className="flex items-center gap-1.5 p-1 rounded-full bg-zinc-900/90 backdrop-blur-md border border-white/10 shadow-lg pointer-events-auto overflow-x-auto max-w-full">
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

        {/* Right Search, Physics & View Controls */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search graph nodes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-full bg-zinc-900/90 backdrop-blur-md border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#5a25eb] w-36 sm:w-52 shadow-lg"
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

          {/* Toggle Physics */}
          <button
            onClick={() => setPhysicsEnabled(!physicsEnabled)}
            className={`p-2 rounded-full border transition-all cursor-pointer shadow-lg ${
              physicsEnabled
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                : 'bg-zinc-900/90 border-white/10 text-zinc-400 hover:text-white'
            }`}
            title={physicsEnabled ? 'Pause Physics Simulation' : 'Resume Physics Simulation'}
          >
            {physicsEnabled ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>

          {/* Toggle Documents */}
          <button
            onClick={() => setShowDocuments(!showDocuments)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer flex items-center gap-1.5 shadow-lg ${
              showDocuments
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                : 'bg-zinc-900/90 border-white/10 text-zinc-400 hover:text-white'
            }`}
            title="Toggle Document Source Nodes"
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Docs</span>
          </button>

          {/* Toggle Flow Pulses */}
          <button
            onClick={() => setShowPulses(!showPulses)}
            className={`p-2 rounded-full border transition-all cursor-pointer shadow-lg ${
              showPulses
                ? 'bg-[#5a25eb]/20 border-[#5a25eb]/40 text-[#cbbeff]'
                : 'bg-zinc-900/90 border-white/10 text-zinc-400 hover:text-white'
            }`}
            title="Toggle Animated Edge Flow"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>

          {/* Zoom Buttons */}
          <div className="flex items-center rounded-full bg-zinc-900/90 backdrop-blur-md border border-white/10 p-0.5 shadow-lg">
            <button
              onClick={handleZoomIn}
              className="p-1.5 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-1.5 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleReset}
              className="p-1.5 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title="Reset View"
            >
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
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="w-full h-full cursor-grab active:cursor-grabbing touch-none"
      >
        <svg
          ref={svgRef}
          className="w-full h-full"
          viewBox="0 0 1000 720"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '500px 360px',
            transition: isPanning || draggedNodeId ? 'none' : 'transform 0.1s ease-out',
          }}
        >
          <defs>
            <filter id="glow-core" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glow-node" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* 1. Connection Links (Edges) */}
          <g className="obsidian-links">
            {links.map((link, idx) => {
              const srcNode = nodeMap.get(link.source);
              const tgtNode = nodeMap.get(link.target);
              if (!srcNode || !tgtNode) return null;

              // Check Category Filter
              const isFilteredOut =
                selectedCategory !== 'all' &&
                tgtNode.category &&
                tgtNode.category !== selectedCategory &&
                srcNode.category !== selectedCategory;

              // Check Obsidian Subgraph Highlight
              const isConnected =
                !connectedNodeIds ||
                (connectedNodeIds.has(srcNode.id) && connectedNodeIds.has(tgtNode.id));

              // Check Search Match
              const isSearchMatch =
                matchingNodeIds.size === 0 ||
                matchingNodeIds.has(srcNode.id) ||
                matchingNodeIds.has(tgtNode.id);

              const opacity = isFilteredOut
                ? 0.05
                : !isConnected
                ? 0.08
                : isSearchMatch
                ? 0.75
                : 0.2;

              const isHighlighted =
                activeNode?.id === srcNode.id ||
                activeNode?.id === tgtNode.id ||
                hoveredNode?.id === srcNode.id ||
                hoveredNode?.id === tgtNode.id;

              const strokeWidth = isHighlighted
                ? 2.6
                : link.type === 'root-to-cat'
                ? 2
                : 1.4;

              const strokeColor = isHighlighted
                ? '#ffffff'
                : link.type === 'doc-to-rec'
                ? '#10b981'
                : link.color || '#5a25eb';

              const midX = (srcNode.x + tgtNode.x) / 2;
              const midY = (srcNode.y + tgtNode.y) / 2;
              const pathD = `M ${srcNode.x} ${srcNode.y} Q ${midX} ${midY} ${tgtNode.x} ${tgtNode.y}`;

              return (
                <g key={`link-${idx}`}>
                  <path
                    d={pathD}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeDasharray={link.type === 'doc-to-rec' ? '3 3' : 'none'}
                    strokeOpacity={opacity}
                    fill="none"
                    className="transition-opacity duration-200"
                  />

                  {/* Animated Traveling Pulses */}
                  {showPulses && !isFilteredOut && isConnected && (
                    <circle r={isHighlighted ? 3 : 2} fill={strokeColor}>
                      <animateMotion
                        path={pathD}
                        dur={`${2.2 + (idx % 3) * 0.6}s`}
                        repeatCount="indefinite"
                      />
                    </circle>
                  )}
                </g>
              );
            })}
          </g>

          {/* 2. Graph Nodes */}
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
                ? 0.15
                : isSearchMatch
                ? 1
                : 0.3;

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
                  {/* Spinning Ring on Root & Active Node */}
                  {(node.type === 'root' || isSelected) && (
                    <circle
                      r={node.radius + 12}
                      fill="none"
                      stroke={node.color}
                      strokeWidth={1.5}
                      strokeDasharray="4 3"
                      className="animate-spin opacity-50"
                      style={{ animationDuration: '14s' }}
                    />
                  )}

                  {/* Outer Glowing Halo */}
                  <circle
                    r={node.radius + 6}
                    fill={node.color}
                    fillOpacity={isSelected ? 0.4 : isHovered ? 0.3 : 0.12}
                    filter="url(#glow-node)"
                  />

                  {/* Main Node Circle */}
                  <circle
                    r={node.radius}
                    fill={
                      node.type === 'root'
                        ? '#5a25eb'
                        : node.type === 'category'
                        ? '#12121e'
                        : node.type === 'document'
                        ? '#064e3b'
                        : '#0a0a14'
                    }
                    stroke={node.color}
                    strokeWidth={isSelected ? 3 : isHovered ? 2.5 : 1.8}
                    className="transition-all duration-150"
                  />

                  {/* Center Node Symbol / Indicator */}
                  {node.type === 'root' && (
                    <text textAnchor="middle" dy="4.5" fill="#ffffff" fontSize="13" fontWeight="bold">
                      ✦
                    </text>
                  )}

                  {node.type === 'category' && <circle r={5} fill={node.color} />}

                  {node.type === 'document' && (
                    <text textAnchor="middle" dy="3.5" fill="#34d399" fontSize="8.5" fontWeight="bold">
                      PDF
                    </text>
                  )}

                  {node.type === 'record' && (
                    <circle
                      r={3}
                      fill={node.confidence === 'evidence-backed' ? '#10b981' : node.color}
                    />
                  )}

                  {/* Node Label Text */}
                  <text
                    textAnchor="middle"
                    y={node.radius + 13}
                    fill={isSelected || isHovered ? '#ffffff' : '#d4d4d8'}
                    fontSize={node.type === 'root' ? 11.5 : node.type === 'category' ? 10.5 : 9}
                    fontWeight={node.type === 'root' || node.type === 'category' || isSelected ? '600' : '400'}
                    className="pointer-events-none drop-shadow-md"
                  >
                    {node.label.length > 20 ? `${node.label.substring(0, 18)}...` : node.label}
                  </text>

                  {/* Value Subtext on active or hover */}
                  {(isSelected || isHovered) && node.value && (
                    <text
                      textAnchor="middle"
                      y={node.radius + 24}
                      fill="#a1a1aa"
                      fontSize="8"
                      fontFamily="monospace"
                      className="pointer-events-none drop-shadow-md"
                    >
                      {node.value.length > 22 ? `${node.value.substring(0, 20)}...` : node.value}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Bottom Floating Stats & Quick Obsidian Legend */}
      <div className="absolute bottom-3 left-3 z-20 flex items-center gap-3 p-2 rounded-2xl bg-zinc-900/90 backdrop-blur-md border border-white/10 text-[11px] text-zinc-400 shadow-xl pointer-events-auto">
        <div className="flex items-center gap-1.5 px-1.5">
          <span className="w-2 h-2 rounded-full bg-[#5a25eb] animate-pulse" />
          <span className="font-semibold text-white">{nodes.length} Nodes</span>
        </div>
        <div className="h-3 w-px bg-white/10" />
        <div className="flex items-center gap-1.5 px-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>{links.length} Connected Links</span>
        </div>
        <div className="hidden sm:flex items-center gap-2.5 pl-2 border-l border-white/10">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#8a54ff]" /> Identity
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8]" /> Edu
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" /> Emp
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#fbbf24]" /> Fin
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#f43f5e]" /> Health
          </span>
        </div>
      </div>

      {/* Floating Node Inspection Drawer */}
      {activeNode && (
        <div className="absolute bottom-3 right-3 z-30 w-80 max-w-[calc(100%-1.5rem)] p-4 rounded-2xl bg-zinc-900/95 backdrop-blur-xl border border-white/15 shadow-2xl space-y-3 text-xs text-zinc-200 animate-in fade-in slide-in-from-bottom-3 duration-200">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 border-b border-white/10 pb-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: activeNode.color }} />
              <div>
                <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-400">
                  {activeNode.type === 'root'
                    ? 'Vault Root'
                    : activeNode.type === 'category'
                    ? 'Life Stage Cluster'
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

          {/* Stored Value */}
          <div className="space-y-2">
            {activeNode.value && (
              <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-1">
                <span className="text-[10px] text-zinc-400 block font-medium">Stored Memory Value</span>
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

          {/* Actions */}
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
