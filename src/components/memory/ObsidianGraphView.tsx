import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
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
  Copy,
  Check,
  MessageSquare,
  X,
  User,
  Network,
  RotateCcw,
  Play,
  Pause,
  Maximize2,
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
  seed: number;
}

export interface GraphLink {
  source: string;
  target: string;
  type: 'root-to-cat' | 'cat-to-rec' | 'doc-to-rec' | 'cross-link';
  color?: string;
  isDashed?: boolean;
  distance: number;
  strength: number;
}

interface ObsidianGraphViewProps {
  records: RecordField[];
  documents: DocumentItem[];
  selectedCategory: LifeStageCategory | 'all';
  onSelectCategory: (cat: LifeStageCategory | 'all') => void;
  onOpenAddModal?: () => void;
  isLoading?: boolean;
}

const CATEGORY_CONFIG: Record<
  LifeStageCategory,
  { label: string; initial: string; color: string; hubColor: string; icon: React.FC<{ className?: string }> }
> = {
  identity: {
    label: 'Identity & Facts',
    initial: 'F',
    color: '#f43f5e',
    hubColor: '#64748b',
    icon: Fingerprint,
  },
  education: {
    label: 'Education',
    initial: 'E',
    color: '#a855f7',
    hubColor: '#64748b',
    icon: GraduationCap,
  },
  employment: {
    label: 'Employment',
    initial: 'W',
    color: '#ec4899',
    hubColor: '#64748b',
    icon: Briefcase,
  },
  finance: {
    label: 'Finance',
    initial: 'S',
    color: '#38bdf8',
    hubColor: '#64748b',
    icon: Wallet,
  },
  healthcare: {
    label: 'Healthcare',
    initial: 'H',
    color: '#fb7185',
    hubColor: '#64748b',
    icon: HeartPulse,
  },
};

export const ObsidianGraphView: React.FC<ObsidianGraphViewProps> = ({
  records,
  documents,
  selectedCategory,
  onSelectCategory,
  isLoading = false,
}) => {
  const { userName, navigate } = useNavigation();
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const animFrameRef = useRef<number | null>(null);

  // Dynamic Viewport Dimensions
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 960,
    height: 680,
  });

  // Canvas Pan and Zoom
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Floating Ambient Wave Toggle
  const [isFloatingActive, setIsFloatingActive] = useState<boolean>(true);

  // Dragging & Active Node State
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const draggedNodeIdRef = useRef<string | null>(null);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const [activeNode, setActiveNode] = useState<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showDocuments, setShowDocuments] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  // Simulation alpha (decays as layout stabilizes)
  const alphaRef = useRef<number>(1.0);
  const nodesRef = useRef<GraphNode[]>([]);
  const linksRef = useRef<GraphLink[]>([]);
  const [, setRenderTick] = useState<number>(0);

  // Responsive Container Observer
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 200 && rect.height > 200) {
        setDimensions({
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        });
      }
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Initialize Nodes near the Center in a Compact Semantic Cluster
  const initializeGraph = useCallback(() => {
    const calculatedNodes: GraphNode[] = [];
    const calculatedLinks: GraphLink[] = [];

    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;

    // 1. Person Root Node (Central Anchor: 28px diameter / radius 14)
    const rootNode: GraphNode = {
      id: 'root-user',
      label: userName || 'Indresh',
      sublabel: 'User Vault Root',
      type: 'root',
      x: centerX,
      y: centerY,
      vx: 0,
      vy: 0,
      radius: 14,
      color: '#38bdf8',
      seed: 1,
    };
    calculatedNodes.push(rootNode);

    // 2. Category Hub Nodes in compact orbit (65px - 75px radius)
    const catKeys: LifeStageCategory[] = [
      'identity',
      'education',
      'employment',
      'healthcare',
      'finance',
    ];
    const catOrbitRadius = 72;

    const catAngles: Record<LifeStageCategory, number> = {
      identity: -Math.PI / 2,        // Top
      education: -Math.PI / 6,       // Top-Right
      employment: Math.PI / 3,       // Bottom-Right
      healthcare: (3 * Math.PI) / 4, // Bottom-Left
      finance: -(3 * Math.PI) / 4,   // Top-Left
    };

    catKeys.forEach((catKey, catIdx) => {
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
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        radius: 9,
        color: CATEGORY_CONFIG[catKey].color,
        seed: catIdx + 2,
      };
      calculatedNodes.push(catNode);

      // Root -> Category link (Strong attraction, short distance)
      calculatedLinks.push({
        source: 'root-user',
        target: `cat-${catKey}`,
        type: 'root-to-cat',
        color: '#475569',
        distance: 68,
        strength: 0.14,
      });

      // 3. Record Nodes (12px diameter / radius 6) close to Category Hub
      const catRecords = records.filter((r) => r.category === catKey);
      const fanSpread = Math.PI * 1.1;

      catRecords.forEach((rec, recIdx) => {
        const offsetAngle =
          catRecords.length > 1
            ? (recIdx / (catRecords.length - 1) - 0.5) * fanSpread
            : 0;
        const recAngle = angle + offsetAngle;
        const recDistance = recIdx % 2 === 0 ? 44 : 58;

        const recX = catX + Math.cos(recAngle) * recDistance + (Math.random() - 0.5) * 8;
        const recY = catY + Math.sin(recAngle) * recDistance + (Math.random() - 0.5) * 8;

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
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          radius: 5.5,
          color: CATEGORY_CONFIG[catKey].color,
          seed: recIdx * 7 + 10,
        };
        calculatedNodes.push(recNode);

        // Category -> Record Link
        calculatedLinks.push({
          source: `cat-${catKey}`,
          target: rec.id,
          type: 'cat-to-rec',
          color: '#3f3f46',
          distance: 48,
          strength: 0.16,
        });

        // 4. Evidence Documents (8px diameter / radius 4) tightly bound to Claim
        if (showDocuments && rec.evidenceDocName) {
          const docId = `doc-${rec.id}`;
          const docAngle = recAngle + (recIdx % 2 === 0 ? 0.3 : -0.3);
          const docDistance = recDistance + 26;

          const docX = catX + Math.cos(docAngle) * docDistance;
          const docY = catY + Math.sin(docAngle) * docDistance;

          const docNode: GraphNode = {
            id: docId,
            label: rec.evidenceDocName,
            sublabel: 'Evidence Document',
            value: rec.evidenceDocName,
            type: 'document',
            category: rec.category,
            x: docX,
            y: docY,
            vx: 0,
            vy: 0,
            radius: 4,
            color: '#10b981',
            seed: recIdx * 13 + 30,
          };
          calculatedNodes.push(docNode);

          calculatedLinks.push({
            source: rec.id,
            target: docId,
            type: 'doc-to-rec',
            color: '#059669',
            isDashed: true,
            distance: 30,
            strength: 0.20,
          });
        }
      });
    });

    // 5. Standalone Vault Documents
    if (showDocuments && Array.isArray(documents)) {
      documents.forEach((doc, docIdx) => {
        if (!calculatedNodes.some((n) => n.id === `doc-${doc.id}` || n.label === doc.name)) {
          const catKey = doc.category || 'education';
          const catNode = calculatedNodes.find((n) => n.id === `cat-${catKey}`);
          const catX = catNode ? catNode.x : centerX;
          const catY = catNode ? catNode.y : centerY;
          const docAngle = Math.random() * Math.PI * 2;
          const docDistance = 45 + (docIdx % 3) * 15;

          const docNode: GraphNode = {
            id: `doc-${doc.id}`,
            label: doc.name,
            sublabel: 'Evidence Document',
            value: `${doc.fileType.toUpperCase()} · ${doc.fileSize}`,
            type: 'document',
            category: doc.category,
            x: catX + Math.cos(docAngle) * docDistance,
            y: catY + Math.sin(docAngle) * docDistance,
            vx: 0,
            vy: 0,
            radius: 4,
            color: '#10b981',
            seed: docIdx * 19 + 60,
          };
          calculatedNodes.push(docNode);

          if (catNode) {
            calculatedLinks.push({
              source: `cat-${catKey}`,
              target: docNode.id,
              type: 'doc-to-rec',
              color: '#059669',
              isDashed: true,
              distance: 36,
              strength: 0.18,
            });
          }
        }
      });
    }

    nodesRef.current = calculatedNodes;
    linksRef.current = calculatedLinks;
    alphaRef.current = 1.0;
    setRenderTick((t) => t + 1);
  }, [records, documents, userName, showDocuments, dimensions.width, dimensions.height]);

  // Fit Entire Graph inside Viewport
  const fitGraphToViewport = useCallback(() => {
    const nodes = nodesRef.current;
    if (nodes.length === 0) return;

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    nodes.forEach((n) => {
      minX = Math.min(minX, n.x - n.radius - 20);
      maxX = Math.max(maxX, n.x + n.radius + 20);
      minY = Math.min(minY, n.y - n.radius - 20);
      maxY = Math.max(maxY, n.y + n.radius + 20);
    });

    const graphWidth = maxX - minX || 1;
    const graphHeight = maxY - minY || 1;
    const availWidth = dimensions.width * 0.85;
    const availHeight = dimensions.height * 0.82;

    const autoZoom = Math.min(Math.max(Math.min(availWidth / graphWidth, availHeight / graphHeight), 0.75), 1.6);
    const graphCenterX = (minX + maxX) / 2;
    const graphCenterY = (minY + maxY) / 2;

    const targetPanX = (dimensions.width / 2 - graphCenterX) * autoZoom;
    const targetPanY = (dimensions.height / 2 - graphCenterY) * autoZoom;

    setZoom(autoZoom);
    setPan({ x: targetPanX, y: targetPanY });
  }, [dimensions.width, dimensions.height]);

  useEffect(() => {
    initializeGraph();
    // After initialization, fit graph
    const timer = setTimeout(() => {
      fitGraphToViewport();
    }, 150);
    return () => clearTimeout(timer);
  }, [initializeGraph, fitGraphToViewport]);

  // Obsidian Physics Simulation (Weak Repulsion, Strong Links, Strict Boundary Clamping)
  useEffect(() => {
    const simulatePhysicsStep = () => {
      const nodes = nodesRef.current;
      const links = linksRef.current;
      if (nodes.length === 0) {
        animFrameRef.current = requestAnimationFrame(simulatePhysicsStep);
        return;
      }

      const width = dimensions.width;
      const height = dimensions.height;
      const centerX = width / 2;
      const centerY = height / 2;
      const padding = 55;

      const currentAlpha = alphaRef.current;
      const isSettled = currentAlpha < 0.005;

      if (!isSettled || draggedNodeIdRef.current) {
        const nodeIndexMap = new Map<string, GraphNode>();
        nodes.forEach((n) => nodeIndexMap.set(n.id, n));

        // 1. Weak Pairwise Repulsion (Controlled charge: -70, distanceMax: 130px)
        const chargeStrength = -70;
        const maxRepulsionDist = 130;
        const nLen = nodes.length;

        for (let i = 0; i < nLen; i++) {
          const n1 = nodes[i];
          for (let j = i + 1; j < nLen; j++) {
            const n2 = nodes[j];
            const dx = n2.x - n1.x;
            const dy = n2.y - n1.y;
            const distSq = dx * dx + dy * dy || 1;
            const dist = Math.sqrt(distSq);

            if (dist < maxRepulsionDist) {
              const force = (chargeStrength / Math.max(dist, 12)) * currentAlpha * 0.05;
              const fx = (dx / dist) * force;
              const fy = (dy / dist) * force;

              if (n1.id !== draggedNodeIdRef.current && n1.type !== 'root') {
                n1.vx += fx;
                n1.vy += fy;
              }
              if (n2.id !== draggedNodeIdRef.current && n2.type !== 'root') {
                n2.vx -= fx;
                n2.vy -= fy;
              }
            }

            // 2. Strong Local Collision Clearance
            const minSeparation = n1.radius + n2.radius + 18;
            if (dist < minSeparation) {
              const overlap = (minSeparation - dist) * 0.5 * 0.85;
              const pushX = (dx / dist) * overlap;
              const pushY = (dy / dist) * overlap;

              if (n1.id !== draggedNodeIdRef.current && n1.type !== 'root') {
                n1.x -= pushX;
                n1.y -= pushY;
              }
              if (n2.id !== draggedNodeIdRef.current && n2.type !== 'root') {
                n2.x += pushX;
                n2.y += pushY;
              }
            }
          }
        }

        // 3. Strong Spring Link Tension (Pulls connected nodes together)
        links.forEach((link) => {
          const src = nodeIndexMap.get(link.source);
          const tgt = nodeIndexMap.get(link.target);
          if (!src || !tgt) return;

          const dx = tgt.x - src.x;
          const dy = tgt.y - src.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const displacement = dist - link.distance;
          const springForce = displacement * link.strength * (0.5 + currentAlpha * 0.5);

          const fx = (dx / dist) * springForce;
          const fy = (dy / dist) * springForce;

          if (src.id !== draggedNodeIdRef.current && src.type !== 'root') {
            src.vx += fx;
            src.vy += fy;
          }
          if (tgt.id !== draggedNodeIdRef.current) {
            tgt.vx -= fx;
            tgt.vy -= fy;
          }
        });

        // 4. Centering Force (Person node strong anchor, other nodes gentle pull)
        nodes.forEach((n) => {
          if (n.id === draggedNodeIdRef.current) return;

          if (n.type === 'root') {
            n.vx += (centerX - n.x) * 0.25;
            n.vy += (centerY - n.y) * 0.25;
          } else {
            n.vx += (centerX - n.x) * 0.045 * currentAlpha;
            n.vy += (centerY - n.y) * 0.045 * currentAlpha;
          }

          // 5. Velocity Damping & Step Integration
          const friction = 0.82;
          n.vx *= friction;
          n.vy *= friction;

          const maxVel = 4.5;
          const speed = Math.sqrt(n.vx * n.vx + n.vy * n.vy);
          if (speed > maxVel) {
            n.vx = (n.vx / speed) * maxVel;
            n.vy = (n.vy / speed) * maxVel;
          }

          n.x += n.vx;
          n.y += n.vy;

          // 6. Strict Graph Viewport Boundary Clamping (Zero coordinates escape)
          if (n.x < padding) {
            n.x = padding;
            n.vx = 0;
          } else if (n.x > width - padding) {
            n.x = width - padding;
            n.vx = 0;
          }

          if (n.y < padding) {
            n.y = padding;
            n.vy = 0;
          } else if (n.y > height - padding) {
            n.y = height - padding;
            n.vy = 0;
          }
        });

        // Alpha decay towards settling
        alphaRef.current = Math.max(0, currentAlpha * 0.965 - 0.001);
      }

      setRenderTick((t) => t + 1);
      animFrameRef.current = requestAnimationFrame(simulatePhysicsStep);
    };

    animFrameRef.current = requestAnimationFrame(simulatePhysicsStep);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [dimensions.width, dimensions.height]);

  // Connected Nodes Mapping for Focus Visibility
  const nodeMap = useMemo(() => {
    const map = new Map<string, GraphNode>();
    nodesRef.current.forEach((n) => map.set(n.id, n));
    return map;
  }, [nodesRef.current]);

  const connectedNodeIds = useMemo(() => {
    if (!hoveredNode && !activeNode) return null;
    const focusId = hoveredNode?.id || activeNode?.id;
    const set = new Set<string>();
    set.add(focusId!);

    linksRef.current.forEach((l) => {
      if (l.source === focusId) set.add(l.target);
      if (l.target === focusId) set.add(l.source);
    });
    return set;
  }, [hoveredNode, activeNode]);

  const matchingNodeIds = useMemo(() => {
    if (!searchQuery.trim()) return new Set<string>();
    const q = searchQuery.toLowerCase();
    const matched = new Set<string>();
    nodesRef.current.forEach((n) => {
      if (
        n.label.toLowerCase().includes(q) ||
        (n.value && n.value.toLowerCase().includes(q)) ||
        (n.sublabel && n.sublabel.toLowerCase().includes(q))
      ) {
        matched.add(n.id);
      }
    });
    return matched;
  }, [searchQuery]);

  // Pan & Drag Handlers
  const handleSvgMouseDown = (e: React.MouseEvent) => {
    if (
      (e.target as HTMLElement).tagName === 'svg' ||
      (e.target as HTMLElement).tagName === 'rect' ||
      (e.target as HTMLElement).tagName === 'pattern'
    ) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleNodeMouseDown = (e: React.MouseEvent, node: GraphNode) => {
    e.stopPropagation();
    setDraggedNodeId(node.id);
    draggedNodeIdRef.current = node.id;
    setActiveNode(node);
    alphaRef.current = 0.35; // Gentle reheat for smooth drag-response

    const rect = svgRef.current?.getBoundingClientRect();
    if (rect) {
      const mouseSvgX = (e.clientX - rect.left - pan.x) / zoom;
      const mouseSvgY = (e.clientY - rect.top - pan.y) / zoom;
      dragOffsetRef.current = { x: node.x - mouseSvgX, y: node.y - mouseSvgY };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    } else if (draggedNodeIdRef.current) {
      const rect = svgRef.current?.getBoundingClientRect();
      if (rect) {
        const mouseSvgX = (e.clientX - rect.left - pan.x) / zoom;
        const mouseSvgY = (e.clientY - rect.top - pan.y) / zoom;

        const targetNode = nodesRef.current.find((n) => n.id === draggedNodeIdRef.current);
        if (targetNode) {
          targetNode.x = Math.max(40, Math.min(dimensions.width - 40, mouseSvgX + dragOffsetRef.current.x));
          targetNode.y = Math.max(40, Math.min(dimensions.height - 40, mouseSvgY + dragOffsetRef.current.y));
          targetNode.vx = 0;
          targetNode.vy = 0;
        }
      }
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggedNodeId(null);
    draggedNodeIdRef.current = null;
  };

  // Touch Support
  const handleTouchStart = (e: React.TouchEvent, node?: GraphNode) => {
    if (node && e.touches.length === 1) {
      const touch = e.touches[0];
      setDraggedNodeId(node.id);
      draggedNodeIdRef.current = node.id;
      setActiveNode(node);
      alphaRef.current = 0.35;

      const rect = svgRef.current?.getBoundingClientRect();
      if (rect) {
        const mouseSvgX = (touch.clientX - rect.left - pan.x) / zoom;
        const mouseSvgY = (touch.clientY - rect.top - pan.y) / zoom;
        dragOffsetRef.current = { x: node.x - mouseSvgX, y: node.y - mouseSvgY };
      }
    } else if (e.touches.length === 1) {
      setIsPanning(true);
      setPanStart({ x: e.touches[0].clientX - pan.x, y: e.touches[0].clientY - pan.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      if (draggedNodeIdRef.current) {
        const rect = svgRef.current?.getBoundingClientRect();
        if (rect) {
          const mouseSvgX = (touch.clientX - rect.left - pan.x) / zoom;
          const mouseSvgY = (touch.clientY - rect.top - pan.y) / zoom;
          const targetNode = nodesRef.current.find((n) => n.id === draggedNodeIdRef.current);
          if (targetNode) {
            targetNode.x = Math.max(40, Math.min(dimensions.width - 40, mouseSvgX + dragOffsetRef.current.x));
            targetNode.y = Math.max(40, Math.min(dimensions.height - 40, mouseSvgY + dragOffsetRef.current.y));
            targetNode.vx = 0;
            targetNode.vy = 0;
          }
        }
      } else if (isPanning) {
        setPan({
          x: touch.clientX - panStart.x,
          y: touch.clientY - panStart.y,
        });
      }
    }
  };

  // Mouse Wheel Zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheelNonPassive = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      setZoom((prev) => Math.min(Math.max(prev * zoomFactor, 0.4), 2.5));
    };

    el.addEventListener('wheel', onWheelNonPassive, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheelNonPassive);
    };
  }, []);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev * 1.18, 2.5));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev / 1.18, 0.4));
  const handleReset = () => {
    fitGraphToViewport();
    setActiveNode(null);
    alphaRef.current = 0.5;
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const nodes = nodesRef.current;
  const links = linksRef.current;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[720px] rounded-3xl border border-zinc-800/80 bg-[#08080d] overflow-hidden shadow-2xl select-none"
    >
      {/* High-Tech Neural Loading State Overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-[#08080d]/85 backdrop-blur-md transition-opacity duration-300">
          <div className="relative w-20 h-20 mb-4 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-t-[#5a25eb] border-r-transparent border-b-[#96aaff] border-l-transparent animate-spin" />
            <div className="absolute inset-2 rounded-full border border-white/20 animate-ping opacity-30" />
            <div className="w-12 h-12 rounded-full bg-[#5a25eb]/20 border border-[#5a25eb]/40 flex items-center justify-center shadow-[0_0_25px_rgba(90,37,235,0.7)]">
              <Network className="w-6 h-6 text-[#cbbeff] animate-pulse" />
            </div>
          </div>
          <p className="text-sm font-bold text-white tracking-wide">
            Synchronizing Obsidian Knowledge Graph
          </p>
          <p className="text-xs text-zinc-400 font-mono mt-1">
            Settling compact force layout & link verifications...
          </p>
        </div>
      )}

      {/* Top Floating Controls HUD */}
      <div className="absolute top-3.5 left-3.5 right-3.5 z-20 flex flex-wrap items-center justify-between gap-2.5 pointer-events-none">
        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-full bg-zinc-900/90 backdrop-blur-md border border-white/10 shadow-lg pointer-events-auto overflow-x-auto max-w-full">
          <button
            onClick={() => onSelectCategory('all')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-[#5a25eb] text-white shadow-md shadow-[#5a25eb]/30'
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

        {/* Search, Physics & View Controls */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search nodes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-full bg-zinc-900/90 backdrop-blur-md border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#5a25eb] w-32 sm:w-44 shadow-lg"
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

          {/* Toggle Floating Wave */}
          <button
            onClick={() => setIsFloatingActive(!isFloatingActive)}
            className={`px-2.5 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer flex items-center gap-1 shadow-lg ${
              isFloatingActive
                ? 'bg-[#5a25eb]/20 border-[#5a25eb]/40 text-[#cbbeff]'
                : 'bg-zinc-900/90 border-white/10 text-zinc-400 hover:text-white'
            }`}
            title={isFloatingActive ? 'Pause Ambient Wave' : 'Resume Ambient Wave'}
          >
            {isFloatingActive ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            <span className="hidden md:inline">{isFloatingActive ? 'Float' : 'Paused'}</span>
          </button>

          {/* Toggle Evidence Documents */}
          <button
            onClick={() => setShowDocuments(!showDocuments)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer flex items-center gap-1.5 shadow-lg ${
              showDocuments
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                : 'bg-zinc-900/90 border-white/10 text-zinc-400 hover:text-white'
            }`}
            title="Toggle Evidence Documents"
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Docs</span>
          </button>

          {/* Zoom & Fit Controls */}
          <div className="flex items-center rounded-full bg-zinc-900/90 backdrop-blur-md border border-white/10 p-0.5 shadow-lg">
            <button onClick={handleZoomIn} className="p-1.5 text-zinc-400 hover:text-white cursor-pointer" title="Zoom In">
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button onClick={handleZoomOut} className="p-1.5 text-zinc-400 hover:text-white cursor-pointer" title="Zoom Out">
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button onClick={fitGraphToViewport} className="p-1.5 text-zinc-400 hover:text-white cursor-pointer" title="Fit to Viewport">
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button onClick={handleReset} className="p-1.5 text-zinc-400 hover:text-white cursor-pointer" title="Reset Graph">
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Spatial SVG Graph Canvas */}
      <div
        onMouseDown={handleSvgMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={(e) => handleTouchStart(e)}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleMouseUp}
        className="w-full h-full cursor-grab active:cursor-grabbing touch-none overflow-hidden"
      >
        <svg
          ref={svgRef}
          className="w-full h-full"
          viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: `${dimensions.width / 2}px ${dimensions.height / 2}px`,
            transition: isPanning || draggedNodeId ? 'none' : 'transform 0.08s ease-out',
          }}
        >
          <defs>
            {/* Seamless Subtle Dot Grid Pattern */}
            <pattern id="bg-dot-grid" width="22" height="22" patternUnits="userSpaceOnUse">
              <circle cx="11" cy="11" r="0.9" fill="rgba(255, 255, 255, 0.12)" />
            </pattern>

            {/* Subtle Directional Marker */}
            <marker
              id="subtle-arrow"
              viewBox="0 0 10 10"
              refX="14"
              refY="5"
              markerWidth="3.5"
              markerHeight="3.5"
              orient="auto-start-reverse"
            >
              <path d="M 0 2 L 7 5 L 0 8 z" fill="#52525b" />
            </marker>

            <marker
              id="subtle-arrow-highlight"
              viewBox="0 0 10 10"
              refX="14"
              refY="5"
              markerWidth="4.5"
              markerHeight="4.5"
              orient="auto-start-reverse"
            >
              <path d="M 0 2 L 7 5 L 0 8 z" fill="#ffffff" />
            </marker>

            <filter id="glow-root" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            <filter id="glow-selected" x="-70%" y="-70%" width="240%" height="240%">
              <feGaussianBlur stdDeviation="10" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Dot Grid Canvas Background */}
          <rect x="-3000" y="-3000" width="8000" height="8000" fill="url(#bg-dot-grid)" pointerEvents="none" />

          {/* 1. Subtle 1px Obsidian Relationship Edges */}
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

              const isHighlighted =
                activeNode?.id === srcNode.id ||
                activeNode?.id === tgtNode.id ||
                hoveredNode?.id === srcNode.id ||
                hoveredNode?.id === tgtNode.id;

              const opacity = isFilteredOut
                ? 0.04
                : isHighlighted
                ? 0.9
                : !isConnected
                ? 0.08
                : isSearchMatch
                ? 0.35
                : 0.18;

              const strokeWidth = isHighlighted ? 1.8 : 1.0;
              const strokeColor = isHighlighted
                ? '#ffffff'
                : link.isDashed
                ? '#10b981'
                : link.color || '#3f3f46';

              return (
                <g key={`link-group-${idx}`}>
                  <line
                    x1={srcNode.x}
                    y1={srcNode.y}
                    x2={tgtNode.x}
                    y2={tgtNode.y}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeDasharray={link.isDashed ? '3 3' : 'none'}
                    strokeOpacity={opacity}
                    markerEnd={isHighlighted ? 'url(#subtle-arrow-highlight)' : 'url(#subtle-arrow)'}
                  />

                  {/* Energy pulse along active link */}
                  {isHighlighted && (
                    <circle
                      r={2}
                      fill="#ffffff"
                      opacity={0.9}
                    >
                      <animate
                        attributeName="cx"
                        from={srcNode.x}
                        to={tgtNode.x}
                        dur="1.2s"
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="cy"
                        from={srcNode.y}
                        to={tgtNode.y}
                        dur="1.2s"
                        repeatCount="indefinite"
                      />
                    </circle>
                  )}
                </g>
              );
            })}
          </g>

          {/* 2. Free-Floating Pure Circular Obsidian Nodes */}
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

              // Focus mode multi-depth hierarchy
              const opacity = isFilteredOut
                ? 0.09
                : isSelected || isHovered
                ? 1.0
                : !isConnected
                ? 0.22
                : isSearchMatch
                ? 1.0
                : 0.55;

              // Subtle ambient floating offset (cosmetic only, zero physics distortion)
              const floatOffset =
                isFloatingActive && node.id !== draggedNodeId
                  ? {
                      x: Math.sin(Date.now() * 0.0015 + node.seed * 1.5) * 1.2,
                      y: Math.cos(Date.now() * 0.0012 + node.seed * 1.2) * 1.2,
                    }
                  : { x: 0, y: 0 };

              const posX = node.x + floatOffset.x;
              const posY = node.y + floatOffset.y;

              return (
                <g
                  key={node.id}
                  className="obsidian-node-group cursor-pointer select-none"
                  transform={`translate(${posX}, ${posY})`}
                  opacity={opacity}
                  onMouseDown={(e) => handleNodeMouseDown(e, node)}
                  onTouchStart={(e) => handleTouchStart(e, node)}
                  onMouseEnter={() => setHoveredNode(node)}
                  onMouseLeave={() => setHoveredNode(null)}
                >
                  {/* Subtle Glowing Halo on Root or Selected/Hovered Nodes */}
                  {(node.type === 'root' || isSelected || isHovered) && (
                    <circle
                      r={node.radius + (isSelected ? 6 : 4.5)}
                      fill={node.color}
                      fillOpacity={isSelected ? 0.4 : 0.25}
                      filter={isSelected ? 'url(#glow-selected)' : 'url(#glow-root)'}
                    />
                  )}

                  {/* Clean Circular Node Body */}
                  <circle
                    r={node.radius}
                    fill={
                      node.type === 'root'
                        ? '#38bdf8'
                        : node.type === 'category'
                        ? node.color
                        : node.type === 'document'
                        ? '#10b981'
                        : node.color
                    }
                    stroke={
                      isSelected || isHovered
                        ? '#ffffff'
                        : node.type === 'root'
                        ? '#7dd3fc'
                        : 'rgba(255, 255, 255, 0.25)'
                    }
                    strokeWidth={isSelected ? 2.5 : isHovered ? 2 : 1}
                  />

                  {/* Inner Node Centered Dot / Icon */}
                  {node.type === 'root' && (
                    <User className="w-3.5 h-3.5 text-zinc-950 -translate-x-1.5 -translate-y-1.5 pointer-events-none" />
                  )}

                  {node.type === 'category' && (
                    <text
                      textAnchor="middle"
                      dy="3.5"
                      fill="#ffffff"
                      fontSize="9"
                      fontWeight="800"
                      fontFamily="sans-serif"
                      className="pointer-events-none"
                    >
                      {node.letterInit}
                    </text>
                  )}

                  {/* Clean Floating Text Label Directly Beneath Node (No Card/Box) */}
                  <g transform={`translate(0, ${node.radius + 11})`}>
                    <text
                      textAnchor="middle"
                      fill={
                        node.type === 'root'
                          ? '#38bdf8'
                          : node.type === 'category'
                          ? '#ffffff'
                          : isSelected || isHovered
                          ? '#ffffff'
                          : '#cbd5e1'
                      }
                      fontSize={node.type === 'root' ? 11 : node.type === 'category' ? 10 : 8.5}
                      fontWeight={node.type === 'root' || node.type === 'category' || isSelected ? '700' : '500'}
                      className="pointer-events-none"
                      style={{
                        paintOrder: 'stroke fill',
                        stroke: '#08080d',
                        strokeWidth: '3px',
                        strokeLinejoin: 'round',
                      }}
                    >
                      {node.label.length > 20 ? `${node.label.substring(0, 18)}...` : node.label}
                    </text>
                  </g>

                  {/* Sublabel / Stored Value for Records */}
                  {node.value && node.type === 'record' && (isSelected || isHovered || zoom > 0.95) && (
                    <g transform={`translate(0, ${node.radius + 21})`}>
                      <text
                        textAnchor="middle"
                        fill="#94a3b8"
                        fontSize="7.5"
                        className="pointer-events-none"
                        style={{
                          paintOrder: 'stroke fill',
                          stroke: '#08080d',
                          strokeWidth: '2.5px',
                          strokeLinejoin: 'round',
                        }}
                      >
                        {node.value.length > 20 ? `${node.value.substring(0, 18)}...` : node.value}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Bottom Floating Legend & HUD */}
      <div className="absolute bottom-3.5 left-3.5 z-20 flex items-center gap-3 p-2 rounded-2xl bg-zinc-900/90 backdrop-blur-md border border-white/10 text-[11px] text-zinc-400 shadow-xl pointer-events-auto">
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
            <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8]" /> Fin (S)
          </span>
        </div>
      </div>

      {/* Floating Node Inspection Drawer */}
      {activeNode && (
        <div className="absolute bottom-3.5 right-3.5 z-30 w-80 max-w-[calc(100%-1.5rem)] p-4 rounded-2xl bg-zinc-900/95 backdrop-blur-xl border border-white/15 shadow-2xl space-y-3 text-xs text-zinc-200 animate-in fade-in slide-in-from-bottom-3 duration-200">
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
                    : 'User-Confirmed Assertion'}
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
