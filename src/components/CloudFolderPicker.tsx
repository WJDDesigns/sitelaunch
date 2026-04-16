"use client";

import { useState, useEffect, useCallback } from "react";
import type { CloudProvider, CloudFolder } from "@/lib/cloud/providers";
import { PROVIDER_META } from "@/lib/cloud/providers";

interface Props {
  provider: CloudProvider;
  onSelect: (folderId: string, folderPath: string) => void;
  onCancel: () => void;
}

interface FolderNode extends CloudFolder {
  children?: FolderNode[];
  loading?: boolean;
  expanded?: boolean;
}

export default function CloudFolderPicker({ provider, onSelect, onCancel }: Props) {
  const meta = PROVIDER_META[provider];
  const [folders, setFolders] = useState<FolderNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<{ id: string; path: string } | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string | undefined; name: string }[]>([
    { id: undefined, name: "Root" },
  ]);

  const loadFolders = useCallback(async (parentId?: string) => {
    try {
      const params = parentId ? `?parentId=${encodeURIComponent(parentId)}` : "";
      const res = await fetch(`/api/integrations/${provider}/folders${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load folders");
      return (data.folders ?? []) as CloudFolder[];
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load folders");
      return [];
    }
  }, [provider]);

  useEffect(() => {
    setLoading(true);
    loadFolders().then((f) => {
      setFolders(f.map((folder) => ({ ...folder, children: undefined, loading: false, expanded: false })));
      setLoading(false);
    });
  }, [loadFolders]);

  async function handleExpandFolder(folder: FolderNode) {
    if (folder.expanded) {
      // Collapse
      setFolders((prev) => updateNode(prev, folder.id, { expanded: false }));
      return;
    }

    // Expand and load children
    setFolders((prev) => updateNode(prev, folder.id, { loading: true, expanded: true }));
    const children = await loadFolders(folder.id);
    setFolders((prev) =>
      updateNode(prev, folder.id, {
        loading: false,
        children: children.map((c) => ({ ...c, children: undefined, loading: false, expanded: false })),
      }),
    );
  }

  function updateNode(nodes: FolderNode[], targetId: string, updates: Partial<FolderNode>): FolderNode[] {
    return nodes.map((n) => {
      if (n.id === targetId) return { ...n, ...updates };
      if (n.children) return { ...n, children: updateNode(n.children, targetId, updates) };
      return n;
    });
  }

  function renderFolder(folder: FolderNode, depth: number): React.ReactNode {
    const isSelected = selected?.id === folder.id;
    return (
      <div key={folder.id}>
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all ${
            isSelected
              ? "bg-primary/10 border border-primary/20"
              : "hover:bg-surface-container-high/50 border border-transparent"
          }`}
          style={{ paddingLeft: `${12 + depth * 20}px` }}
          onClick={() => {
            setSelected({ id: folder.id, path: folder.path || `/${folder.name}` });
          }}
          onDoubleClick={() => handleExpandFolder(folder)}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleExpandFolder(folder);
            }}
            className="w-5 h-5 flex items-center justify-center text-on-surface-variant/40 hover:text-on-surface shrink-0"
          >
            {folder.loading ? (
              <i className="fa-solid fa-spinner fa-spin text-[10px]" />
            ) : folder.hasChildren ? (
              <i className={`fa-solid fa-chevron-right text-[9px] transition-transform ${folder.expanded ? "rotate-90" : ""}`} />
            ) : (
              <span className="w-5" />
            )}
          </button>
          <i className={`fa-solid fa-folder text-sm ${isSelected ? "text-primary" : "text-on-surface-variant/40"}`} />
          <span className={`text-sm truncate ${isSelected ? "text-primary font-medium" : "text-on-surface"}`}>
            {folder.name}
          </span>
        </div>
        {folder.expanded && folder.children?.map((child) => renderFolder(child, depth + 1))}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/50 backdrop-blur-sm" onClick={onCancel}>
      <div className="bg-surface-container rounded-2xl border border-outline-variant/15 w-full max-w-md shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/10">
          <div className="flex items-center gap-3">
            <i className={`${meta.icon} ${meta.color}`} />
            <h2 className="text-sm font-bold text-on-surface">Choose a folder in {meta.displayName}</h2>
          </div>
          <button onClick={onCancel} className="text-on-surface-variant/60 hover:text-on-surface transition-colors">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        {/* Folder tree */}
        <div className="px-4 py-3 max-h-[360px] overflow-y-auto space-y-0.5">
          {loading ? (
            <div className="py-8 text-center text-sm text-on-surface-variant/60">
              <i className="fa-solid fa-spinner fa-spin mr-2" />
              Loading folders...
            </div>
          ) : error ? (
            <div className="py-8 text-center text-sm text-error">{error}</div>
          ) : folders.length === 0 ? (
            <div className="py-8 text-center text-sm text-on-surface-variant/60">
              No folders found. You can select the root folder.
            </div>
          ) : (
            folders.map((f) => renderFolder(f, 0))
          )}
        </div>

        {/* Selected path */}
        {selected && (
          <div className="px-6 py-2 border-t border-outline-variant/10 bg-surface-container-lowest/30">
            <p className="text-xs text-on-surface-variant truncate">
              <span className="font-medium text-on-surface">Selected:</span> {selected.path}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-outline-variant/10">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-xs font-bold text-on-surface-variant border border-outline-variant/15 rounded-lg hover:border-outline-variant/30 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={() => selected && onSelect(selected.id, selected.path)}
            disabled={!selected}
            className="px-4 py-2 text-xs font-bold text-on-primary bg-primary rounded-lg disabled:opacity-40 transition-all"
          >
            Select Folder
          </button>
        </div>
      </div>
    </div>
  );
}
